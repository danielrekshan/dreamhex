import React, { useState, useEffect, useMemo } from 'react';
import { StyleSheet, View, StatusBar, Text, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { DreamScene } from './components/DreamScene';
import { BookReader } from './components/BookReader';
import { EntityDialog } from './components/EntityDialog';
import { MusicPlayer } from './components/MusicPlayer'; 
import { BOOK_CONTENT, BookPage, UnlockConditionType } from './BookManifest';
import * as api from './api';

const DREAM_DATABASE: any = require('./assets/world.json');
const SESSION_KEY = 'dreamhex_session_v2'; 

// Type for Dream Progress Tracking
type DreamProgress = {
    [key: string]: {
        centralOpenCount: number;
        stationsVisited: Set<string>;
        interactedCount: number;
        scarabFound: boolean; // NEW: Track if scarab for this dream is found
    }
};

export default function App() {
  const [currentDreamSlug, setCurrentDreamSlug] = useState('floating-in-thought');
  const [dreamData, setDreamData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  
  // Transition States
  const [isExiting, setIsExiting] = useState(false); 
  const [nextDreamSlug, setNextDreamSlug] = useState<string | null>(null);
  
  // Book & Page Logic
  const [isBookOpen, setBookOpen] = useState(false);
  const [bookPageIndex, setBookPageIndex] = useState(0); 
  const [unlockedPageIds, setUnlockedPageIds] = useState<string[]>(['intro_1', 'intro_2', 'intro_3', 'intro_4', 'gate_john_dee']);
  const [foundPageNotification, setFoundPageNotification] = useState<BookPage | null>(null);

  // Interaction State
  const [activeEntity, setActiveEntity] = useState<any>(null);
  const [interactionLoading, setInteractionLoading] = useState(false);
  const [userId] = useState("user-demo-" + Math.floor(Math.random() * 1000));
  const [interactionHistory, setInteractionHistory] = useState<string[]>([]); 

  // Dream Progress Tracking
  const [dreamProgress, setDreamProgress] = useState<DreamProgress>({});

  // Scarab logic derived from dreamProgress
  const scarabCount = useMemo(() => {
    return Object.values(dreamProgress).filter(p => p.scarabFound).length;
  }, [dreamProgress]);

  // --- DERIVED STATE (Book Content) ---
  const availablePages = useMemo(() => {
    // Filter pages that are unlocked 
    const pages = BOOK_CONTENT.filter(p => unlockedPageIds.includes(p.id));
    
    // Dynamically include the credits page if its immediate predecessor is present, 
    // to allow user to reach the end.
    const creditsPage = BOOK_CONTENT.find(p => p.id === 'credits');
    if (creditsPage && !unlockedPageIds.includes('credits') && pages.length === BOOK_CONTENT.length - 1) { 
         return [...pages, creditsPage];
    }
    
    return pages;

  }, [unlockedPageIds]);
  
  const currentLeftPage = availablePages[bookPageIndex] || { content: " " };
  const currentRightPage = availablePages[bookPageIndex + 1] || { content: " " };
  const currentBookText = `${currentLeftPage.content} ${currentRightPage.content}`;

  // --- PERSISTENCE ---
  useEffect(() => {
    const loadSession = async () => {
        setLoading(true);
        try {
            const savedState = await AsyncStorage.getItem(SESSION_KEY);
            if (savedState) {
                const parsed = JSON.parse(savedState);
                setDreamData(parsed.dreamData);
                setCurrentDreamSlug(parsed.slug || 'floating-in-thought');
                setUnlockedPageIds(parsed.unlockedPageIds || ['intro_1', 'intro_2', 'intro_3', 'intro_4', 'gate_john_dee']);
                
                // Re-hydrate Sets
                const loadedProgress = parsed.dreamProgress ? Object.entries(parsed.dreamProgress).reduce((acc, [key, val]: any) => {
                    acc[key] = { ...val, stationsVisited: new Set(val.stationsVisited) };
                    return acc;
                }, {} as DreamProgress) : {};
                
                setDreamProgress(loadedProgress);
            } else {
                loadFromJSON(currentDreamSlug);
            }
        } catch (e) {
            console.warn("Failed to load session", e);
            loadFromJSON(currentDreamSlug);
        } finally {
            setLoading(false);
        }
    };
    loadSession();
  }, []);

  useEffect(() => {
      if (dreamData) {
          const session = {
              dreamData,
              // Convert Set back to Array for serialization
              dreamProgress: Object.entries(dreamProgress).reduce((acc, [key, val]) => {
                  acc[key] = { 
                      ...val, 
                      stationsVisited: Array.from(val.stationsVisited),
                      scarabFound: val.scarabFound || false 
                  };
                  return acc;
              }, {} as any),
              slug: currentDreamSlug,
              unlockedPageIds,
              history: interactionHistory,
          };
          AsyncStorage.setItem(SESSION_KEY, JSON.stringify(session)).catch(e => console.warn("Save failed", e));
      }
  }, [dreamData, interactionHistory, currentDreamSlug, unlockedPageIds, dreamProgress]);

  const loadFromJSON = (slug: string) => {
      const dreams = DREAM_DATABASE.dreams || [];
      const found = dreams.find((d: any) => d.slug === slug);
      setDreamData(found ? JSON.parse(JSON.stringify(found)) : dreams[0]);
  };
  
  // --- SCARAB LOGIC (Hard Criteria) ---

  const checkScarabCondition = (slug: string, progress: DreamProgress[string], currentDreamStations: any[]) => {
      // Find the page whose scarabCondition applies to the CURRENT dream slug
      const pageToUnlockScarab = BOOK_CONTENT.find(p => p.hiddenInDream === slug);
      
      if (!pageToUnlockScarab || progress.scarabFound || !pageToUnlockScarab.scarabCondition) return; 

      let conditionMet = false;
      switch (pageToUnlockScarab.scarabCondition as Exclude<UnlockConditionType, 'FIRST_INTERACTION'>) {
          case 'OPEN_CENTRAL_2X':
              if (progress.centralOpenCount >= 2) conditionMet = true;
              break;
          case 'VISIT_ALL_STATIONS':
              const totalStations = currentDreamStations.length;
              if (progress.stationsVisited.size >= totalStations) conditionMet = true;
              break;
          case 'INTERACT_ONCE':
              if (progress.interactedCount >= 1) conditionMet = true;
              break;
          default:
              break;
      }

      if (conditionMet) {
          setDreamProgress(prev => {
              const current = prev[slug];
              if (current && !current.scarabFound) {
                  Alert.alert("Golden Scarab Found!", `You have earned a Golden Scarab for completing the challenge in the ${dreamData?.title} dream.`);
                  return { ...prev, [slug]: { ...current, scarabFound: true } };
              }
              return prev;
          });
      }
  };

  // --- PAGE UNLOCK LOGIC (Easy Criteria) ---

  const checkPageUnlock = (currentSlug: string) => {
      // Find the NEXT page that is hidden in the current dream
      const nextPage = BOOK_CONTENT.find(p => p.hiddenInDream === currentSlug);

      if (nextPage && 
          nextPage.pageUnlockCondition === 'FIRST_INTERACTION' &&
          !unlockedPageIds.includes(nextPage.id)
      ) {
          setUnlockedPageIds(prev => {
              if (!prev.includes(nextPage.id)) {
                  setFoundPageNotification(nextPage);
                  return [...prev, nextPage.id];
              }
              return prev;
          });
      }
  }


  const updateProgress = (type: 'CENTRAL_OPEN' | 'VISIT_STATION' | 'INTERACT', stationId?: string) => {
      setDreamProgress(prev => {
          const existingProgress = prev[currentDreamSlug];
          
          // Safely initialize or re-hydrate state properties
          const current = {
              centralOpenCount: existingProgress?.centralOpenCount || 0,
              stationsVisited: existingProgress?.stationsVisited || new Set(),
              interactedCount: existingProgress?.interactedCount || 0,
              scarabFound: existingProgress?.scarabFound || false,
          };
          
          if (type === 'CENTRAL_OPEN') {
              current.centralOpenCount += 1;
          }
          if (type === 'VISIT_STATION' && stationId) {
              current.stationsVisited.add(stationId); 
          }
          if (type === 'INTERACT') {
              current.interactedCount += 1;
          }

          // Create a new object and Set to ensure state updates correctly
          const newProgress = { 
              ...current,
              stationsVisited: new Set(current.stationsVisited),
          };
          const newState = { ...prev, [currentDreamSlug]: newProgress };
          
          // Check for scarab unlock on every progress update
          checkScarabCondition(currentDreamSlug, newProgress, dreamData?.stations || []);
          
          return newState;
      });
  };

  // --- HANDLERS ---
  const handleInteractStation = (targetStation: any) => {
    // 1. Page Unlock Logic (occurs on first dialogue open of any entity in the current dream)
    if (!activeEntity) { 
        checkPageUnlock(currentDreamSlug); 
    }

    // 2. Scarab Progress Tracking
    updateProgress('VISIT_STATION', targetStation.id);
    if (targetStation.position_index === 0) {
        updateProgress('CENTRAL_OPEN');
    }

    // 3. Open Dialog
    let frames = getEntityFrames(targetStation);

    setActiveEntity({
        name: targetStation.entity_name,
        stationId: targetStation.id,
        description: targetStation.written_description,
        greeting: targetStation.entity_greeting || targetStation.greeting,
        monologue: targetStation.entity_monologue || "",
        options: targetStation.interaction_options || ["Observe closely"],
        frames: frames
    });
  };

  const handleOptionSelect = async (option: string) => {
    updateProgress('INTERACT');
    
    if (!activeEntity || !dreamData) return;
    setInteractionLoading(true);

    try {
        // --- MOCK API RESPONSE for demo ---
        setTimeout(() => {
             setInteractionLoading(false);
             setActiveEntity(prev => ({
                 ...prev,
                 greeting: `The entity responded to your inquiry: "${option}".`,
                 monologue: "The threads of the dream shift slightly.",
                 options: ["Ask something else"]
             }));
        }, 1000);

    } catch (e) {
        Alert.alert("Connection Error", "The dream resists your touch. (API Error)");
        setInteractionLoading(false);
    }
  };

  const handleBookAction = (page: BookPage) => {
      if (page.type === 'DREAM_GATE' && page.targetDreamId) {
          if (isExiting || nextDreamSlug) return;
          setNextDreamSlug(page.targetDreamId); 
          setIsExiting(true); 
          setBookOpen(false); 
      } else if (page.type === 'CREDITS_UNLOCK') {
           if (page.requiredScarabs && scarabCount >= page.requiredScarabs) {
               Alert.alert("The Great Work", "You have finished the current content!");
           } else {
               Alert.alert("Insufficient Scarabs", `You need ${page.requiredScarabs} Golden Scarabs to unlock The Great Work. You currently have ${scarabCount}.`);
           }
      }
  };

  const handleExitAnimationComplete = () => {
    if (nextDreamSlug) {
        loadFromJSON(nextDreamSlug);
        setCurrentDreamSlug(nextDreamSlug); 
        setIsExiting(false);
        setNextDreamSlug(null);
        setFoundPageNotification(null);
        
        const gateIndex = availablePages.findIndex(p => p.targetDreamId === nextDreamSlug);
        if (gateIndex !== -1) {
             setBookPageIndex(gateIndex);
        } else {
             setBookPageIndex(0);
        }
    }
  };
  
  const getEntityFrames = (station: any) => {
      if (station.generated_assets) {
          const stance = station.current_stance || 'idle';
          if (station.generated_assets[stance]) return station.generated_assets[stance].file_paths;
          if (station.generated_assets['idle']) return station.generated_assets['idle'].file_paths;
          const k = Object.keys(station.generated_assets)[0];
          return k ? station.generated_assets[k].file_paths : [];
      }
      return station.sprite_frames || [];
  };

  return (
    <SafeAreaProvider>
      <View style={styles.container}>
        <StatusBar hidden />
        
        {loading || (!dreamData && !isExiting) ? ( 
             <View style={styles.center}>
                 <ActivityIndicator size="large" color="#d7ccc8" />
                 <Text style={{color: '#d7ccc8', marginTop: 10}}>Entering Dream...</Text>
             </View>
        ) : (
            <DreamScene 
                key={currentDreamSlug} 
                dreamData={dreamData}
                bookText={currentBookText} 
                onOpenBook={() => setBookOpen(true)}
                onInteractStation={handleInteractStation}
                isExiting={isExiting} 
                onExitAnimationComplete={handleExitAnimationComplete} 
            />
        )}

        <MusicPlayer currentDreamSlug={currentDreamSlug} isExiting={isExiting} />
        
        {/* Scarab counter is now ONLY managed by the BookReader component */}
        

        <BookReader 
            visible={isBookOpen}
            onClose={() => setBookOpen(false)}
            pages={availablePages}
            pageIndex={bookPageIndex}       
            setPageIndex={setBookPageIndex} 
            onAction={handleBookAction}
            scarabCount={scarabCount}
        />

        {activeEntity && (
            <EntityDialog 
                visible={!!activeEntity}
                entityName={activeEntity.name}
                description={activeEntity.description}
                greeting={activeEntity.greeting}
                monologue={activeEntity.monologue}
                options={activeEntity.options}
                frames={getEntityFrames(dreamData.stations.find((s: any) => s.id === activeEntity.stationId))} 
                isLoading={interactionLoading}
                onSelectOption={handleOptionSelect}
                onClose={() => {
                    setActiveEntity(null);
                    setFoundPageNotification(null); 
                }}
                foundPage={foundPageNotification} 
            />
        )}
        
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});