import os
import io
import re
import json
import torch
import torch.nn as nn
import numpy as np
from PIL import Image
from typing import List, Optional
from pydantic import BaseModel, Field
from openai import OpenAI
from diffusers import AutoPipelineForImage2Image
from rembg import remove, new_session
from google.cloud import storage

# --- CONFIG ---
GCS_BUCKET = os.environ.get("GCS_BUCKET_NAME", "dreamhex-assets")
OPENAI_KEY = os.environ.get("OPENAI_API_KEY")

# --- INITIALIZATION (Lazy Load) ---
pipe = None
rembg_session = None
client = None
storage_client = None

def init_models():
    global pipe, rembg_session, client, storage_client
    
    if pipe is None:
        print("⏳ Loading SDXL-Turbo...")
        try:
            pipe = AutoPipelineForImage2Image.from_pretrained(
                "stabilityai/sdxl-turbo",
                torch_dtype=torch.float16,
                variant="fp16",
                low_cpu_mem_usage=True
            ).to("cuda")
            pipe.enable_vae_slicing()
            pipe.enable_vae_tiling()
        except Exception as e:
            print(f"⚠️ GPU/Model Error (Are you on Cloud Run with GPU?): {e}")
            # Fallback for CPU testing if needed, or fail hard
            
    if rembg_session is None:
        rembg_session = new_session("u2net")
        
    if client is None:
        client = OpenAI(api_key=OPENAI_KEY)
        
    if storage_client is None:
        storage_client = storage.Client()

# --- DATA MODELS ---
class Station(BaseModel):
    id: str
    position_index: int
    entity_name: Optional[str] = None
    state_start: Optional[str] = None
    state_end: Optional[str] = None
    entity_greeting: Optional[str] = None
    interaction_options: List[str]
    # We add this field to track asset generation status
    asset_status: str = "PENDING" 
    sprite_frames: List[str] = []

class DreamHex(BaseModel):
    title: str
    slug: str
    description_360: str
    central_imagery: str
    stations: List[Station]
    background_frames: List[str] = []

class DreamGenerationResponse(BaseModel):
    hex: DreamHex
    summary: str

class InteractionResponse(BaseModel):
    new_state_start: str
    new_state_end: str
    new_greeting: str
    new_options: List[str]
    unlock_trigger: Optional[str] = None # Added for Magic Book logic

# --- SYSTEM PROMPTS ---
SYSTEM_PROMPT = """
You are the Dream Scryer. Map the dream to a Single Hex with 7 Stations.
1. Describe the CONTAINER (Background).
2. Station 0 = Central Image. Stations 1-6 = Other entities (or NULL).
3. Provide 5 Interaction Options per entity.
4. Generate a 'slug' (kebab-case) for file naming.
Return strictly structured JSON.
"""

INTERACTION_PROMPT = """
You are the Dungeon Master. Calculate the entity's REACTION.
1. Output new animation prompts using **ACTIVE VERBS**.
2. Provide **5 NEW Interaction Options**.
3. If the user's action successfully uncovers a hidden secret or achieves a significant breakthrough, include a 'unlock_trigger' string with the value 'UNLOCK_NEW_DREAM'. Otherwise leave it null.
"""

# --- LOGIC ---

def upload_to_gcs(image: Image.Image, path: str):
    """Uploads PIL Image to GCS and returns public URL"""
    if not storage_client: return f"https://mock-url/{path}"
    
    bucket = storage_client.bucket(GCS_BUCKET)
    blob = bucket.blob(path)
    
    b = io.BytesIO()
    image.save(b, format="PNG")
    b.seek(0)
    
    blob.upload_from_file(b, content_type="image/png")
    # For private buckets, we'd sign the URL. For this prototype, we assume public read or authenticated access.
    # Here we return the authenticated storage browser URL or a signed URL.
    # For RN app ease, we'll make the bucket contents public-read for now.
    return f"https://storage.googleapis.com/{GCS_BUCKET}/{path}"

def generate_frames(prompt_a, prompt_b=None, type="pano", frames=4):
    """Generates images using SDXL-Turbo"""
    if not pipe: 
        print("❌ Pipe not loaded")
        return []

    # Seam Hack (Re-apply per call to be safe)
    def make_seamless(m):
        if isinstance(m, nn.Conv2d):
            m.padding_mode = 'circular' if type == "pano" else 'zeros'
        return m
    
    pipe.unet.apply(make_seamless)
    pipe.vae.apply(make_seamless)

    style = "Ink and watercolor, thick india ink lines, vintage paper texture, hazy. "
    full_prompt = style + prompt_a + (", 360 equirectangular panorama, sepia" if type=="pano" else ", isolated cutout on white, cel shaded")
    
    width, height = (1024, 512) if type == "pano" else (512, 512)
    
    images = []
    # Simplified loop for speed
    current_img = Image.new("RGB", (width, height), (255,255,255))
    
    for i in range(frames):
        # Logic for morphing prompts
        p = prompt_a if i < frames//2 else (prompt_b or prompt_a)
        strength = 0.5 if i > 0 else 1.0
        
        out = pipe(prompt=full_prompt, image=current_img, strength=strength, num_inference_steps=3, guidance_scale=0.0).images[0]
        
        if type == "sprite":
            out = remove(out, session=rembg_session)
            
        images.append(out)
        current_img = out # Feedback loop
        
    return images

async def analyze_dream_text(text: str) -> DreamGenerationResponse:
    init_models()
    completion = client.beta.chat.completions.parse(
        model="gpt-4o-mini",
        messages=[{"role": "system", "content": SYSTEM_PROMPT}, {"role": "user", "content": text}],
        response_format=DreamGenerationResponse,
    )
    data = completion.choices[0].message.parsed
    data.hex.slug = re.sub(r'[^a-z0-9-]', '', data.hex.slug.lower())
    return data

async def analyze_interaction_text(entity, state, command) -> InteractionResponse:
    init_models()
    query = f"Entity: {entity} ({state}). User Action: {command}"
    completion = client.beta.chat.completions.parse(
        model="gpt-4o-mini",
        messages=[{"role": "system", "content": INTERACTION_PROMPT}, {"role": "user", "content": query}],
        response_format=InteractionResponse,
    )
    return completion.choices[0].message.parsed