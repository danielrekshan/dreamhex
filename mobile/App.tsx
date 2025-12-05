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
const SESSION_KEY = 'dreamhex_session_v2'; // Changed key to avoid conflict with old state

// Type for Dream Progress Tracking
type DreamProgress = {
    [key: string]: {
        centralOpenCount: number;
        stationsVisited: Set<string>;
        interactedCount: number;
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
  // Default pages unlocked: Intro pages + 1st Gate
  const [unlockedPageIds, setUnlockedPageIds] = useState<string[]>(['intro_1', 'intro_2', 'intro_3', 'intro_4', 'gate_john_dee']);
  const [foundPageNotification, setFoundPageNotification] = useState<BookPage | null>(null);

  // Interaction State
  const [activeEntity, setActiveEntity] = useState<any>(null);
  const [interactionLoading, setInteractionLoading] = useState(false);
  const [userId] = useState("user-demo-" + Math.floor(Math.random() * 1000));
  const [interactionHistory, setInteractionHistory] = useState<string[]>([]); 

  // Dream Progress Tracking (for Unlock Conditions)
  const [dreamProgress, setDreamProgress] = useState<DreamProgress>({});

  // --- DERIVED STATE ---
  const availablePages = useMemo(() => {
    return BOOK_CONTENT.filter(p => unlockedPageIds.includes(p.id));
  }, [unlockedPageIds]);
  
  const currentLeftPage = availablePages[bookPageIndex] || { content: " " };
  const currentRightPage = availablePages[bookPageIndex + 1] || { content: " " };

  // Combine text for backwards compatibility with DreamScene logic structure
  const currentBookText = `${currentLeftPage.content} ${currentRightPage.content}`;


  // --- INITIAL LOAD ---
  useEffect(() => {
    const loadSession = async () => {
        setLoading(true);
        try {
            const savedState = await AsyncStorage.getItem(SESSION_KEY);
            if (savedState) {
                const parsed = JSON.parse(savedState);
                console.log("Loaded session from storage");
                setDreamData(parsed.dreamData);
                setInteractionHistory(parsed.history || []);
                setCurrentDreamSlug(parsed.slug || 'floating-in-thought');
                setUnlockedPageIds(parsed.unlockedPageIds || ['intro_1', 'intro_2', 'intro_3', 'intro_4', 'gate_john_dee']);
                
                // CRITICAL FIX: Ensure stationsVisited is re-hydrated as a Set
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

  const loadFromJSON = (slug: string) => {
      const dreams = DREAM_DATABASE.dreams || [];
      const found = dreams.find((d: any) => d.slug === slug);
      setDreamData(found ? JSON.parse(JSON.stringify(found)) : dreams[0]);
  };

  // --- SAVE SESSION ---
  useEffect(() => {
      if (dreamData) {
          const session = {
              dreamData,
              history: interactionHistory,
              slug: currentDreamSlug,
              unlockedPageIds,
              // Convert Set back to Array for serialization
              dreamProgress: Object.entries(dreamProgress).reduce((acc, [key, val]) => {
                  acc[key] = { ...val, stationsVisited: Array.from(val.stationsVisited) };
                  return acc;
              }, {} as any)
          };
          AsyncStorage.setItem(SESSION_KEY, JSON.stringify(session)).catch(e => console.warn("Save failed", e));
      }
  }, [dreamData, interactionHistory, currentDreamSlug, unlockedPageIds, dreamProgress]);

  // --- PROGRESS AND UNLOCK LOGIC ---

  const checkUnlockCondition = (slug: string, progress: DreamProgress[string], currentDreamStations: any[]) => {
      const hiddenPage = BOOK_CONTENT.find(p => p.hiddenInDream === slug);
      if (!hiddenPage || unlockedPageIds.includes(hiddenPage.id)) return;
      
      let conditionMet = false;
      switch (hiddenPage.condition as UnlockConditionType) {
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
          case 'ENTER_OTHER_INTERACTION':
              if (progress.interactedCount > 0) conditionMet = true; 
              break;
          default:
              break;
      }

      if (conditionMet) {
          setUnlockedPageIds(prev => {
              if (!prev.includes(hiddenPage.id)) {
                  setFoundPageNotification(hiddenPage);
                  return [...prev, hiddenPage.id];
              }
              return prev;
          });
      }
  };

  const updateProgress = (type: 'CENTRAL_OPEN' | 'VISIT_STATION' | 'INTERACT', stationId?: string) => {
      setDreamProgress(prev => {
          // FIX: Ensure 'stationsVisited' is always initialized as a Set for safe mutation.
          const existingProgress = prev[currentDreamSlug];
          const current = {
              centralOpenCount: existingProgress?.centralOpenCount || 0,
              stationsVisited: existingProgress?.stationsVisited || new Set(),
              interactedCount: existingProgress?.interactedCount || 0,
          };
          
          if (type === 'CENTRAL_OPEN') {
              current.centralOpenCount += 1;
          }
          if (type === 'VISIT_STATION' && stationId) {
              current.stationsVisited.add(stationId); // .add() is now safe to call
          }
          if (type === 'INTERACT') {
              current.interactedCount += 1;
          }

          // Must create a new Set here so React detects the state change
          const newProgress = { 
              centralOpenCount: current.centralOpenCount,
              stationsVisited: new Set(current.stationsVisited),
              interactedCount: current.interactedCount
          };
          const newState = { ...prev, [currentDreamSlug]: newProgress };
          
          checkUnlockCondition(currentDreamSlug, newProgress, dreamData?.stations || []);
          
          return newState;
      });
  };

  // --- HANDLERS ---
  const handleInteractStation = (targetStation: any) => {
    updateProgress('VISIT_STATION', targetStation.id);
    
    // Central station is always position_index 0 in the array
    if (targetStation.position_index === 0) {
        updateProgress('CENTRAL_OPEN');
    }

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
                 monologue: "The truth still eludes you, but the threads of the dream shift slightly.",
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
          Alert.alert("The Great Work", "You have finished the current content!");
      }
  };

  const handleExitAnimationComplete = () => {
    if (nextDreamSlug) {
        loadFromJSON(nextDreamSlug);
        setCurrentDreamSlug(nextDreamSlug); 
        setIsExiting(false);
        setNextDreamSlug(null);
        setFoundPageNotification(null);
        // Reset reader index to show the first page of the new manifest state
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
                // Now passes concatenated text, which DreamScene splits for left/right
                bookText={currentBookText} 
                onOpenBook={() => setBookOpen(true)}
                onInteractStation={handleInteractStation}
                isExiting={isExiting} 
                onExitAnimationComplete={handleExitAnimationComplete} 
            />
        )}

        <MusicPlayer currentDreamSlug={currentDreamSlug} isExiting={isExiting} />

        <BookReader 
            visible={isBookOpen}
            onClose={() => setBookOpen(false)}
            pages={availablePages}
            pageIndex={bookPageIndex}       
            setPageIndex={setBookPageIndex} 
            onAction={handleBookAction}
            scarabCount={0}
        />

        {activeEntity && (
            <EntityDialog 
                visible={!!activeEntity}
                entityName={activeEntity.name}
                description={activeEntity.description}
                greeting={activeEntity.greeting}
                monologue={activeEntity.monologue}
                options={activeEntity.options}
                // Ensure we get frames from the latest dreamData, not the entity cache
                frames={getEntityFrames(dreamData.stations.find((s: any) => s.id === activeEntity.stationId))} 
                isLoading={interactionLoading}
                onSelectOption={handleOptionSelect}
                onClose={() => {
                    setActiveEntity(null);
                    setFoundPageNotification(null); // Clear notification on close
                }}
                foundPage={foundPageNotification} // Pass notification
            />
        )}
        
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' }
});