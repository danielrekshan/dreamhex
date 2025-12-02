import os
import re
from pydantic import BaseModel, Field
from typing import List, Optional
from openai import OpenAI

# --- CONFIG ---
# This runs on the Cloud Run CPU instance
OPENAI_KEY = os.environ.get("OPENAI_API_KEY")
client = OpenAI(api_key=OPENAI_KEY)

# --- DATA MODELS ---
class Station(BaseModel):
    id: str
    position_index: int
    entity_name: Optional[str] = None
    state_start: Optional[str] = None
    state_end: Optional[str] = None
    entity_greeting: Optional[str] = None
    interaction_options: List[str] = Field(default_factory=list)
    asset_status: str = "PENDING"
    sprite_frames: List[str] = [] # Stores GCS URLs

class DreamHex(BaseModel):
    title: str
    slug: str
    description_360: str
    central_imagery: str
    stations: List[Station]
    background_frames: List[str] = []

class DreamGenerationResponse(BaseModel):
    hex: DreamHex
    summary_short: str = Field(..., description="One sentence summary.")
    summary_long: str = Field(..., description="3-5 sentence summary.")
    entities: List[str] = Field(default_factory=list)

class InteractionResponse(BaseModel):
    new_state_start: str
    new_state_end: str
    new_greeting: str
    new_options: List[str] = Field(min_items=5, max_items=5)
    unlock_trigger: Optional[str] = None

# --- PROMPTS ---
SYSTEM_PROMPT = """
You are the Dream Scryer. Analyze the dream report into a Hex World (7 Stations).
1. Identify the Central Image (Station 0).
2. Identify up to 6 other entities/objects (Stations 1-6).
3. Generate 5 interaction options per entity.
4. Create a kebab-case slug.
5. Provide short/long summaries.
Return strictly structured JSON. Ensure all arrays meet length requirements.
"""

INTERACTION_PROMPT = """
You are the Dungeon Master. Calculate the entity's REACTION.
1. Output new visual prompts using ACTIVE VERBS for the entity's new state.
2. Provide 5 new interaction options.
3. If the action reveals a major secret, set 'unlock_trigger' to 'UNLOCK_NEW_DREAM'.
"""

async def analyze_dream_text(text: str) -> DreamGenerationResponse:
    prompt = f"Dream Report: {text}\n\nAnalyze the report. Provide a short (1-sentence) summary, a long (3-5 sentence) summary, and a list of entities. Then generate the structured DreamHex data with 7 stations."
    
    completion = client.beta.chat.completions.parse(
        model="gpt-4o-mini",
        messages=[{"role": "system", "content": SYSTEM_PROMPT}, {"role": "user", "content": prompt}],
        response_format=DreamGenerationResponse,
    )
    data = completion.choices[0].message.parsed
    data.hex.slug = re.sub(r'[^a-z0-9-]', '', data.hex.slug.lower())
    return data

async def analyze_interaction_text(entity, state, command) -> InteractionResponse:
    query = f"Entity: {entity} (State: {state}). Action: {command}"
    completion = client.beta.chat.completions.parse(
        model="gpt-4o-mini",
        messages=[{"role": "system", "content": INTERACTION_PROMPT}, {"role": "user", "content": query}],
        response_format=InteractionResponse,
    )
    return completion.choices[0].message.parsed