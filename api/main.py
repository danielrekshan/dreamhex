import os
import uuid
import asyncio
import modal
from fastapi import FastAPI, BackgroundTasks, HTTPException
from google.cloud import firestore
from pydantic import BaseModel
from typing import List

import dream_analyzer

app = FastAPI()
db = firestore.Client()

# --- CONFIG ---
GCS_BUCKET = os.environ.get("GCS_BUCKET_NAME")
BASE_URL = f"https://storage.googleapis.com/{GCS_BUCKET}"

# --- MODAL LOOKUP ---
try:
    # Lookup the function using the deployed app name
    f_painter = modal.Function.lookup("dreamhex-worker", "DreamPainter.generate_sequence")
except Exception as e:
    print(f"⚠️ Warning: Modal function not found ({e}). Image generation will fail until Modal is deployed.")
    f_painter = None

# --- REQUEST MODELS (Shared with client) ---
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
    """Offloads asset generation to Modal and updates Firestore with GCS URLs."""
    if not f_painter: return
    slug = dream_data.hex.slug
    stations = dream_data.hex.stations
    
    # 1. Background Job
    # Run synchronously to wait for the result
    bg_task = f_painter.remote.aio(
        prompt_a=dream_data.hex.description_360, prompt_b=None, 
        type="pano", frames=3, path_prefix=f"{slug}/background/bg"
    )
    
    # 2. Station Jobs
    station_tasks = []
    active_indices = []
    for i, s in enumerate(stations):
        if not s.entity_name: continue
        active_indices.append(i) 
        station_tasks.append(f_painter.remote.aio(
            prompt_a=s.state_start, prompt_b=s.state_end,
            type="sprite", frames=4, path_prefix=f"{slug}/stations/{s.id}/frame"
        ))
            
    # 3. Wait for all jobs to finish
    bg_urls = await bg_task
    doc_ref.update({"hex.background_frames": bg_urls})
    
    sprite_results = await asyncio.gather(*station_tasks)
    
    for idx, urls in zip(active_indices, sprite_results):
        # Update the local Python object model
        stations[idx].sprite_frames = urls
        stations[idx].asset_status = "COMPLETE"
        
    # 4. Final DB Update
    doc_ref.update({
        "hex.stations": [s.dict() for s in stations],
        "status": "COMPLETE"
    })

# --- ENDPOINTS ---
@app.post("/api/dreams/report")
async def submit_dream(req: DreamReport, bg_tasks: BackgroundTasks):
    """Receives user dream report, generates metadata instantly, and queues asset generation."""
    # 1. LLM Analysis
    analysis = await dream_analyzer.analyze_dream_text(req.report_text)
    dream_id = analysis.hex.slug
    
    # 2. Predict URLs (Critical for Client Polling/Placeholder)
    # The client will poll these exact URLs for existence
    analysis.hex.background_frames = [f"{BASE_URL}/{dream_id}/background/bg_{i}.jpg" for i in range(3)]
    for s in analysis.hex.stations:
        if s.entity_name:
            s.sprite_frames = [f"{BASE_URL}/{dream_id}/stations/{s.id}/frame_{j}.png" for j in range(4)]
            
    # 3. DB Save (Initial State)
    doc = analysis.dict()
    doc["id"] = dream_id
    doc["owner_id"] = req.user_id
    doc["status"] = "PROCESSING"
    
    db.collection("dreams").document(dream_id).set(doc)
    db.collection("users").document(req.user_id).set(
        {"unlocked_dreams": firestore.ArrayUnion([dream_id])}, merge=True
    )
    
    # 4. Trigger Worker (Asynchronously)
    bg_tasks.add_task(process_assets, analysis, db.collection("dreams").document(dream_id))
    
    # 5. Return fast response immediately
    return doc

@app.get("/api/dreams/list")
def list_dreams(user_id: str):
    """Lists dreams unlocked by the user (the Magic Book pages)."""
    u_doc = db.collection("users").document(user_id).get()
    ids = u_doc.get("unlocked_dreams") or [] if u_doc.exists else []
    
    results = []
    for did in ids:
        d = db.collection("dreams").document(did).get()
        if d.exists:
            data = d.to_dict()
            results.append({
                "id": data["id"],
                "title": data["hex"]["title"],
                "description": data["summary_short"],
                "status": data["status"],
                "thumbnail": data["hex"]["background_frames"][0] if data["hex"]["background_frames"] else None
            })
    return results

@app.post("/api/dreams/interact")
async def interact(req: InteractionRequest, bg_tasks: BackgroundTasks):
    """Receives interaction, calculates new state, and triggers asset regeneration."""
    doc_ref = db.collection("dreams").document(req.dream_id)
    data = doc_ref.get().to_dict()
    
    # Find Station
    s_idx = next((i for i, s in enumerate(data["hex"]["stations"]) if s["id"] == req.station_id), -1)
    if s_idx == -1: raise HTTPException(404, "Station not found")
    station = data["hex"]["stations"][s_idx]
    
    # LLM Interaction
    rx = await dream_analyzer.analyze_interaction_text(station["entity_name"], station.get("state_end","idle"), req.user_command)
    
    # Update Data
    station.update({
        "state_start": rx.new_state_start, 
        "state_end": rx.new_state_end, 
        "entity_greeting": rx.new_greeting,
        "interaction_options": rx.new_options
    })
    
    # Magic Book Logic: Unlock new dream page
    portal_unlocked = rx.unlock_trigger is not None
    if portal_unlocked:
        # NOTE: Using a hardcoded ID ('demo-dream-id') for simplicity. In production, this would select a new, unseen dream slug.
        db.collection("users").document(req.user_id).update({"unlocked_dreams": firestore.ArrayUnion(["demo-dream-id"])}, merge=True)

    # Trigger Regen
    async def regen():
        if not f_painter: return
        # Use unique path to bust client cache on regen
        prefix = f"{req.dream_id}/stations/{station['id']}/regen-{uuid.uuid4().hex[:4]}"
        urls = await f_painter.remote.aio(prompt_a=rx.new_state_start, prompt_b=rx.new_state_end, type="sprite", frames=4, path_prefix=prefix)
        
        # Update DB with new URLs (adding timestamp query param for strong cache bust)
        station["sprite_frames"] = [f"{u}?t={uuid.uuid4()}" for u in urls]
        doc_ref.update({"hex.stations": data["hex"]["stations"]})

    bg_tasks.add_task(regen)
    
    # Return updated station data immediately
    return {"station": station, "unlock": portal_unlocked}