// mobile/MockData.ts

// --- ASSET KEYS ---
// These are symbolic keys used throughout the JSON structure.
export const ASSET_KEYS: Record<string, string> = {
  // 1. MOUNTAIN HIDEOUT
  "mh_bg_0": 'mountain-hideout-under-fire_bg_0.jpeg', // These are the specific file paths we need to map
  "mh_bg_1": 'mountain-hideout-under-fire_bg_1.jpeg',
  "mh_bg_2": 'mountain-hideout-under-fire_bg_2.jpeg',
  "mh_s0_f0": 'mountain-hideout-under-fire_station_0_0.png',
  "mh_s0_f1": 'mountain-hideout-under-fire_station_0_1.png',
  "mh_s1_f0": 'mountain-hideout-under-fire_station_1_0.png',
  "mh_s1_f1": 'mountain-hideout-under-fire_station_1_1.png',
  "mh_s2_f0": 'mountain-hideout-under-fire_station_2_0.png',
  "mh_s3_f0": 'mountain-hideout-under-fire_station_3_0.png',
  "mh_s4_f0": 'mountain-hideout-under-fire_station_4_0.png',

  // 2. GOLDEN EAGLE
  "ge_bg_0": 'flight-of-the-golden-eagle_bg_0.jpeg',
  "ge_bg_1": 'flight-of-the-golden-eagle_bg_1.jpeg',
  "ge_s0_f0": 'flight-of-the-golden-eagle_station_0_0.png',
  "ge_s1_f0": 'flight-of-the-golden-eagle_station_1_0.png',

  // 3. INFINITE STAIRCASE
  "is_bg_0": 'the-infinite-staircase_bg_0.jpeg',
  "is_bg_1": 'the-infinite-staircase_bg_1.jpeg',
  "is_s0_f0": 'the-infinite-staircase_station_0_0.png',
  "is_s1_f0": 'the-infinite-staircase_station_1_0.png',
};

// --- FINAL DREAM DATA (Uses Keys from ASSET_KEYS) ---
export const DREAM_DATA = [
  {
    "id": "mountain-hideout-under-fire",
    "title": "Mountain Hideout Under Fire",
    "description_360": "Tense mountain scene with camouflage sheets.",
    "background_frame_keys": ["mh_bg_0", "mh_bg_1", "mh_bg_2"],
    "stations": [
      {
        "id": "s0", "position_index": 0, "entity_name": "Camo Sheets",
        "entity_greeting": "The wind whispers...",
        "interaction_options": ["Pull tighter", "Crawl under", "Lift to look out"],
        "sprite_frame_keys": ["mh_s0_f0", "mh_s0_f1", "mh_s0_f0", "mh_s0_f1"] // Example frame loop
      },
      {
        "id": "s1", "position_index": 1, "entity_name": "Husband",
        "entity_greeting": "Stay close to me!",
        "interaction_options": ["Ask if scared", "Check for injuries"],
        "sprite_frame_keys": ["mh_s1_f0", "mh_s1_f1", "mh_s1_f0", "mh_s1_f1"]
      },
      {
        "id": "s2", "position_index": 3, "entity_name": "Unknown Shooters",
        "entity_greeting": "...",
        "interaction_options": ["Call out", "Negotiate", "Duck"],
        "sprite_frame_keys": ["mh_s3_f0", "mh_s3_f0", "mh_s3_f0", "mh_s3_f0"]
      },
    ]
  },
  {
    "id": "flight-of-the-golden-eagle",
    "title": "Flight of the Golden Eagle",
    "description_360": "City of glass beneath soaring eagle.",
    "background_frame_keys": ["ge_bg_0", "ge_bg_1", "ge_bg_0"],
    "stations": [
      {
        "id": "s0", "position_index": 0, "entity_name": "Golden Eagle",
        "entity_greeting": "Welcome to the skies!",
        "interaction_options": ["Dive towards the city", "Explore horizon"],
        "sprite_frame_keys": ["ge_s0_f0", "ge_s0_f0", "ge_s0_f0", "ge_s0_f0"]
      },
      {
        "id": "s1", "position_index": 1, "entity_name": "City of Glass",
        "entity_greeting": "Gaze up in wonder!",
        "interaction_options": ["Touch a glass building", "Map out your route"],
        "sprite_frame_keys": ["ge_s1_f0", "ge_s1_f0", "ge_s1_f0", "ge_s1_f0"]
      },
    ]
  },
  {
    "id": "the-infinite-staircase",
    "title": "The Infinite Staircase",
    "description_360": "A mesmerizing staircase spiraling into the clouds.",
    "background_frame_keys": ["is_bg_0", "is_bg_1", "is_is_bg_0"],
    "stations": [
      {
        "id": "s0", "position_index": 0, "entity_name": "Box",
        "entity_greeting": "Welcome to my secrets.",
        "interaction_options": ["Lift the lid slowly", "Close it quickly"],
        "sprite_frame_keys": ["is_s0_f0", "is_s0_f0", "is_s0_f0", "is_s0_f0"]
      },
      {
        "id": "s1", "position_index": 1, "entity_name": "Staircase",
        "entity_greeting": "Climb, if you dare.",
        "interaction_options": ["Ascend cautiously", "Slide down the railing"],
        "sprite_frame_keys": ["is_s1_f0", "is_s1_f0", "is_s1_f0", "is_s1_f0"]
      },
    ]
  }
];