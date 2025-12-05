import os
import re
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
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
    current_stance: str = "idle" 

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
    new_options: List[str] = Field(min_items=4, max_items=4)
    new_stance: str = Field(..., description="Select one: idle, active, resting, happy, sad, angry, surprised")
    unlock_trigger: Optional[str] = None

# --- PROMPTS ---
SYSTEM_PROMPT = """
You are the Dream Scryer. Analyze the dream report into a Hex World (7 Stations).
1. Identify the Central Image (Station 0).
2. Identify up to 6 other entities/objects (Stations 1-6).
3. Generate 4 interaction options per entity.
4. Create a kebab-case slug.
5. Provide short/long summaries.
Return strictly structured JSON. Ensure all arrays meet length requirements.
"""

INTERACTION_PROMPT = """
You are the Dungeon Master. Calculate the entity's REACTION to the user.
1. Determine the entity's new emotional stance from this list: [idle, active, resting, happy, sad, angry, surprised].
2. Output new visual prompts using ACTIVE VERBS for the entity's new state.
3. Write a new greeting/response line (keep it enigmatic but responsive).
4. Provide 4 new interaction options for the player.
5. If the action reveals a major secret, set 'unlock_trigger' to 'UNLOCK_NEW_DREAM'.
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

async def analyze_interaction_text(world_context: Dict[str, Any], entity_name: str, current_stance: str, command: str) -> InteractionResponse:
    # Contextual query building
    context_str = f"World Description: {world_context.get('world_description', 'N/A')}\n"
    context_str += f"Other Entities Present: {', '.join([e['name'] for e in world_context.get('other_entities', [])])}\n"
    
    query = f"{context_str}\nTarget Entity: {entity_name} (Current Stance: {current_stance}).\nUser Action: {command}"
    
    completion = client.beta.chat.completions.parse(
        model="gpt-4o-mini",
        messages=[{"role": "system", "content": INTERACTION_PROMPT}, {"role": "user", "content": query}],
        response_format=InteractionResponse,
    )
    return completion.choices[0].message.parsed