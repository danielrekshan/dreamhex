# DreamHex
### Web Demo: https://dreamhex.dseti.org
### Android Demo: https://expo.dev/accounts/dseti/projects/mobile/builds/0e482ea9-9eea-4067-bb9f-1724a0de923f

**DreamHex** is a graphical text adventure game (reminiscent of *Myst*) that transforms user-submitted dream reports into procedurally generated 360° panoramic worlds.

Built as a technical portfolio piece for **Dust.systems**, this project demonstrates a full-stack integration of **React Native** (mobile), **FastAPI** (backend), and **Generative AI** (LLMs & Stable Diffusion via Modal) to create a "just-in-time" generated reality.



## 📖 The Lore: Hexarchia Oneirica
The app creates a diegetic interface where your phone acts as a "scrying stone" linked to the lost dream-grimoire of **Dr. John Dee**. Dee has enlisted you to map the "DreamHex"—a 7x7 grid of dream worlds—to teach a future AI how to dream, thereby preventing a prophesied logic-induced apocalypse in 2027.

***

## ⚙️ Current Project Status: Prototype MVP

The initial prototype is focused on validating the core Dream-to-World and Entity Interaction loop.

* **Pregenerated Content Focus:** The demo experience centers on **Chapter 2: Creative Dream Incubation**. The initial set of dream reports (e.g., *Howe's Needle*, *McCartney's Melody*, *Larry Page's Algorithm*) are pre-analyzed and persisted in the datastore to guarantee a stable, illustrative demo experience while keeping the AI-driven procedural generation pipeline active.
* **Essential Interaction:** The initial vision of the **360° panorama** and **billboard-style sprites** has been reduced to the essential interactions: movement between viewpoints, camera control (gyro/drag), and entity chat interaction. This ensures the **React Native** frontend, **FastAPI** backend, and **Modal** worker systems are fully integrated and testable.

***

## ✨ Features
* **Dream-to-World Pipeline:** Converts raw text reports into navigable 3D hex tiles.
* **360° Panoramas:** Uses `react-three/fiber` to render immersive, generated backgrounds.
* **Lazy-Loaded Generation:** Assets (backgrounds, sprites) are generated via AI only when a user steps into a specific viewpoint, minimizing cost and latency.
* **Entity Interaction:** Users can chat with dream entities (sprites) whose personalities and dialogue are driven by LLMs based on the dream's emotional context.
* **Spatial Navigation:** Navigate between 7 viewpoints per hex using gyroscope controls (mobile) or drag interactions (web).

***

## 🛠 Tech Stack

### Mobile (Frontend)
* **Framework:** React Native with Expo (TypeScript).
* **Graphics:** Three.js via `@react-three/fiber` & `@react-three/drei`.
* **Navigation:** Custom spatial navigation system (Hex-based).

### Backend (API)
* **Framework:** FastAPI (Python).
* **Database:** Google Cloud Firestore (NoSQL).
* **Storage:** Google Cloud Storage (Assets).
* **Deployment:** Google Cloud Run (Dockerized).

### AI & Compute
* **Orchestration:** Modal (Serverless GPU management).
* **Image Generation:** Stable Diffusion (via Modal worker).
* **Text Analysis:** OpenAI API (via `dream_analyzer.py`).

***

## 🤖 AI and Code Generation Declaration

This project was built using AI assistance. The architecture, system flow, core component logic (e.g., Three.js integration, Firestore data handling, FastAPI endpoint structure), and business logic for AI prompting were entirely human-designed and implemented. AI tools (specifically large language models) were used to increase development velocity by:

1.  **Translating** high-level component descriptions into functional code blocks.
2.  **Generating** boilerplate code, configuration files (e.g., `Dockerfile`, `setupgcp.sh`), and standard utility functions.
3.  **Refactoring** existing code for better performance, type safety, and adherence to language best practices.

The final system architecture, the integration between the services (React Native, FastAPI, Modal), and the overall artistic vision remain the product of the human developer.

***

## 📂 Repository Structure

```text
dreamhex/
├── api/                        # FastAPI Backend
│   ├── main.py                 # API Entry point and endpoints
│   ├── dream_analyzer.py       # LLM logic for parsing dream texts
│   ├── modal_worker.py         # Modal interface for GPU image generation
│   ├── Dockerfile              # Container config for Cloud Run
│   └── requirements.txt        # Python dependencies
├── mobile/                     # React Native Expo App
│   ├── App.tsx                 # Main entry point
│   ├── components/             # UI & 3D Components
│   │   ├── MagicBook.tsx       # Core UI overlay
│   │   ├── DreamScene.tsx      # Three.js scene wrapper
│   │   └── AnimatedSprite.tsx  # Billboard sprites for entities
│   ├── assets/                 # Static assets (fonts, icons, fallback audio)
│   └── package.json            # Node dependencies
├── docs/                       # Project Documentation & Lore
│   ├── DreamHex Specification Prompt.md
│   └── lore.md                 # Master Lore Document
├── scripts/                    # Utility Scripts
│   ├── world_builder.py        # Script for seeding world data
│   └── DreamHex_Notebooks.ipynb # Prototyping notebooks
├── setupgcp.sh                 # Google Cloud setup script
└── sagcp.sh                    # Service Account helper script