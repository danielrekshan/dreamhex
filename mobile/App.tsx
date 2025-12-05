import React, { useState, useEffect } from 'react';
import { StyleSheet, View, StatusBar, Text, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { DreamScene } from './components/DreamScene';
import { BookReader } from './components/BookReader';
import { EntityDialog } from './components/EntityDialog';
import { BOOK_CONTENT, BookPage } from './BookManifest';
import * as api from './api';

// Direct import of your provided JSON content for offline fallback/demo
const DREAM_DATABASE: any = require('./assets/world.json');

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
  const [loading, setLoading] = useState(false);
  const [userId] = useState("user-demo-" + Math.floor(Math.random() * 1000));

  // --- LOAD DREAM ---
  useEffect(() => {
    setLoading(true);
    // Load from local JSON
    setTimeout(() => {
        const dreams = DREAM_DATABASE.dreams || [];
        const found = dreams.find((d: any) => d.slug === currentDreamSlug);
        // Deep copy to ensure we don't mutate the 'require' cache directly
        setDreamData(found ? JSON.parse(JSON.stringify(found)) : dreams[0]);
        setLoading(false);
    }, 500);
  }, [currentDreamSlug]); 

  // --- HANDLERS ---

  const getEntityFrames = (station: any) => {
      // Helper to resolve frames based on stance
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
    // 1. Resolve Text
    const greeting = targetStation.entity_greeting || targetStation.greeting || "The entity stares at you silently.";
    const options = targetStation.interaction_options || ["Observe closely"];
    const description = targetStation.written_description || "";

    // 2. Resolve Frames
    const frames = getEntityFrames(targetStation);

    // 3. Open Dialog
    setActiveEntity({
        name: targetStation.entity_name,
        stationId: targetStation.id,
        description: description,
        greeting: greeting,
        options: options,
        frames: frames
    });
  };

  const handleOptionSelect = async (option: string) => {
    if (!activeEntity || !dreamData) return;

    // 1. Set Loading
    setInteractionLoading(true);

    try {
        // Find the full station object in our local state to send to API
        const currentStation = dreamData.stations.find((s: any) => s.id === activeEntity.stationId);

        // 2. Prepare Context (Summary of the World)
        const worldContext = {
            dream_title: dreamData.title,
            world_description: dreamData.world_state?.written_description || "A mysterious realm.",
            time_of_day: dreamData.world_state?.time || "Unknown",
            other_entities: dreamData.stations
                .filter((s: any) => s.id !== activeEntity.stationId)
                .map((s: any) => ({ 
                    name: s.entity_name, 
                    stance: s.current_stance || "idle" 
                }))
        };

        // 3. Call API with context
        const response = await api.interactEntity(
            userId, 
            currentDreamSlug, 
            activeEntity.stationId, 
            option,
            currentStation, // Pass the specific station data
            worldContext    // Pass the summary of the world
        );

        // 4. Update World State (Local Merge)
        if (response && response.station) {
            
            // Merge the updated station into our local dreamData
            const updatedStations = dreamData.stations.map((s: any) => 
                s.id === response.station.id ? response.station : s
            );

            setDreamData((prev: any) => ({
                ...prev,
                stations: updatedStations
            }));
            
            // 5. Update Dialog with new text
            const newFrames = getEntityFrames(response.station);
            setActiveEntity({
                ...activeEntity,
                greeting: response.station.entity_greeting,
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
    
    // Scarab Logic (Easter Egg)
    if (!foundScarabs.has(activeEntity.stationId)) {
        if (Math.random() > 0.8) { 
            setScarabCount(prev => prev + 1);
            setFoundScarabs(prev => new Set(prev).add(activeEntity.stationId));
        }
    }
  };

  const handleBookAction = (page: BookPage) => {
      if (page.type === 'DREAM_GATE' && page.targetDreamId) {
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