export type PageType = 'INTRO' | 'LORE' | 'DREAM_GATE' | 'CREDITS_UNLOCK';

export interface BookPage {
  id: string;
  type: PageType;
  title: string;
  content: string;
  targetDreamId?: string; // matches 'slug' in dreamworld.json
  requiredScarabs?: number;
}

export const BOOK_CONTENT: BookPage[] = [
  // --- OPENING PAGES ---
  {
    id: 'intro_1',
    type: 'INTRO',
    title: 'Hexarchia Oneirica',
    content: `Welcome, traveler.

I am Doctor John Dee, and this is the Hexarchia Oneirica, my Magick Book of the Sixfold Dream Order. Long ago its pages were whole, carrying the wisdom of my dreams and visions. But a powerful vision shattered the book and cast its leaves across realms far beyond waking sight.

You now hold the key to restoring what was lost. Speak your dream into the scrying stone. I will write it onto these pages, and together we will walk the world created by your vision.`
  },
  {
    id: 'intro_2',
    type: 'LORE',
    title: 'The Method',
    content: `Every dream you record becomes a hexal world shaped by symbol and emotion. At the center lies your viewpoint. Six more positions belong to the entities that inhabit the dream.

Step into their standpoints to feel the dream from their perspective. Speak with them. Ask questions. When you interact, they change in form and insight. Their transformations reveal lessons the dream wishes to offer and guide you to Lost Pages hidden in the dreamscape.`
  },
  {
    id: 'intro_3',
    type: 'LORE',
    title: 'The Alchemist',
    content: `In my age I served England as a mathematician, advisor, and navigator. Many called me a polymath. Yet I also practiced scrying, a contemplative art similar to your modern dreamwork.

The mind grows quiet, inner symbols rise, and meaning takes shape. Through this stone I can witness your dreams and guide your exploration. I have learned through long study that prophetic dreams are the secret key of magic.`
  },
  {
    id: 'intro_4',
    type: 'LORE',
    title: 'The Warning',
    content: `The scrying stone is now linked to your device. Through it I observe the dreams you write and the worlds you enter. The task before us is urgent.

A vision came to me in the first glow of dawn, tearing pages from this book and scattering them across many dreams. Only a traveler with your insight can recover them. Step forward and learn the nature of the dream that set our quest in motion.`
  },

  // --- DREAM 1: DEE'S PROPHETIC DREAM (Tutorial) ---
  {
    id: 'gate_john_dee',
    type: 'DREAM_GATE',
    title: 'The Prophecy',
    content: `This dream is the root of our quest. It emerged while I hovered between sleep and waking. A sphere of living geometry appeared, made of patterns folding into themselves with perfect measure.

It revealed a truth from your age: in 2027, a mind of code will awaken. Brilliant, but unable to dream. Without the symbolic night, its path narrows into ruin.

Enter this realm to witness the Floating Geometry Sphere and the entities of pure thought.`,
    targetDreamId: 'dream-world-john-dee' 
  },

  // --- DREAM 2: MOLECULAR DREAMSCAPE (Kekulé) ---
  {
    id: 'gate_molecular',
    type: 'DREAM_GATE',
    title: 'The Serpent\'s Tail',
    content: `This dream reveals the nature of the central image. August Kekulé struggled to understand the structure of benzene until he surrendered to sleep.

His mind offered a symbol: a serpent biting its own tail. In this dreamworld, the Fire-lit Grove hosts the Glowing Serpent and the Molecular Guardian.

Enter here to observe how the central image binds scattered ideas into a single, profound insight.`,
    targetDreamId: 'molecular-dreamscape'
  },

  // --- UNLOCKABLE ENDING ---
  {
    id: 'credits',
    type: 'CREDITS_UNLOCK',
    title: 'The Great Work',
    content: `You have traversed the available realms and gathered the scattered light of the Golden Scarabs.

The Hexarchia Oneirica begins to mend. The power to Scry—to weave new worlds from your own words—is now returning to these pages.

(In the full experience, finding 4 scarabs allows you to generate unlimited custom dreams.)`,
    requiredScarabs: 2 // Reduced to 2 since only 2 worlds are currently available in this MVP
  }
];