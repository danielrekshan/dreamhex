import os
import uuid
import asyncio
from fastapi import FastAPI, BackgroundTasks, HTTPException
from google.cloud import firestore
from pydantic import BaseModel
from typing import List, Optional

# Import our logic
import dream_analyzer

app = FastAPI()
db = firestore.Client()

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
async def generate_assets_task(dream_data, doc_ref):
    """
    Runs on GPU after the JSON is returned.
    Generates images -> Uploads to GCS -> Updates Firestore.
    """
    print(f"🎨 Starting Asset Gen for {dream_data.hex.slug}")
    slug = dream_data.hex.slug
    
    # 1. Background
    bg_frames = dream_analyzer.generate_frames(dream_data.hex.description_360, type="pano", frames=3)
    bg_urls = []
    for i, img in enumerate(bg_frames):
        path = f"{slug}/background/bg_{i}.jpg"
        url = dream_analyzer.upload_to_gcs(img, path)
        bg_urls.append(url)
    
    # Update DB with BG
    doc_ref.update({"background_frames": bg_urls})

    # 2. Stations
    stations = dream_data.hex.stations
    for i, station in enumerate(stations):
        if not station.entity_name: continue
        
        print(f"   🧚 Gen Station {station.id}")
        frames = dream_analyzer.generate_frames(station.state_start, station.state_end, type="sprite", frames=4)
        
        sprite_urls = []
        for j, img in enumerate(frames):
            path = f"{slug}/stations/{station.id}/frame_{j}.png"
            url = dream_analyzer.upload_to_gcs(img, path)
            sprite_urls.append(url)
            
        # Update specific station in the array (Firestore makes array updates tricky, so we read-modify-write or use distributed counters. 
        # For prototype, we fetch-update-set is fine or simple field update if structured).
        # We'll just update the whole stations list at the end for simplicity in this prototype.
        stations[i].sprite_frames = sprite_urls
        stations[i].asset_status = "COMPLETE"
    
    doc_ref.update({
        "stations": [s.dict() for s in stations],
        "status": "COMPLETE"
    })
    print("✅ Asset Gen Complete")

# --- ENDPOINTS ---

@app.get("/api/dreams/list")
def list_dreams(user_id: str):
    """Returns dreams the user has unlocked or created."""
    user_ref = db.collection("users").document(user_id)
    user_doc = user_ref.get()
    
    unlocked_ids = []
    if user_doc.exists:
        unlocked_ids = user_doc.get("unlocked_dreams") or []
        
    # Also fetch dreams CREATED by this user (if not already in unlocked)
    # (Implementation detail: usually creating a dream auto-unlocks it)
    
    results = []
    for d_id in unlocked_ids:
        d_doc = db.collection("dreams").document(d_id).get()
        if d_doc.exists:
            d_data = d_doc.to_dict()
            results.append({
                "id": d_data["id"],
                "title": d_data["title"],
                "description_360": d_data["description_360"],
                # Return first BG frame as thumbnail if avail, else null
                "thumbnail": d_data.get("background_frames", [None])[0]
            })
            
    return results

