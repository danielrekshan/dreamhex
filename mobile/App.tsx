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
  
  // UI States
  const [isBookOpen, setBookOpen] = useState(true);
  const [activeEntity, setActiveEntity] = useState<any>(null);
  const [interactionLoading, setInteractionLoading] = useState(false);
  
  // Game States
  const [scarabCount, setScarabCount] = useState(0);
  const [foundScarabs, setFoundScarabs] = useState<Set<string>>(new Set());
  const [interactionHistory, setInteractionHistory] = useState<string[]>([]); // New: Track History
  
  const [loading, setLoading] = useState(false);
  const [userId] = useState("user-demo-" + Math.floor(Math.random() * 1000));

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
                // Fallback to JSON default
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

  // --- SAVE SESSION (PERSISTENCE) ---
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

        // Build History String
        const historyStr = interactionHistory.slice(-5).join("\n"); // Last 5 interactions

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

        if (response && response.station) {
            
            // Log History
            const newLog = `User: ${option} -> Entity (${response.station.entity_name}): ${response.station.entity_greeting}`;
            setInteractionHistory(prev => [...prev, newLog]);

            // Update State
            const updatedStations = dreamData.stations.map((s: any) => 
                s.id === response.station.id ? response.station : s
            );

            setDreamData((prev: any) => ({
                ...prev,
                stations: updatedStations
            }));
            
            const newFrames = getEntityFrames(response.station);
            setActiveEntity({
                ...activeEntity,
                greeting: response.station.entity_greeting,
                monologue: response.station.entity_monologue,
                options: response.station.interaction_options,
                frames: newFrames 
            });
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
          // Switching dreams resets the view but maybe we keep history? 
          // For now, load new JSON data for the new dream
          loadFromJSON(page.targetDreamId);
          setCurrentDreamSlug(page.targetDreamId); 
          setBookOpen(false);
      } else if (page.type === 'CREDITS_UNLOCK') {
          Alert.alert("The End", "You have restored the Hexarchia Oneirica.");
      }
  };

  return (
    <SafeAreaProvider>
      <View style={styles.container}>
        <StatusBar hidden />
        
        {loading || !dreamData ? (
             <View style={styles.center}>
                 <ActivityIndicator size="large" color="#d7ccc8" />
                 <Text style={{color: '#d7ccc8', marginTop: 10}}>Entering Dream...</Text>
             </View>
        ) : (
            <DreamScene 
                key={currentDreamSlug} 
                dreamData={dreamData}
                onOpenBook={() => setBookOpen(true)}
                onInteractStation={handleInteractStation}
            />
        )}

        <BookReader 
            visible={isBookOpen}
            onClose={() => setBookOpen(false)}
            pages={BOOK_CONTENT}
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
