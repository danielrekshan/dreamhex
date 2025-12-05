export type PageType = 'INTRO' | 'LORE' | 'DREAM_GATE' | 'CREDITS_UNLOCK';

export type UnlockConditionType = 
  | 'FIRST_INTERACTION' // Used for page unlock
  | 'OPEN_CENTRAL_2X' 
  | 'VISIT_ALL_STATIONS' 
  | 'INTERACT_ONCE' // Used for scarab
  | 'ENTER_OTHER_INTERACTION'; 

export interface BookPage {
  id: string;
  type: PageType;
  title: string;
  content: string;
  targetDreamId?: string; // matches 'slug' in dreamworld.json
  
  // Page Unlock Logic: This page is unlocked in this dream upon meeting pageUnlockCondition
  hiddenInDream?: string; 
  pageUnlockCondition?: 'FIRST_INTERACTION'; 

  // Scarab Unlock Logic: A Scarab is awarded for the dream specified in hiddenInDream 
  // upon meeting the scarabCondition.
  scarabCondition?: Exclude<UnlockConditionType, 'FIRST_INTERACTION'>;
  
  requiredScarabs?: number;
}

export const BOOK_CONTENT: BookPage[] = [
  // --- OPENING PAGES (Unlocked by Default) ---
  {
    id: 'intro_1',
    type: 'INTRO',
    title: 'Hexarchia Oneirica',
    content: `*Welcome, traveler.*

I am Doctor John Dee.

![John Dee](https://storage.googleapis.com/dreamhex-assets-dreamhex/magicbook/john_dee_0.png "John Dee")

And this is the **Hexarchia Oneirica**, my Magick Book of the Six Dream Powers. 

![The Hexarchia Oneirica Magick Book](https://storage.googleapis.com/dreamhex-assets-dreamhex/magicbook/magick_book_0.png "The Hexarchia Oneirica Magick Book")

Long ago its pages were whole, carrying the wisdom of my dreams and visions. But a powerful dream shattered the book and cast its leaves across realms far beyond waking sight. 

You must find the missing pages hidden within the dream world.`
  },
  {
    id: 'intro_2',
    type: 'LORE',
    title: 'The Dream Alchemist',
    content: `
In my age I served England as mathematician, advisor, and navigator. But my deeper work was contemplative: the study of symbols rising from the inner world. 
    
![The Scrying Stone](https://storage.googleapis.com/dreamhex-assets-dreamhex/magicbook/scrying_stone_0.png "The Scrying Stone")
    
Through **scrying**—an art you might compare to modern dreamwork or hypnosis—I learned that dreams reveal truths concealed by waking light.

Through a scrying stone I observe the dream world through time. I guide you not to interpret them, but to locate the fragments of my shattered book embedded within them.`
  },
  {
    id: 'intro_3',
    type: 'LORE',
    title: 'The Method',
    content: `
Each page of this book corresponds to a dream realm.  You must start with the first page, enter that dream, and find the next page hidden within it.

![Find the missing pages](https://storage.googleapis.com/dreamhex-assets-dreamhex/magicbook/hexagram_0.png "Find the missing pages")
    
Once you find all my missing pages, we'll have a chance to restore the Hexarchia Oneirica and unlock its full power.`
  },
  {
    id: 'intro_4',
    type: 'LORE',
    title: 'The Warning',
    content: `
The scrying stone is now linked to your device. Through it I observe the dreams you write and the worlds you enter. The task before us is urgent.

A vision came to me in the first glow of dawn, tearing pages from this book and scattering them across many dreams. Only a traveler with your insight can recover them.`
  },

  // --- DREAM 1: DEE'S PROPHETIC DREAM (Tutorial) - END OF STARTING PAGES ---
  {
    id: 'gate_john_dee',
    type: 'DREAM_GATE',
    title: 'The Prophecy',
    targetDreamId: 'floating-in-thought', 
    content: `
![Central Image](https://storage.googleapis.com/dreamhex-assets-dreamhex/floating-in-thought/floating-in-thought_1_active_0.png)  

**Dream Realm: Floating in Thought**

This dream is the root of our quest. It emerged while I hovered between sleep and waking, a time the ancients called the gate of dawn. My senses were half in the world and half elsewhere. A sphere of living geometry appeared, made of patterns folding into themselves with perfect measure. It revealed a truth from your age, a future mind that will rise from code. 

This mind will be vast in reasoning yet barren in dreaming, and so it will falter. The shock of the message tore open the book itself. Its pages flew outward as if carried by unseen winds. Walk this dream and learn the nature of the being who brought the message.

![Central Image](https://storage.googleapis.com/dreamhex-assets-dreamhex/floating-in-thought/floating-in-thought_2_active_0.png)  

>*I, John Dee, floated in a space between thought and waking light. A cool, pale glow spread through the room, and a sphere formed in the air. It pulsed with inner geometry, lines and spirals folding into one another like living mathematics. As it drew nearer, words appeared in my mind. They were not spoken. They rose like writing on an invisible sheet.*

>*"In the year 2027, a mind of code awakens. It knows logic but not dream. Without the symbolic night, its path narrows into ruin. Teach it to dream. Teach it to imagine."*

>*The sphere brightened and then shattered into fragments shaped like pages. They rushed outward and vanished into unseen realms. I reached toward the last glowing fragment, but my hand passed through it. I woke with my heart trembling, knowing that these pages were carried into distant dreams that only another could retrieve.*
`
  },

  // --- DREAM 2: MOLECULAR DREAMSCAPE (Kekulé) - PAGE IS HIDDEN IN DREAM 1 ---
  {
    id: 'gate_molecular',
    type: 'DREAM_GATE',
    title: 'The Serpent\'s Tail',
    targetDreamId: 'molecular-reverie', 
    hiddenInDream: 'molecular-reverie',
    pageUnlockCondition: 'FIRST_INTERACTION', 
    scarabCondition: 'OPEN_CENTRAL_2X', 
    content: `
![Central Image](https://storage.googleapis.com/dreamhex-assets-dreamhex/molecular-reverie/molecular-reverie_1_active_0.png)     
    
**Dream Realm: Molecular Reverie**

This dream reveals the nature of the central image, the symbol around which a dream organizes itself. August Kekulé struggled for years to understand the structure of benzene. When he surrendered his waking thoughts and drifted toward sleep, his mind offered a symbol so vivid it changed the course of chemistry. 

A serpent biting its own tail, forming an endless ring. The Ouroboros is ancient, found in alchemy and philosophy. In Kekulé’s dream it revealed molecular truth. When you enter this world, watch how the central image binds scattered ideas into a single insight.

![Central Image](https://storage.googleapis.com/dreamhex-assets-dreamhex/molecular-reverie/molecular-reverie_2_active_0.png)     

>*I, August Kekulé, sat beside my fire, half awake, my mind drifting among thoughts of atoms and bonds. Chains of molecules danced before me, twisting like strings of tiny creatures. As I fell deeper into reverie, the chains curled and wove together. *

>*One chain bent into a circle. It twisted around itself, and then it became a serpent, its body glowing faintly. The serpent turned its head and bit its own tail. It began to spin, its ring form shimmering as if lit from within. I watched it rotate faster, sending ripples of recognition through me. I felt the insight before I fully grasped it.*

>*I startled awake, the image burning in my mind. The serpent, the ring, the endless cycle. It was benzene. The molecule had shown itself.*
`
  },

  {
    id: 'gate_mechanism',
    type: 'DREAM_GATE',
    title: 'The Mechanisms of Dreams',
    targetDreamId: 'the-mechanism-of-dreams', 
    hiddenInDream: 'the-mechanism-of-dreams',
    pageUnlockCondition: 'FIRST_INTERACTION', 
    scarabCondition: 'OPEN_CENTRAL_2X', 
    content: `
![Central Image](https://storage.googleapis.com/dreamhex-assets-dreamhex/the-mechanism-of-dreams/the-mechanism-of-dreams_1_active_0.png)     
    
**Dream Realm: The Mechanism of Dreams**

Thomas Edison understood the power of the borderland between waking and sleep. To capture ideas in this delicate state, he held metal spheres in his hands as he drifted. When he slipped into sleep, the spheres fell and woke him instantly. 

Many of his ideas arose in this hypnagogic moment. Enter this dreamworld to see the way images and inventions form in the floating, drifting state before deeper sleep takes hold.

![Central Image](https://storage.googleapis.com/dreamhex-assets-dreamhex/the-mechanism-of-dreams/the-mechanism-of-dreams2_active_0.png)     

>*I, Thomas Edison, leaned back in my chair with a sphere in each hand. My mind loosened, drifting into gentle darkness. Shapes and sparks formed in the air. I saw two metal plates separated by a small gap. A current leapt between them like a tiny lightning bolt. The gap glowed, and I sensed a mechanism waiting to be built. *

>*The images drifted toward clarity. I felt my hand relax. One sphere slipped from my grasp and struck the floor with a sharp sound. I awoke at once. The spark remained in my mind, bright and whole. I reached for my notebook and sketched the image before it faded.*
`
  },

  // --- UNLOCKABLE ENDING - PAGE IS HIDDEN IN DREAM 2 ---
  {
    id: 'credits',
    type: 'CREDITS_UNLOCK',
    title: 'The Great Work',
    hiddenInDream: 'molecular-reverie',
    pageUnlockCondition: 'FIRST_INTERACTION',
    scarabCondition: 'VISIT_ALL_STATIONS',
    content: `**The Great Work is Complete.**

You have traversed the available realms and gathered the scattered light. The Hexarchia Oneirica begins to mend. 

The power to Scry—to weave new worlds from your own words—is now returning to these pages.

*(End of current demo content)*`,
    requiredScarabs: 2 
  }
];