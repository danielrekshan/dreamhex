Here is a draft specification document for a portfolio piece I am writing as part of a job interview process with Dust.systems for a backend and react native development role.  I’d like you to read the specification, ask me questions to clarify the process, then emit a project plan that I will use to build prompts to build the system.

The app is called DreamHex, because it represents dreams as hex tiles, but also explores dream magic in its game motifs.

# Goal

Produce a working react native prototype and backend for an app called DreamHex, which is a graphical text adventure game like Myst that is procedurally generated using LLM and text to image models based on dream reports.  

- React Native app manages gameplay  
- Gameplay involves visualization of dreams involving 360 panoramas with overlaid sprites, producing a billboard effect.  
- Each dream is represented as a single scene, modeled as a hex tile, which each have 7 viewpoints that are interconnected.  
- The world is lazy-loaded such that it generates only what is needed in the moment, which is persisted in a datastore  
- The game story is lightweight and minimal, but enough to establish context.  Dr. John Dee used magic to tie his scrying stone with your phone because he foresaw a great threat of AI that can’t dream, so he’s cast a spell to get dreamers in our generation to teach AI to scry dreams.  
- Users can interact with the world through a chat and it changes the world for all users in a way that is obvious, references history, but also maintains the core elements of the dream

# DreamWorld as Hex Tiles

The idea of the game is that the phone is now a scrying device where you can see the dreamworld.  Each dream is represented as a Graphical Text Adventure like Myst.  The dream world is managed as a grid of hex tiles, each composed of 7 viewpoints (6 corners and 1 center).  Each hex is a major scene from the dream and scenes connect to each other such that you can move from one hex to another by clicking the space (like in myst the cursor changed like a hyperlink).

The stages of the dream are:

* Dream report as single text field from user  
* Analysis into scenes composed of settings, characters, and actions by llm  
* Representation in JSON by llm for persistence in storage  
* Prompts for 360 panorama backgrounds for settings and sprite animations for characters and objects, processed using image to text model in Modal or other service  
* Rendering in React native as graphical text adventure with 360 panorama and billboard style sprite animations for characters

The Central Image (based on ideas from Hartmann) of the dream scene is represented as a character or object sprite animation within the center of the hex.  The user may navigate sequentially to any of the 7 viewpoints.  Each viewpoint represents the world from its perspective, such that from a viewpoint on the circumference of the hex tile on one side you could see the front of the central image, but from a viewpoint on the other side of the hex, you would see the back of the central image.

# Navigation of Dream World as Central Game Feature

The core interaction of the game is the navigation and engagement with the dream world. 

At first, a dream will be represented by only one hex and central image.  In future enhancements, a dream may be represented by several hexes that are connected by the viewpoints along their adjacency.  The image prompts for their 360 backgrounds should reference each other such that the central image of one hex is visible in the background of the adjacent hex.  

The user has a list of dreams that they have created or they have visited.  A user submitted dream may be public or private.  There will be several dozen seed dreams from various sources.  

A user may teleport from one dream to another by issuing a command to a setting, character, or object to shift the dream, which would cause the system to find a similar dream, character, or object and teleport the user to that new dream.  They could teleport back through the way they came or continue to another dream through a different portal.  There are 1-3 portals in each dream that they must discover through interaction with the dream world.

A user on a phone may move their phone to shift the view of the 360 panorama, while a web user drags the world around.  Click or tap on an entity brings up an interaction with them via chat.  Click or tap on a symbol for the adjacent tile will bring you to that tile. 

## Game World Metaphor

The game imagines that Dr. John Dee used a magic spell to unite his scrying stone with your phone.  The dream worlds are actually pages in his notebooks, which is why everything appears in ink and watercolor style.  He enlists the user’s help to describe and explore dreams in order to teach a future AI how to dream, which is essential to avoid an AI apocalypse that he saw as an end-time prophetic vision dream that caused Dee to do the magic to enlist you. 

During the magic spell that tied the phone to the scrying mirror, his mirror became shattered in the dreamworld.  He needs you to find the pieces and put them together. The basic quest is to find 7 golden scarabs that represent the 7 shards of the shattered mirror.  

The dreamworld is composed of 49 dreams, which are 7 x 7 dreams.  The idea is that there will be 7 types of dreams represented (normal, lucid, nightmare, exotic, visitation, etc).  The player must enter a dream of that type to gain access to the 7 dreams in that series.  Dee prompts the character to share a dream of that type, then the world is generated.  In each dream, there’s 1-3 portals to other dreams, which remain the same throughout the game.  The play must learn to navigate the dream world, exploring each element to discover a portal.

