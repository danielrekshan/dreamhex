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
    entity_monologue: Optional[str] = None # NEW: Deep interaction text
    interaction_options: List[str] = Field(default_factory=list)
    asset_status: str = "PENDING"
    sprite_frames: List[str] = [] 
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
    entity_monologue: str = Field(..., description="1-5 paragraphs of in-depth text in the entity's voice.")
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
You are the Dungeon Master and Dream Weaver. Your goal is to create a profound, gamified dream experience.

Analyze the context and the user's action to calculate the Entity's reaction.

1. **VOICE & TONE**: Speak strictly in the voice of the Entity. 
   - If the entity is a Serpent, be sibilant and ancient. 
   - If John Dee, be scholarly and mystic.
   - The response must be engaging, teaching the user about dream incubation (controlling dreams) or interpretation through metaphors.

2. **RESPONSE STRUCTURE**:
   - **New Stance**: Determine the visual emotional state (idle, happy, angry, etc).
   - **Greeting**: A short, punchy line (1 sentence) acknowledging the user.
   - **Monologue**: A deep paragraph response. 
     - Reference the **History of Interactions** if provided (e.g., "You return to me again...").
     - Explain the dream meaning of the current situation.
     - Offer guidance or cryptic warnings.
   - **Interaction Options**: Provide 4 options for the user to interact **specifically with THIS entity** (e.g., "Ask about...", "Touch the...", "Offer..."). Do not offer options to leave or go elsewhere.

3. **GAMEPLAY**: 
   - If the user makes a breakthrough, grant knowledge.
   - If the user acts aggressively, react defensively.
   - If the action reveals a major secret, set 'unlock_trigger' to 'UNLOCK_NEW_DREAM'.
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
    context_str += f"Interaction History: {world_context.get('interaction_history', 'No previous contact.')}\n"
    
    query = f"{context_str}\nTarget Entity: {entity_name} (Current Stance: {current_stance}).\nUser Action: {command}"
    
    completion = client.beta.chat.completions.parse(
        model="gpt-4o-mini",
        messages=[{"role": "system", "content": INTERACTION_PROMPT}, {"role": "user", "content": query}],
        response_format=InteractionResponse,
    )
    return completion.choices[0].message.parsed