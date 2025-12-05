import os
import asyncio
import uuid 
import modal
from fastapi import FastAPI, BackgroundTasks, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from google.cloud import firestore
from pydantic import BaseModel
from typing import List, Optional, Any, Dict

import dream_analyzer

app = FastAPI()

_db_client = None
PROJECT_ID = os.environ.get("GCP_PROJECT_ID")

def get_db():
    global _db_client
    if _db_client is None:
        _db_client = firestore.Client(project=PROJECT_ID)
    return _db_client

# --- CONFIG ---
TEST_MODE = os.environ.get("TEST_MODE", "false").lower() == "true"
GCS_BUCKET = os.environ.get("GCS_BUCKET_NAME")
if GCS_BUCKET:
    BASE_URL = f"https://storage.googleapis.com/{GCS_BUCKET}"
else:
    BASE_URL = "http://placeholder-gcs"

# --- CORS ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- MODAL CONNECTION ---
DreamPainter = modal.Cls.from_name("dreamhex-worker", "DreamPainter")

def get_painter_instance():
    try:
        return DreamPainter() 
    except Exception as e:
        print(f"❌ Modal Connection Error: {e}")
        return None

# --- MODELS ---
class DreamReport(BaseModel):
    user_id: str
    report_text: str

class InteractionRequest(BaseModel):
    user_id: str
    dream_id: str
    station_id: str
    user_command: str
    station_data: dict 
    world_context: dict 

class WarmupRequest(BaseModel):
    user_id: Optional[str] = None 

class DreamAction(BaseModel):
    user_id: str

# --- WATERFALL GENERATION ---
async def waterfall_generation(dream_data: dict[str, Any], doc_ref: firestore.DocumentReference):
    painter = get_painter_instance()
    if not painter: return

    slug = dream_data["hex"]["slug"]
    stations = dream_data["hex"]["stations"]
    
    frame_count_bg = 2 if TEST_MODE else 3
    frame_count_sprite = 2 if TEST_MODE else 4
    
    print(f"🌊 Starting Waterfall for {slug} (TestMode={TEST_MODE})")

    try:
        # STEP 1: BACKGROUND
        print("    1. Generating Background...")
        bg_urls = await painter.generate_frames.remote.aio(
            prompt_a=dream_data["hex"]["description_360"], 
            prompt_b=None, 
            type="pano", 
            frames=frame_count_bg, 
            path_prefix=f"{slug}/background/bg"
        )
        
        doc_ref.update({
            "hex.background_frames": bg_urls,
            "status": "GENERATING_ENTITIES" 
        })
        
        dream_data = doc_ref.get().to_dict()
        stations = dream_data["hex"]["stations"]

        # STEP 2: STATIONS
        active_stations = [s for s in stations if s["entity_name"]]
        if TEST_MODE: active_stations = active_stations[:1]

        for station_data in active_stations:
            print(f"    2. Generating Station: {station_data['entity_name']}...")
            s_idx = next(i for i, s in enumerate(stations) if s["id"] == station_data["id"])
            
            sprite_urls = await painter.generate_frames.remote.aio(
                prompt_a=station_data["state_start"], 
                prompt_b=station_data["state_end"],
                type="sprite", 
                frames=frame_count_sprite, 
                path_prefix=f"{slug}/stations/{station_data['id']}/frame"
            )
            
            stations[s_idx]["sprite_frames"] = sprite_urls
            stations[s_idx]["asset_status"] = "COMPLETE"

            doc_ref.update({"hex.stations": stations})

        # STEP 3: FINALIZE
        doc_ref.update({"status": "COMPLETE"})
        print(f"✅ Waterfall Complete for {slug}")

    except Exception as e:
        print(f"❌ Error in waterfall: {e}")
        doc_ref.update({"status": "ERROR"})

# --- ENDPOINTS ---

@app.post("/warmup")
async def warmup_gpu(req: WarmupRequest):
    user_log = req.user_id if req.user_id else "ANONYMOUS" 
    print(f"🔥 Warmup requested by {user_log}")
    painter = get_painter_instance()
    if painter:
        painter.wake_up.remote()
    return {"status": "warming"}

