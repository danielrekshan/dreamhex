import os
import asyncio
import uuid 
import modal
from fastapi import FastAPI, BackgroundTasks, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from google.cloud import firestore
from pydantic import BaseModel
from typing import List, Optional, Any # Added Any for type clarity

import dream_analyzer

app = FastAPI()

# --- FIX 1: LAZY DATABASE INITIALIZATION ---
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

class WarmupRequest(BaseModel):
    user_id: Optional[str] = None 

# NEW: Model for simple action endpoints (Delete/Reprocess)
class DreamAction(BaseModel):
    user_id: str

# --- WATERFALL GENERATION ---
async def waterfall_generation(dream_data: dict[str, Any], doc_ref: firestore.DocumentReference):
    painter = get_painter_instance()
    if not painter: return

    slug = dream_data["hex"]["slug"]
    stations = dream_data["hex"]["stations"]
    
    # Configuration for Test Mode vs Prod
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
        
        # Reload fresh data, as waterfall_generation might have been called twice (reprocess)
        dream_data = doc_ref.get().to_dict()
        stations = dream_data["hex"]["stations"]

        # STEP 2: STATIONS (One by One)
        active_stations = [s for s in stations if s["entity_name"]]
        
        if TEST_MODE: 
            active_stations = active_stations[:1]

        for station_data in active_stations:
            print(f"    2. Generating Station: {station_data['entity_name']}...")
            
            # Find the original index of the station
            s_idx = next(i for i, s in enumerate(stations) if s["id"] == station_data["id"])
            
            sprite_urls = await painter.generate_frames.remote.aio(
                prompt_a=station_data["state_start"], 
                prompt_b=station_data["state_end"],
                type="sprite", 
                frames=frame_count_sprite, 
                path_prefix=f"{slug}/stations/{station_data['id']}/frame"
            )
            
            # Update the local object
            stations[s_idx]["sprite_frames"] = sprite_urls
            stations[s_idx]["asset_status"] = "COMPLETE"

            # Immediate DB Update: This sprite is ready!
            doc_ref.update({
                "hex.stations": stations
            })

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
    
    # 1. LLM Analysis (Fast CPU task)
    analysis = await dream_analyzer.analyze_dream_text(req.report_text)
    dream_id = analysis.hex.slug
    
    # 2. Initial DB Save (Placeholder)
    doc = analysis.dict()
    doc["id"] = dream_id
    doc["owner_id"] = req.user_id
    doc["status"] = "ANALYSIS_COMPLETE" 
    
    doc["hex"]["background_frames"] = [] 
    
    doc_ref = db_client.collection("dreams").document(dream_id)
    doc_ref.set(doc)
    
    # Update User
    user_ref = db_client.collection("users").document(req.user_id)
    try:
        user_ref.update({"unlocked_dreams": firestore.ArrayUnion([dream_id])})
    except:
        user_ref.set({"unlocked_dreams": [dream_id]})
    
    # 3. Queue Waterfall
    # Pass dict instead of pydantic model instance to avoid issues inside background task
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
                "description": data["summary_short"] if "summary_short" in data else "Dream analyzed.",
                "status": data["status"],
                "thumbnail": data["hex"]["background_frames"][0] if data["hex"].get("background_frames") and data["hex"]["background_frames"] else None
            })
    return results

@app.post("/dreams/interact")
async def interact(req: InteractionRequest, bg_tasks: BackgroundTasks):
    db_client = get_db()
    doc_ref = db_client.collection("dreams").document(req.dream_id)
    data = doc_ref.get().to_dict()
    
    if not data: raise HTTPException(404, "Dream not found")
    
    s_idx = next((i for i, s in enumerate(data["hex"]["stations"]) if s["id"] == req.station_id), -1)
    if s_idx == -1: raise HTTPException(404, "Station not found")
    station = data["hex"]["stations"][s_idx]
    
    rx = await dream_analyzer.analyze_interaction_text(station["entity_name"], station.get("state_end","idle"), req.user_command)
    
    station.update({
        "state_start": rx.new_state_start, 
        "state_end": rx.new_state_end, 
        "entity_greeting": rx.new_greeting,
        "interaction_options": rx.new_options
    })
    
    portal_unlocked = rx.unlock_trigger is not None
    if portal_unlocked:
        user_ref = db_client.collection("users").document(req.user_id)
        try:
            user_ref.update({"unlocked_dreams": firestore.ArrayUnion(["demo-dream-id"])})
        except:
             user_ref.set({"unlocked_dreams": ["demo-dream-id"]})

    # Trigger Regen
    async def regen():
        painter = get_painter_instance()
        if not painter: return
        
        regen_id = uuid.uuid4().hex[:4]
        prefix = f"{req.dream_id}/stations/{station['id']}/regen-{regen_id}"
        frames = 2 if TEST_MODE else 4
        
        try:
            urls = await painter.generate_frames.remote.aio(
                prompt_a=rx.new_state_start, 
                prompt_b=rx.new_state_end, 
                type="sprite", 
                frames=frames, 
                path_prefix=prefix
            )
            
            station["sprite_frames"] = [f"{u}?t={regen_id}" for u in urls]
            
            curr_data = doc_ref.get().to_dict()
            curr_data["hex"]["stations"][s_idx] = station
            doc_ref.set(curr_data)
        except Exception as e:
            print(f"❌ REGEN ERROR: {e}")

    bg_tasks.add_task(regen)
    
    return {"station": station, "unlock": portal_unlocked}



@app.post("/dreams/reprocess/{dream_id}")
async def reprocess_dream(dream_id: str, req: DreamAction, bg_tasks: BackgroundTasks):
    db_client = get_db()
    doc_ref = db_client.collection("dreams").document(dream_id)
    doc = doc_ref.get()
    
    if not doc.exists:
        raise HTTPException(404, "Dream not found")
        
    dream_data = doc.to_dict()
    
    # 1. Reset status and clear assets
    # Note: We must ensure we have the necessary data structures for the worker
    
    # Reset status
    dream_data["status"] = "ANALYSIS_COMPLETE" 
    
    # Clear asset references to trigger reload/placeholder display in app
    dream_data["hex"]["background_frames"] = [] 
    
    # Clear sprite frames for all stations
    if "stations" in dream_data["hex"]:
        for s in dream_data["hex"]["stations"]:
            s["sprite_frames"] = []
            s["asset_status"] = "PENDING"
        
    # 2. Save reset state
    doc_ref.set(dream_data)
    
    # 3. Re-queue generation
    bg_tasks.add_task(waterfall_generation, dream_data, doc_ref)
    
    print(f"♻️ Dream {dream_id} reprocessed and generation re-queued.")
    return {"status": "requeued", "message": f"Dream {dream_id} reset and generation started."}



# --- NEW ENDPOINTS ---

@app.delete("/dreams/{dream_id}")
def delete_dream(dream_id: str, req: DreamAction):
    db_client = get_db()
    
    # 1. Remove dream ID from user's unlocked_dreams array
    user_ref = db_client.collection("users").document(req.user_id)
    user_ref.update({"unlocked_dreams": firestore.ArrayRemove([dream_id])})
    
    print(f"🗑️ Dream {dream_id} deleted for user {req.user_id}")
    return {"status": "success", "message": f"Dream {dream_id} removed from user list."}

@app.get("/dreams/{dream_id}")
def get_dream_details(dream_id: str):
    db_client = get_db()
    doc = db_client.collection("dreams").document(dream_id).get()
    if not doc.exists:
        raise HTTPException(404, "Dream not found")
    return doc.to_dict()
