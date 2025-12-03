import os
import uuid
import asyncio
import modal
from fastapi import FastAPI, BackgroundTasks, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from google.cloud import firestore
from pydantic import BaseModel
from typing import List, Optional

import dream_analyzer

app = FastAPI()

# --- FIX 1: LAZY DATABASE INITIALIZATION ---
_db_client = None

modal_app = modal.App("dreamhex-worker")

def get_db():
    """
    Connects to Firestore on demand.
    Prioritizes the manually injected Project ID variable.
    """
    global _db_client
    print("Getting DB client...")
    if _db_client is None:
        print("no existing client, initializing...")
        try:
            project_id =   os.environ.get("GCP_PROJECT_ID")
            print(f"Using Project ID: {project_id}")
            if not project_id:
                print("⚠️ Warning: Project ID var missing. Attempting default init...")
                _db_client = firestore.Client()
            else:
                print(f"Initializing Firestore with Project ID: {project_id}")
                _db_client = firestore.Client(project=project_id)
                print
        except Exception as e:
            print(f"CRITICAL DB INIT ERROR: {e}")
            raise HTTPException(status_code=500, detail="Database connection failed.")
    return _db_client

# --- CONFIG ---
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

# --- FIX 2: LAZY MODAL LOOKUP (Use modal.Cls.lookup) ---
def get_painter():
    """
    Connects to the Modal GPU worker on demand.
    Uses modal.Cls.lookup to ensure we get a handle to the remote class.
    """
    try:

        # Use modal.Cls.lookup (the standard for classes in recent modal versions)
        DreamPainter = modal.Cls.from_name("dreamhex-worker", "DreamPainter")
        print("DreamPainter lookup successful:", DreamPainter)
        return DreamPainter() # Return an instance handle
    except Exception as e:
        # FIX: Revert to the modal.lookup() structure that is often more robust 
        # when dealing with versioning, although Cls.lookup is technically correct.
        print(f"❌ MODAL CONNECT ERROR 1 (Cls.lookup): {e}")  
        try:
            painter_app = modal.App("dreamhex-worker")
            print("painter_app:", painter_app)
            DreamPainter = painter_app["DreamPainter"]
            return DreamPainter()
        except Exception as e_fallback:
            print(f"❌ MODAL CONNECT ERROR 2 (Lookup): {e_fallback}")
            print("--- ENVIRONMENT DIAGNOSIS ---")
            print(f"Token ID: {os.environ.get('MODAL_TOKEN_ID', 'NOT_SET')}")
            print(f"Secret set: {bool(os.environ.get('MODAL_TOKEN_SECRET'))}")
            print("-----------------------------")
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

# --- BACKGROUND TASKS ---
async def process_assets(dream_data, doc_ref):
    painter = get_painter()
    
    if not painter: 
        print("❌ Painter unavailable. Aborting asset generation.")
        return
    
    slug = dream_data.hex.slug
    stations = dream_data.hex.stations
    
    print(f"🚀 Starting Modal Job for {slug}...")

    try:
        # 1. Background Job
        bg_task = painter.generate_sequence.remote.aio(
            prompt_a=dream_data.hex.description_360, prompt_b=None, 
            type="pano", frames=3, path_prefix=f"{slug}/background/bg"
        )
        
        # 2. Station Jobs
        station_tasks = []
        active_indices = []
        for i, s in enumerate(stations):
            if not s.entity_name: continue
            active_indices.append(i) 
            station_tasks.append(painter.generate_sequence.remote.aio(
                prompt_a=s.state_start, prompt_b=s.state_end,
                type="sprite", frames=4, path_prefix=f"{slug}/stations/{s.id}/frame"
            ))
                
        # 3. Wait for all jobs
        bg_urls = await bg_task
        doc_ref.update({"hex.background_frames": bg_urls})
        
        sprite_results = await asyncio.gather(*station_tasks)
        
        for idx, urls in zip(active_indices, sprite_results):
            stations[idx].sprite_frames = urls
            stations[idx].asset_status = "COMPLETE"
            
        # 4. Final DB Update
        doc_ref.update({
            "hex.stations": [s.dict() for s in stations],
            "status": "COMPLETE"
        })
        print(f"✅ Assets Complete for {slug}")
        
    except Exception as e:
        print(f"❌ ERROR DURING ASSET GEN: {e}")

# --- ENDPOINTS ---
@app.post("/api/dreams/report")
async def submit_dream(req: DreamReport, bg_tasks: BackgroundTasks):
    db_client = get_db()
    
    # 1. LLM Analysis
    analysis = await dream_analyzer.analyze_dream_text(req.report_text)
    dream_id = analysis.hex.slug
    
    # 2. Predict URLs
    analysis.hex.background_frames = [f"{BASE_URL}/{dream_id}/background/bg_{i}.jpg" for i in range(3)]
    for s in analysis.hex.stations:
        if s.entity_name:
            s.sprite_frames = [f"{BASE_URL}/{dream_id}/stations/{s.id}/frame_{j}.png" for j in range(4)]
            
    # 3. DB Save
    doc = analysis.dict()
    doc["id"] = dream_id
    doc["owner_id"] = req.user_id
    doc["status"] = "PROCESSING"
    
    db_client.collection("dreams").document(dream_id).set(doc)
    
    user_ref = db_client.collection("users").document(req.user_id)
    try:
        user_ref.update({"unlocked_dreams": firestore.ArrayUnion([dream_id])})
    except:
        user_ref.set({"unlocked_dreams": [dream_id]})
    
    # 4. Queue Worker
    bg_tasks.add_task(process_assets, analysis, db_client.collection("dreams").document(dream_id))
    
    return doc

@app.get("/api/dreams/list")
def list_dreams(user_id: str):
    print("getting list")
    db_client = get_db()
    print("get db client", db_client)
    u_doc = db_client.collection("users").document(user_id).get()
    print("got user doc", u_doc)
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
                "description": data["summary_short"],
                "status": data["status"],
                "thumbnail": data["hex"]["background_frames"][0] if data["hex"].get("background_frames") else None
            })
    return results

@app.post("/api/dreams/interact")
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
        painter = get_painter()
        if not painter: return
        
        prefix = f"{req.dream_id}/stations/{station['id']}/regen-{uuid.uuid4().hex[:4]}"
        try:
            urls = await painter.generate_sequence.remote.aio(
                prompt_a=rx.new_state_start, 
                prompt_b=rx.new_state_end, 
                type="sprite", frames=4, path_prefix=prefix
            )
            
            station["sprite_frames"] = [f"{u}?t={uuid.uuid4()}" for u in urls]
            curr_data = doc_ref.get().to_dict()
            curr_data["hex"]["stations"][s_idx] = station
            doc_ref.set(curr_data)
        except Exception as e:
            print(f"❌ REGEN ERROR: {e}")

    bg_tasks.add_task(regen)
    
    return {"station": station, "unlock": portal_unlocked}