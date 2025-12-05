import React, { useState, useEffect } from 'react';
import { StyleSheet, View, StatusBar, Text, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { DreamScene } from './components/DreamScene';
import { BookReader } from './components/BookReader';
import { EntityDialog } from './components/EntityDialog';
import { BOOK_CONTENT, BookPage } from './BookManifest';
import * as api from './api';

// Direct import of your provided JSON content for offline fallback/demo
const DREAM_DATABASE: any = require('./assets/world.json');

const SESSION_KEY = 'dreamhex_session_v1';

export default function App() {
  // --- STATE ---
  const [currentDreamSlug, setCurrentDreamSlug] = useState('between-thought-and-waking-light'); 
  const [dreamData, setDreamData] = useState<any>(null);
  
  // NEW TRANSITION STATES
  const [isExiting, setIsExiting] = useState(false);
  const [nextDreamSlug, setNextDreamSlug] = useState<string | null>(null);
  
  // UI States
  const [isBookOpen, setBookOpen] = useState(false); // Default to closed so we see the 3D book first
  const [bookPageIndex, setBookPageIndex] = useState(0); // LIFTED STATE
  
  const [activeEntity, setActiveEntity] = useState<any>(null);
  const [interactionLoading, setInteractionLoading] = useState(false);
  
  // Game States
  const [scarabCount, setScarabCount] = useState(0);
  const [foundScarabs, setFoundScarabs] = useState<Set<string>>(new Set());
  const [interactionHistory, setInteractionHistory] = useState<string[]>([]); 
  
  const [loading, setLoading] = useState(false);
  const [userId] = useState("user-demo-" + Math.floor(Math.random() * 1000));

  // Helper to get current page text for the 3D model
  const currentBookPage = BOOK_CONTENT[bookPageIndex];
  const currentBookText = currentBookPage ? currentBookPage.content : "";

  // --- INITIAL LOAD (PERSISTENCE) ---
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
                setCurrentDreamSlug(parsed.slug || 'between-thought-and-waking-light');
            } else {
                loadFromJSON('between-thought-and-waking-light');
            }
        } catch (e) {
            console.warn("Failed to load session", e);
            loadFromJSON('between-thought-and-waking-light');
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
              slug: currentDreamSlug
          };
          AsyncStorage.setItem(SESSION_KEY, JSON.stringify(session)).catch(e => console.warn("Save failed", e));
      }
  }, [dreamData, interactionHistory, currentDreamSlug]);


  // NEW HANDLER: Called by DreamScene when the exit animation is complete
  const handleExitAnimationComplete = () => {
    if (nextDreamSlug) {
        // 1. Load the new dream's data
        loadFromJSON(nextDreamSlug);
        // 2. Set the new current slug (triggers DreamScene remount/entrance animation)
        setCurrentDreamSlug(nextDreamSlug); 
        // 3. Reset the transition states
        setIsExiting(false);
        setNextDreamSlug(null);
    }
  };


  // --- HANDLERS ---

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

  const handleInteractStation = (targetStation: any) => {
    const greeting = targetStation.entity_greeting || targetStation.greeting || "The entity stares at you silently.";
    const options = targetStation.interaction_options || ["Observe closely"];
    const description = targetStation.written_description || "";
    const monologue = targetStation.entity_monologue || "";

    const frames = getEntityFrames(targetStation);

    setActiveEntity({
        name: targetStation.entity_name,
        stationId: targetStation.id,
        description: description,
        greeting: greeting,
        monologue: monologue,
        options: options,
        frames: frames
    });
  };

  const handleOptionSelect = async (option: string) => {
    if (!activeEntity || !dreamData) return;

    setInteractionLoading(true);

    try {
        const currentStation = dreamData.stations.find((s: any) => s.id === activeEntity.stationId);
        const historyStr = interactionHistory.slice(-5).join("\n"); 

        const worldContext = {
            dream_title: dreamData.title,
            world_description: dreamData.world_state?.written_description || "A mysterious realm.",
            time_of_day: dreamData.world_state?.time || "Unknown",
            interaction_history: historyStr,
            other_entities: dreamData.stations
                .filter((s: any) => s.id !== activeEntity.stationId)
                .map((s: any) => ({ 
                    name: s.entity_name, 
                    stance: s.current_stance || "idle" 
                }))
        };

        const response = await api.interactEntity(
            userId, 
            currentDreamSlug, 
            activeEntity.stationId, 
            option,
            currentStation, 
            worldContext    
        );

        if (response) {
            if (response.station) {
                const newLog = `User: ${option} -> Entity (${response.station.entity_name}): ${response.station.entity_greeting}`;
                setInteractionHistory(prev => [...prev, newLog]);
            }

            // This state update triggers a re-render of DreamScene, but because 
            // isExiting is false, the animation sequence will not re-run.
            setDreamData((prev: any) => {
                const newState = { ...prev };
                if (response.station) {
                     newState.stations = prev.stations.map((s: any) => 
                        s.id === response.station.id ? response.station : s
                    );
                }
                if (response.world_state) {
                    newState.world_state = response.world_state;
                }
                return newState;
            });
            
            if (response.station) {
                const newFrames = getEntityFrames(response.station);
                setActiveEntity({
                    ...activeEntity,
                    greeting: response.station.entity_greeting,
                    monologue: response.station.entity_monologue,
                    options: response.station.interaction_options,
                    frames: newFrames 
                });
            }
        }

    } catch (e) {
        Alert.alert("Connection Error", "The dream resists your touch. (API Error)");
        console.error(e);
    } finally {
        setInteractionLoading(false);
    }
  };

  const handleBookAction = (page: BookPage) => {
      if (page.type === 'DREAM_GATE' && page.targetDreamId) {
          // Check if we are already exiting or transitioning to prevent double-trigger
          if (isExiting || nextDreamSlug) return;

          // 1. Set the target slug
          setNextDreamSlug(page.targetDreamId); 
          // 2. Trigger the exit animation
          setIsExiting(true); 
          // 3. Close the BookReader UI immediately
          setBookOpen(false); 
      } else if (page.type === 'CREDITS_UNLOCK') {
          Alert.alert("The End", "You have restored the Hexarchia Oneirica.");
      }
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
                isExiting={isExiting} // Controls exit animation
                onExitAnimationComplete={handleExitAnimationComplete} // Controls state change
            />
        )}

        <BookReader 
            visible={isBookOpen}
            onClose={() => setBookOpen(false)}
            pages={BOOK_CONTENT}
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
                frames={activeEntity.frames}
                isLoading={interactionLoading}
                onSelectOption={handleOptionSelect}
                onClose={() => setActiveEntity(null)}
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