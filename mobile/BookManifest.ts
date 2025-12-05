export type PageType = 'INTRO' | 'LORE' | 'DREAM_GATE' | 'CREDITS_UNLOCK';

export interface BookPage {
  id: string;
  type: PageType;
  title: string;
  content: string; // Markdown-like text
  targetDreamId?: string; // If type is DREAM_GATE, which dream ID to load
  requiredScarabs?: number; // If type is CREDITS_UNLOCK, how many needed
}

export const BOOK_CONTENT: BookPage[] = [
  // --- INTRO ---
  {
    id: 'intro_1',
    type: 'INTRO',
    title: 'Hexarchia Oneirica',
    content: 'Welcome, Traveler.\n\nI am Doctor John Dee. This is the Magick Book of the Sixfold Dream Order. Long ago its pages were whole, but a powerful vision shattered them across the dream realms.\n\nYou stand upon the binding of the book itself. To restore it, you must enter the dreams of others and recover the lost "Golden Scarabs" hidden within their subconscious.'
  },
  {
    id: 'intro_2',
    type: 'LORE',
    title: 'The Method',
    content: 'How to proceed:\n\n1. Use this book to travel to Dream Realms.\n2. In each realm, speak to the Entities (Spirits).\n3. Some interactions will reveal a hidden Golden Scarab.\n4. Find 4 Scarabs to unlock the ability to Scry your own dreams.'
  },
  
  // --- DREAM GATES ---
  {
    id: 'gate_1',
    type: 'DREAM_GATE',
    title: 'Chapter I: The Molecular Grove',
    content: 'A vision of serenity and fire. A grove lit by dancing flames where molecules spin in the darkness, twisting like serpents of light.',
    targetDreamId: 'molecular-dreamscape' // Matches slug in your JSON
  },
  {
    id: 'gate_2',
    type: 'DREAM_GATE',
    title: 'Chapter II: The Geometry of Dee',
    content: 'A vision of pure thought. A scholar wanders a void of floating geometric forms, seeking the mathematical language of angels.',
    targetDreamId: 'dream-world-john-dee' // Matches slug in your JSON
  },

  // --- UNLOCKABLE ENDING ---
  {
    id: 'credits',
    type: 'CREDITS_UNLOCK',
    title: 'The Great Work',
    content: 'You have traversed the realms. If you have gathered the 4 Golden Scarabs, the final page shall open, granting you the power to weave new worlds.',
    requiredScarabs: 4
  }
];