@app.post("/api/dreams/report")
async def submit_dream(req: DreamReport, background_tasks: BackgroundTasks):
    """
    1. Analyzes text (Fast)
    2. Returns JSON (Fast)
    3. Queues Image Gen (Slow)
    """
    # 1. Analyze
    analysis = await dream_analyzer.analyze_dream_text(req.report_text)
    
    # 2. Prep Data
    dream_id = analysis.hex.slug
    doc_data = analysis.hex.dict()
    doc_data["id"] = dream_id
    doc_data["status"] = "PROCESSING"
    doc_data["owner_id"] = req.user_id
    
    # Pre-fill URLs structure so RN app can poll them? 
    # Actually, standard RN Image polling works best if the URL is known.
    # We will construct the Expected URLs now.
    bucket_url = f"https://storage.googleapis.com/{dream_analyzer.GCS_BUCKET}"
    
    # Predict BG URLs
    predicted_bg = [f"{bucket_url}/{dream_id}/background/bg_{i}.jpg" for i in range(3)]
    doc_data["background_frames"] = predicted_bg
    
    # Predict Station URLs
    for s in doc_data["stations"]:
        if s["entity_name"]:
            s["sprite_frames"] = [f"{bucket_url}/{dream_id}/stations/{s['id']}/frame_{j}.png" for j in range(4)]
            
    # 3. Save to DB
    db.collection("dreams").document(dream_id).set(doc_data)
    
    # 4. Update User's Unlocked List
    user_ref = db.collection("users").document(req.user_id)
    if not user_ref.get().exists:
        user_ref.set({"unlocked_dreams": [dream_id]})
    else:
        user_ref.update({"unlocked_dreams": firestore.ArrayUnion([dream_id])})

    # 5. Queue GPU Task
    background_tasks.add_task(generate_assets_task, analysis, db.collection("dreams").document(dream_id))
    
    return doc_data

@app.post("/api/dreams/interact")
async def interact(req: InteractionRequest):
    """
    1. Calc reaction
    2. If triggers portal -> Add random dream to user list
    3. Regen assets for that entity
    """
    # Get current state
    dream_ref = db.collection("dreams").document(req.dream_id)
    dream_data = dream_ref.get().to_dict()
    
    station = next((s for s in dream_data["stations"] if s["id"] == req.station_id), None)
    if not station: raise HTTPException(404, "Station not found")
    
    # Analyze
    reaction = await dream_analyzer.analyze_interaction_text(
        station["entity_name"], 
        station.get("state_end", "idle"), 
        req.user_command
    )
    
    # Magic Book Logic
    new_unlock = None
    if reaction.unlock_trigger == "UNLOCK_NEW_DREAM":
        # Find a random dream ID the user doesn't have? 
        # For prototype, we just unlock a specific hardcoded demo ID if it exists
        new_unlock = "flight-of-the-golden-eagle" 
        db.collection("users").document(req.user_id).update({
            "unlocked_dreams": firestore.ArrayUnion([new_unlock])
        })

    # Update Station Data
    station["state_start"] = reaction.new_state_start
    station["state_end"] = reaction.new_state_end
    station["entity_greeting"] = reaction.new_greeting
    station["interaction_options"] = reaction.new_options
    
    # Persist Data Update
    dream_ref.set(dream_data) # Overwrite with new station data
    
    # Trigger Asset Regen (We wait for this one? Or async? 
    # For interaction, user expects immediate feedback. 
    # We'll return text immediately, and client polls image.)
    
    # Helper to run synch generator in async loop
    # In real prod, use Celery/PubSub. Here we block briefly or use BackgroundTask if we want non-blocking.
    # We will BLOCK here for simplicity of the prototype loop (so the user sees the change).
    new_frames = dream_analyzer.generate_frames(reaction.new_state_start, reaction.new_state_end, type="sprite", frames=4)
    
    # Re-upload to SAME URLs (Overwriting files) -> Simplifies frontend polling logic?
    # Or new URLs to force cache bust? Let's use timestamped URLs in prod, but same URLs here for ease.
    slug = req.dream_id
    bucket_url = f"https://storage.googleapis.com/{dream_analyzer.GCS_BUCKET}"
    new_urls = []
    for j, img in enumerate(new_frames):
        # We append a random query param or version ID in real life.
        # Here we just overwrite.
        path = f"{slug}/stations/{station['id']}/frame_{j}.png"
        dream_analyzer.upload_to_gcs(img, path)
        new_urls.append(f"{bucket_url}/{path}?t={uuid.uuid4()}") # Cache bust param
        
    station["sprite_frames"] = new_urls
    dream_ref.set(dream_data)
    
    return {
        "station": station,
        "portal_unlocked": new_unlock is not None,
        "portal_message": "The air shimmers... a new page appears in your book!" if new_unlock else None
    }