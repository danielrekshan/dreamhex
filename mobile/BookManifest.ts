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
    content: `*Welcome, traveler.*

I am Doctor John Dee, and this is the Hexarchia Oneirica, my Magick Book of the Six Dream Powers. Long ago its pages were whole, carrying the wisdom of my dreams and visions. But a powerful dream shattered the book and cast its leaves across realms far beyond waking sight. 

You must find the missing pages hidden within the dream world.`
  },
  {
    id: 'intro_2',
    type: 'LORE',
    title: 'The Dream Alchemist',
    content: `In my age I served England as mathematician, advisor, and navigator. But my deeper work was contemplative: the study of symbols rising from the inner world. Through scrying—an art you might compare to modern dreamwork or hypnosis—I learned that dreams reveal truths concealed by waking light.

Through a scrying stone I observe the dream world through time, or at least I did until my book was torn apart. I guide you not to interpret them, but to locate the fragments of my shattered book embedded within them.

Each page you recover brings us closer to the truth my prophetic dream revealed.`
  },
  {
    id: 'intro_3',
    type: 'LORE',
    title: 'The Method',
    content: `Each page of this book corresponds to a dream realm.  You must start with the first page, enter that dream, and find the next page hidden within it.
    
    Once you find all my missing pages, we'll have a chance to restore the Hexarchia Oneirica and unlock its full power.
    `
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
    // WAS: 'dream-world-john-dee'
    targetDreamId: 'floating-in-thought', 
    content: `This dream is the root of our quest... (truncated for brevity)`
  },

  // --- DREAM 2: MOLECULAR DREAMSCAPE (Kekulé) ---
  {
    id: 'gate_molecular',
    type: 'DREAM_GATE',
    title: 'The Serpent\'s Tail',
    // WAS: 'molecular-dreamscape'
    targetDreamId: 'molecular-reverie', 
    content: `This dream reveals the nature of the central image... (truncated)`
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