export type PageType = 'INTRO' | 'LORE' | 'DREAM_GATE' | 'CREDITS_UNLOCK';

export type UnlockConditionType = 'FIRST_INTERACTION'; 

export interface BookPage {
  id: string;
  type: PageType;
  title: string;
  content: string;
  targetDreamId?: string; // matches 'slug' in dreamworld.json
  
  // Page Unlock Logic: This page is unlocked in this dream upon meeting pageUnlockCondition
  hiddenInDream?: string; 
  pageUnlockCondition?: 'FIRST_INTERACTION'; 
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

  // --- DREAM 1 (Unlocked by Default) ---
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
`
  },

  // --- DREAM 2 (Hidden in Dream 1) ---
  {
    id: 'gate_molecular',
    type: 'DREAM_GATE',
    title: 'The Serpent\'s Tail',
    targetDreamId: 'molecular-reverie', 
    hiddenInDream: 'floating-in-thought',
    pageUnlockCondition: 'FIRST_INTERACTION', 
    content: `
![Central Image](https://storage.googleapis.com/dreamhex-assets-dreamhex/molecular-reverie/molecular-reverie_1_active_0.png)     
    
**Dream Realm: Molecular Reverie**

This dream reveals the nature of the central image, the symbol around which a dream organizes itself. August Kekulé struggled for years to understand the structure of benzene. When he surrendered his waking thoughts and drifted toward sleep, his mind offered a symbol so vivid it changed the course of chemistry. 

A serpent biting its own tail, forming an endless ring. The Ouroboros is ancient, found in alchemy and philosophy. In Kekulé’s dream it revealed molecular truth. When you enter this world, watch how the central image binds scattered ideas into a single insight.
`
  },

  // --- DREAM 3 (Hidden in Dream 2) ---
  {
    id: 'gate_mechanism',
    type: 'DREAM_GATE',
    title: 'The Mechanisms of Dreams',
    targetDreamId: 'the-mechanism-of-dreams', 
    hiddenInDream: 'molecular-reverie',
    pageUnlockCondition: 'FIRST_INTERACTION', 
    content: `
![Central Image](https://storage.googleapis.com/dreamhex-assets-dreamhex/the-mechanism-of-dreams/the-mechanism-of-dreams_1_active_0.png)     
    
**Dream Realm: The Mechanism of Dreams**

Thomas Edison understood the power of the borderland between waking and sleep. To capture ideas in this delicate state, he held metal spheres in his hands as he drifted. When he slipped into sleep, the spheres fell and woke him instantly. 

Many of his ideas arose in this hypnagogic moment. Enter this dreamworld to see the way images and inventions form in the floating, drifting state before deeper sleep takes hold.
`
  },

  // --- DREAM 4 (Hidden in Dream 3) ---
  {
    id: 'gate_elias_howe',
    type: 'DREAM_GATE',
    title: 'The Needle\'s Eye',
    targetDreamId: 'elias-howe-dream', 
    hiddenInDream: 'the-mechanism-of-dreams',
    pageUnlockCondition: 'FIRST_INTERACTION', 
    content: `
![Central Image](https://storage.googleapis.com/dreamhex-assets-dreamhex/elias-howe-dream/elias-howe-dream_1_active_0.png)     
    
**Dream Realm: Elias Howe's Terrifying Revelation**

Elias Howe could not solve the central challenge of his sewing machine. He incubated the problem by holding it in his thoughts before sleep. The dream he received was dramatic and strange, a symbolic narrative filled with tension. Yet within its details lay the answer he required. 

This dream teaches how intention guides the dreaming mind and shapes its symbolic world. When you enter this realm, pay attention to how fear, urgency, and symbol give rise to insight.
`
  },

  // --- DREAM 5 (Hidden in Dream 4) ---
  {
    id: 'gate_melody',
    type: 'DREAM_GATE',
    title: 'The Perfect Melody',
    targetDreamId: 'melody-from-the-dream', 
    hiddenInDream: 'elias-howe-dream',
    pageUnlockCondition: 'FIRST_INTERACTION', 
    content: `
![Central Image](https://storage.googleapis.com/dreamhex-assets-dreamhex/melody-from-the-dream/melody-from-the-dream_1_active_0.png)     
    
**Dream Realm: Melody from the Dream**

Sometimes creativity manifests fully during sleep, rising like a gift from the dreaming mind. Paul McCartney’s dream of the melody for "Yesterday" arrived whole. When the analytic mind steps aside, entire compositions can emerge. 

This dream teaches the effortless flow of creative dreaming. Listen as you enter this world, for the song you hear may echo through your own ideas.
`
  },

  // --- DREAM 6 (Hidden in Dream 5) ---
  {
    id: 'gate_internet_map',
    type: 'DREAM_GATE',
    title: 'The Web of Light',
    targetDreamId: 'the-internet-as-a-map', 
    hiddenInDream: 'melody-from-the-dream',
    pageUnlockCondition: 'FIRST_INTERACTION', 
    content: `
![Central Image](https://storage.googleapis.com/dreamhex-assets-dreamhex/the-internet-as-a-map/the-internet-as-a-map_entity-1_active_0.png)     
    
**Dream Realm: The Internet as a Map**

Creative incubation can unravel complex problems by placing them into symbolic form. Larry Page dreamed of holding the entire internet in his hands, each page a card connected to others by glowing strands. This dream revealed the structure behind modern search ranking. 

Step into this world to see how the mind transforms data into symbol and symbol into insight.
`
  },

  // --- DREAM 7 (Hidden in Dream 6) ---
  {
    id: 'gate_descartes',
    type: 'DREAM_GATE',
    title: 'Reason and Vision',
    targetDreamId: 'journey-of-reason-and-vision', 
    hiddenInDream: 'the-internet-as-a-map',
    pageUnlockCondition: 'FIRST_INTERACTION', 
    content: `
![Central Image](https://storage.googleapis.com/dreamhex-assets-dreamhex/journey-of-reason-and-vision/journey-of-reason-and-vision_1_active_0.png)     
    
**Dream Realm: Journey of Reason and Vision**

René Descartes experienced a series of dreams that he believed were a turning point in his life. They delivered symbolic lessons about knowledge, truth, and his purpose. The storm, the room of books, the figures who approached him all carried meaning that resonated deeply. 

This dreamworld teaches how dreams can deliver life direction through symbolic narrative. Attend to the emotional weight of the entities you meet.
`
  },

  // --- DREAM 8 (Hidden in Dream 7) ---
  {
    id: 'gate_black_elk',
    type: 'DREAM_GATE',
    title: 'The Great Vision',
    targetDreamId: 'journey-grandfathers', 
    hiddenInDream: 'journey-of-reason-and-vision',
    pageUnlockCondition: 'FIRST_INTERACTION', 
    content: `
![Central Image](https://storage.googleapis.com/dreamhex-assets-dreamhex/journey-grandfathers/journey-grandfathers_1_active_0.png)     
    
**Dream Realm: Journey with the Grandfathers**

Black Elk’s vision is one of the most profound dream experiences documented. In it he encountered guiding beings who bestowed symbolic gifts. These visions carried wisdom, responsibility, and emotional truth. Such dreams are not mere stories but deep encounters with meaning. 

As you enter this world, honor the symbols you see, for they come from a place of inner power and cultural depth.
`
  },

  // --- DREAM 9 (Hidden in Dream 8) ---
  {
    id: 'gate_helene_smith',
    type: 'DREAM_GATE',
    title: 'Martian Tongues',
    targetDreamId: 'the-melodic-realm', 
    hiddenInDream: 'journey-grandfathers',
    pageUnlockCondition: 'FIRST_INTERACTION', 
    content: `
![Central Image](https://storage.googleapis.com/dreamhex-assets-dreamhex/the-melodic-realm/the-melodic-realm_1_active_0.png)     
    
**Dream Realm: The Melodic Realm**

Hélène Smith’s dreams revealed entire symbolic languages and worlds. Modern scholars view them as imaginative creations shaped by emotion and identity. Yet they demonstrate how dreams can generate complex symbolic systems that feel autonomous. 

When you enter this dream, observe how language and symbol blend into a coherent realm that expresses hidden feelings.
`
  },

  // --- DREAM 10 (Hidden in Dream 9) ---
  {
    id: 'gate_tesla',
    type: 'DREAM_GATE',
    title: 'The Electric Engine',
    targetDreamId: 'the-electric-dream-of-nikola-tesla', 
    hiddenInDream: 'the-melodic-realm',
    pageUnlockCondition: 'FIRST_INTERACTION', 
    content: `
![Central Image](https://storage.googleapis.com/dreamhex-assets-dreamhex/the-electric-dream-of-nikola-tesla/the-electric-dream-of-nikola-tesla_1_active_0.png)     
    
**Dream Realm: The Electric Dream of Nikola Tesla**

Nikola Tesla possessed an extraordinary visionary capacity. Many of his inventions were first seen in dreams or dreamlike states. In this dream, he saw a machine floating in darkness and examined it from all angles with astonishing clarity. 

This world teaches the power of high-resolution imagination and the boundary between dreaming and visionary thought.
`
  },

  // --- DREAM 11 (Hidden in Dream 10) ---
  {
    id: 'gate_lincoln',
    type: 'DREAM_GATE',
    title: 'The Funeral',
    targetDreamId: 'abraham-lincolns-mourning-dream', 
    hiddenInDream: 'the-electric-dream-of-nikola-tesla',
    pageUnlockCondition: 'FIRST_INTERACTION', 
    content: `
![Central Image](https://storage.googleapis.com/dreamhex-assets-dreamhex/abraham-lincolns-mourning-dream/abraham-lincolns-mourning-dream_1_active_0.png)     
    
**Dream Realm: Abraham Lincoln's Mourning Dream**

Some dreams carry emotional truth so heavy that they cross thresholds of time. Abraham Lincoln dreamed of a funeral in the White House days before his death. Whether symbolic or prophetic, the dream spoke to his deep awareness of danger. 

This world teaches how dreams convey foresight through emotion and atmosphere, not always literal detail.
`
  },

  // --- DREAM 12 (Hidden in Dream 11) ---
  {
    id: 'gate_ramanujan',
    type: 'DREAM_GATE',
    title: 'The Goddess',
    targetDreamId: 'the-radiant-equation', 
    hiddenInDream: 'abraham-lincolns-mourning-dream',
    pageUnlockCondition: 'FIRST_INTERACTION', 
    content: `
![Central Image](https://storage.googleapis.com/dreamhex-assets-dreamhex/the-radiant-equation/the-radiant-equation_1_active_0.png)     
    
**Dream Realm: The Radiant Equation**

Srinivasa Ramanujan’s dreams bridged intuition and sacred imagery. He often described seeing a luminous goddess who revealed formulas to him. Whether understood symbolically or spiritually, these dreams demonstrate profound mathematical insight rising from symbolic form. 

In this world, observe how beauty and knowledge intertwine within dream vision.
`
  },

  // --- ENDING (Hidden in Dream 12) ---
  {
    id: 'credits',
    type: 'CREDITS_UNLOCK',
    title: 'The Great Work',
    hiddenInDream: 'the-radiant-equation',
    pageUnlockCondition: 'FIRST_INTERACTION',
    content: `**The Great Work is Complete.**

You have traversed the available realms and gathered the scattered light. The Hexarchia Oneirica begins to mend. 

The power to Scry—to weave new worlds from your own words—is now returning to these pages.

*(End of current demo content)*`
  }
];