@app.post("/dreams/report")
async def submit_dream(req: DreamReport, bg_tasks: BackgroundTasks):
    db_client = get_db()
    analysis = await dream_analyzer.analyze_dream_text(req.report_text)
    dream_id = analysis.hex.slug
    
    doc = analysis.dict()
    doc["id"] = dream_id
    doc["owner_id"] = req.user_id
    doc["status"] = "ANALYSIS_COMPLETE" 
    doc["hex"]["background_frames"] = [] 
    
    doc_ref = db_client.collection("dreams").document(dream_id)
    doc_ref.set(doc)
    
    user_ref = db_client.collection("users").document(req.user_id)
    try:
        user_ref.update({"unlocked_dreams": firestore.ArrayUnion([dream_id])})
    except:
        user_ref.set({"unlocked_dreams": [dream_id]})
    
    bg_tasks.add_task(waterfall_generation, doc, doc_ref)
    return doc

@app.get("/dreams/list")
def list_dreams(user_id: str):
    db_client = get_db()
    u_doc = db_client.collection("users").document(user_id).get()
    if not u_doc.exists: return []

    ids = u_doc.get("unlocked_dreams") or []
    results = []
    
    for did in ids:
        d = db_client.collection("dreams").document(did).get()
        if d.exists:
            data = d.to_dict()
            results.append({
                "id": data["id"],
                "title": data["hex"]["title"],
                "description": data.get("summary_short", "Dream analyzed."),
                "status": data["status"],
                "thumbnail": data["hex"]["background_frames"][0] if data["hex"].get("background_frames") else None
            })
    return results

@app.post("/dreams/interact")
async def interact(req: InteractionRequest, bg_tasks: BackgroundTasks):
    print(f"🎭 Interaction requested by {req.user_id} on dream {req.dream_id}, station {req.station_id}" )
    # db_client = get_db()
    
    station = req.station_data
    world_context = req.world_context
    
    old_stance = station.get("current_stance", "idle")
    old_greeting = station.get("entity_greeting", "")

    # Analyze Interaction with rich context
    rx = await dream_analyzer.analyze_interaction_text(
        world_context,
        station.get("entity_name", "Unknown"), 
        old_stance,
        req.user_command
    )
    print(f"    -> New Stance: {rx.new_stance}, Unlock Trigger: {rx.unlock_trigger}")
    
    # Update Station Data
    station.update({
        "state_start": rx.new_state_start, 
        "state_end": rx.new_state_end, 
        "entity_greeting": rx.new_greeting,
        "entity_monologue": rx.entity_monologue, # NEW
        "interaction_options": rx.new_options,
        "current_stance": rx.new_stance
    })
    
    # Log to 'interaction' collection
    interaction_log = {
        "dream_id": req.dream_id,
        "action_text": req.user_command,
        "target_station_id": req.station_id,
        "old_stance": old_stance,
        "new_stance": rx.new_stance,
        "old_greeting": old_greeting,
        "new_greeting": rx.new_greeting,
        "monologue": rx.entity_monologue,
        "timestamp": firestore.SERVER_TIMESTAMP,
        "user_id": req.user_id
    }
    
    # try:
    #     db_client.collection("interaction").add(interaction_log)
    # except Exception as e:
    #     print(f"⚠️ Failed to log interaction: {e}")

    return {
        "station": station, 
        "unlock": rx.unlock_trigger is not None
    }

@app.delete("/dreams/{dream_id}")
def delete_dream(dream_id: str, req: DreamAction):
    db_client = get_db()
    user_ref = db_client.collection("users").document(req.user_id)
    user_ref.update({"unlocked_dreams": firestore.ArrayRemove([dream_id])})
    return {"status": "success", "message": f"Dream {dream_id} removed."}

@app.get("/dreams/{dream_id}")
def get_dream_details(dream_id: str):
    db_client = get_db()
    doc = db_client.collection("dreams").document(dream_id).get()
    if not doc.exists: raise HTTPException(404, "Dream not found")
    return doc.to_dict()

@app.post("/dreams/reprocess/{dream_id}")
async def reprocess_dream(dream_id: str, req: DreamAction, bg_tasks: BackgroundTasks):
    db_client = get_db()
    doc_ref = db_client.collection("dreams").document(dream_id)
    doc = doc_ref.get()
    
    if not doc.exists:
        raise HTTPException(404, "Dream not found")
        
    dream_data = doc.to_dict()
    dream_data["status"] = "ANALYSIS_COMPLETE" 
    dream_data["hex"]["background_frames"] = [] 
    
    if "stations" in dream_data["hex"]:
        for s in dream_data["hex"]["stations"]:
            s["sprite_frames"] = []
            s["asset_status"] = "PENDING"
        
    doc_ref.set(dream_data)
    bg_tasks.add_task(waterfall_generation, dream_data, doc_ref)
    
    return {"status": "requeued", "message": f"Dream {dream_id} reset and generation started."}