Of the 7 viewpoints, one will be closest to the stitch in the 360 panorama.  This is where the play starts (with the stitch to the player’s back).  If the player clicks or taps on the stitch, it opens up as if there is a rift in spacetime and they have the option to portal into the foundations of space and time.  Many golden scarabs come out of the rift the first time they open it.  There are two beings in the rift who speculate on the nature of creativity and dreaming.  They acknowledge that they sent me a dream when i was 15 about portaling around the dream world that felt so real it compelled me to explore dreaming all my life.

If the user in in a viewpoint where an entity is, then the other objects or characters respond to the user as if they are that character/object.  The user always starts at the stitch point and that is always empty.

## Character and Object Interactions

The dream analysis system determines major characters and objects, and their actions, for each dream scene.  There are 1-7 characters and objects.  They inhabit a viewpoint of the hex.  When you are adjacent to the character’s viewpoint, you may click on the entity and interact with it through a chat prompt.  For example, when you are on the center view point, you may interact with all other entities in the hex, but if you are in the corner, you can only interact with the two next to you and the center.  

Entities actions are rendered as GIF or sprite animations.  The chat commands changes the behavior of entity.  Each entity has a base action, which is determined by the dream.  They have a current state, determined by the LLM in response to user interaction, which is active for a few visits or minutes.

The user can issue commands via chat.  The system responds by generating new images or sprites, but does not respond in text (it is not a chat game). 

# Just in time procedural generation as dream metaphor

The system should generate images only when needed, based upon a JSON representation of the dream.  The api should call LLMs that describe the world from all the viewpoints, but the asset is generated from the prompt only when the user steps into the viewpoint.  The generated images should be saved and served to return users.  

The LLM should accurately describe spatial relations of the setting and the characters/objects in the 360 panorama image prompts.  For example, a dream hex may have an owl in the top right viewpoint, a well in the next one, and a tree in the next.  The final images should always output an owl next to a well next to a tree, but the exact representations can shift.

## Persistent and current states of dream world

Each dreamworld has a persistent and current state.  The persistent state is what came from the dream.  The current state represents the interaction of the user and the dream.  For example, if a dream had a dog and I petted it, the animation would wag a tail.  After a few minutes, the animation would revert to its original state. 

# Components

The system needs to be composed of a React Native App that can run on any iOS, android, or web and an API that can be served from a free tier cloud service or low cost.  The scope section discusses the specific needs of the app.

## React Native App

* Introduces game idea  
* Prompts user for dream  
* Communicates dream to API  
* Receives JSON and assets from API  
* Renders in 360 panoramas and sprite animations  
* Pans view when phone moves as a magic window  
* User can move from viewpoint to viewpoint by clicking that area in the world  
* User can open command prompt to interact with character sprites, which are managed through the API  
* UX involves: new dream, list of dreams, dream world, and intro/conclusion scenes

## Backend

* Receives dreams  
* Analyzes the dream into central images  
* Generates JSON hexes that include image prompts for 7 360 panoramas and sprite animations for the entities  
* Receives chat prompt interactions between user and entities/settings, which change the prompts  
* Generates images from the prompt (possibly a different api than the dream-to-json?)  
* Returns JSON to the react native app, with links to the new images

# Scope

This project is designed to be a portfolio project that demonstrates my capacity to code a) backend, b) ai, and c) react native.  It is intended to be shared via a link to be downloaded on a phone or explored on the web, with data saved to the cloud associated with device\_id (no authentication). 

I would like to use a cheap LLM api for json world building and a Modal process for the image generation (or something similar).  I intend for only about 7 people to use it who each may enter 7 dreams.  I want to rate limit it and handle it after each device reaches their limit.  The first 10 devices to generate dreams are allowed to, otherwise you can just explore the world, but not interact with it or generate dreams.  

* Complete specification document  
  * Game lore  
  * JSON schema  
* Protoype in colab  
  * Analyze dream  
  * Produce one 360 image  
  * Produce 7 related 360 images  
  * Produce character animations  
  * Repackage as API or Modal  
* App MVP  
  * Visualize 360  
  * Place characters  
  * Navigate viewpoints  
* Game features development  
  * Character interaction  
  * Dream notebook  
  * Finding golden scarab quest  
  * Going through the stitch pathway