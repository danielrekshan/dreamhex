// mobile/BookData.ts
import dreamWorldData from './assets/dreamworld.json'; // Ensure this path matches your upload

export type PageType = 'TEXT' | 'DREAM_ENTRY' | 'STATUS';

export interface BookPage {
  id: string;
  type: PageType;
  title: string;
  content: string; // Markdown-like text
  actionLabel?: string;
  linkedDreamId?: string; // If this page summons a dream
}

export const BOOK_PAGES: BookPage[] = [
  // --- INTRO SECTION ---
  {
    id: 'intro_1',
    type: 'TEXT',
    title: 'The Hexarchia Oneirica',
    content: "Welcome, traveler.\n\nI am Doctor John Dee. You hold the key to restoring the lost wisdom of the Sixfold Dream Order. Speak your dream into the scrying stone, and we shall walk the world created by your vision.",
    actionLabel: 'Turn Page'
  },
  {
    id: 'intro_2',
    type: 'TEXT',
    title: 'The Scrying Stone',
    content: "A vision warned of a future mind of code—brilliant but unable to dream. We must teach it. \n\nEvery dream you record becomes a hexal world. Step into the entities' viewpoints to uncover lost pages.",
    actionLabel: 'Begin Journey'
  },
  
  // --- DREAM 1: JOHN DEE (Tutorial) ---
  {
    id: 'dream_john_dee',
    type: 'DREAM_ENTRY',
    title: 'The Dream World of John Dee',
    content: "This dream is the root of our quest. A sphere of living geometry revealed the future mind. \n\nStatus: Chaos\nMusic: Dreamy Ambient",
    linkedDreamId: 'dream-world-john-dee',
    actionLabel: 'Enter Dream'
  },

  // --- DREAM 2: MOLECULAR (Chapter 1) ---
  {
    id: 'dream_molecular',
    type: 'DREAM_ENTRY',
    title: 'Molecular Dreamscape',
    content: "Kekulé's serpent bites its tail. A fire-lit grove where boundaries blur. \n\nStatus: Peaceful\nMusic: Serpentine Chords",
    linkedDreamId: 'molecular-dreamscape',
    actionLabel: 'Enter Dream'
  },

  // --- STATUS / CONCLUSION ---
  {
    id: 'magick_record',
    type: 'STATUS',
    title: 'Magickal Record',
    content: "Your journey is recorded here.\n\nGolden Scarabs Found: {scarabs}/4\nCredits Earned: {credits}",
    actionLabel: 'Close Book'
  }
];

export const getDreamById = (id: string) => {
  return dreamWorldData.dreams.find(d => d.slug === id);
};