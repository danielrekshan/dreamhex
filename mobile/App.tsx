import React, { useState, useEffect } from 'react';
import { StyleSheet, View, StatusBar, Text, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { DreamScene } from './components/DreamScene';
import { BookReader } from './components/BookReader';
import { EntityDialog } from './components/EntityDialog';
import { BOOK_CONTENT, BookPage } from './BookManifest';

// Direct import of your provided JSON content
const DREAM_DATABASE: any = require('./assets/dreamworld.json');

export default function App() {
  // --- STATE ---
  const [currentDreamSlug, setCurrentDreamSlug] = useState('molecular-dreamscape');
  const [dreamData, setDreamData] = useState<any>(null);
  
  // UI States
  const [isBookOpen, setBookOpen] = useState(true);
  const [activeEntity, setActiveEntity] = useState<any>(null); // New: Holds data for the modal
  
  // Game States
  const [scarabCount, setScarabCount] = useState(0);
  const [foundScarabs, setFoundScarabs] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  // --- LOAD DREAM ---
  useEffect(() => {
    setLoading(true);
    setTimeout(() => {
        const dreams = DREAM_DATABASE.dreams || [];
        const found = dreams.find((d: any) => d.slug === currentDreamSlug);
        setDreamData(found || dreams[0]);
        setLoading(false);
    }, 500);
  }, [currentDreamSlug]);

  // --- HANDLERS ---

  const handleInteractStation = (targetStation: any) => {
    // If we click the central station (player), maybe just show a generic 'inner thought' or ignore
    if (targetStation.position_index === 0) return;

    // 1. Find the relationship relevant to the player (Station 0)
    // In your JSON, Station 0 is usually the player.
    const playerStationId = dreamData?.stations[0]?.id;
    
    // Find relationship where target_id matches the player, 
    // OR just grab the first relationship if the data structure is simple 1-to-1 in this demo
    const rel = targetStation.relationships?.find((r: any) => r.target_id === playerStationId) 
             || targetStation.relationships?.[0];

    // 2. Set Active Entity Data for the Modal
    setActiveEntity({
        name: targetStation.entity_name,
        stationId: targetStation.id,
        greeting: rel?.greeting_dialogue || "The entity stares at you silently.",
        options: rel?.interaction_options || ["Observe closely"]
    });
  };

  const handleOptionSelect = (option: string) => {
    if (!activeEntity) return;
    
    // Check for Scarab (Gamification)
    if (!foundScarabs.has(activeEntity.stationId)) {
        const roll = Math.random();
        if (roll > 0.4) { // 60% chance
            setScarabCount(prev => prev + 1);
            setFoundScarabs(prev => new Set(prev).add(activeEntity.stationId));
            Alert.alert("Golden Scarab Found!", "A glimmering beetle crawls out from the entity's memory and into your book.");
        }
    }
    
    // Close modal after selection
    setActiveEntity(null);
  };

  const handleBookAction = (page: BookPage) => {
      if (page.type === 'DREAM_GATE' && page.targetDreamId) {
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
                dreamData={dreamData}
                onOpenBook={() => setBookOpen(true)}
                onInteractStation={handleInteractStation}
            />
        )}

        {/* The Main Book Reader */}
        <BookReader 
            visible={isBookOpen}
            onClose={() => setBookOpen(false)}
            pages={BOOK_CONTENT}
            onAction={handleBookAction}
            scarabCount={scarabCount}
        />

        {/* The Entity Interaction Dialog */}
        {activeEntity && (
            <EntityDialog 
                visible={!!activeEntity}
                entityName={activeEntity.name}
                greeting={activeEntity.greeting}
                options={activeEntity.options}
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