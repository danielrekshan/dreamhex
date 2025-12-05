import React, { useState, useEffect } from 'react';
import { StyleSheet, View, StatusBar, Text, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { DreamScene } from './components/DreamScene';
import { BookReader } from './components/BookReader';
import { EntityDialog } from './components/EntityDialog';
import { BOOK_CONTENT, BookPage } from './BookManifest';

// Direct import of your provided JSON content
const DREAM_DATABASE: any = require('./assets/world.json');

export default function App() {
  // --- STATE ---
  const [currentDreamSlug, setCurrentDreamSlug] = useState('between-thought-and-waking-light'); // Start on Dee's dream
  const [dreamData, setDreamData] = useState<any>(null);
  
  // UI States
  const [isBookOpen, setBookOpen] = useState(true);
  const [activeEntity, setActiveEntity] = useState<any>(null);
  
  // Game States
  const [scarabCount, setScarabCount] = useState(0);
  const [foundScarabs, setFoundScarabs] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  // --- LOAD DREAM: Watches currentDreamSlug and updates dreamData ---
  useEffect(() => {
    setLoading(true);
    // Simulate async load
    setTimeout(() => {
        const dreams = DREAM_DATABASE.dreams || [];
        const found = dreams.find((d: any) => d.slug === currentDreamSlug);
        setDreamData(found || dreams[0]);
        setLoading(false);
    }, 500);
  }, [currentDreamSlug]); // Reruns whenever slug changes

  // --- HANDLERS ---

  const handleInteractStation = (targetStation: any) => {
    // 1. Get Relationship Logic
    const playerStationId = dreamData?.stations.find((s: any) => s.is_player)?.id;
    const rel = targetStation.relationships?.find((r: any) => r.target_id === playerStationId) 
             || targetStation.relationships?.[0];

    // 2. Extract Frames for Dialog Animation
    const assetKeys = Object.keys(targetStation.generated_assets || {});
    const firstKey = assetKeys[0];
    const frames = firstKey ? targetStation.generated_assets[firstKey].file_paths : [];

    // 3. Open Dialog
    setActiveEntity({
        name: targetStation.entity_name,
        stationId: targetStation.id,
        greeting: rel?.greeting_dialogue || "The entity stares at you silently.",
        options: rel?.interaction_options || ["Observe closely"],
        frames: frames
    });
  };

  const handleOptionSelect = (option: string) => {
    if (!activeEntity) return;
    
    if (!foundScarabs.has(activeEntity.stationId)) {
        const roll = Math.random();
        if (roll > 0.4) {
            setScarabCount(prev => prev + 1);
            setFoundScarabs(prev => new Set(prev).add(activeEntity.stationId));
            Alert.alert("Golden Scarab Found!", "A glimmering beetle crawls out from the entity's memory and into your book.");
        }
    }
    setActiveEntity(null);
  };

  const handleBookAction = (page: BookPage) => {
      if (page.type === 'DREAM_GATE' && page.targetDreamId) {
          // *** THE FIX IS HERE: Updating the slug triggers the useEffect to load data
          setCurrentDreamSlug(page.targetDreamId); 
          setBookOpen(false);
      } else if (page.type === 'CREDITS_UNLOCK') {
          Alert.alert("The End", "You have restored the Hexarchia Oneirica. You may now Scry your own worlds. (Demo End)");
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
                // *** THE KEY PROP FIX ***
                // This forces the component tree to re-mount when the dream slug changes, 
                // forcing AnimatedBackground and AnimatedSprite to re-run useTexture.
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
                greeting={activeEntity.greeting}
                options={activeEntity.options}
                frames={activeEntity.frames}
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