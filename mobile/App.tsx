import React, { useState } from 'react';
import { StyleSheet, View, StatusBar, Text, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, LogBox } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context'; 
import * as Crypto from 'expo-crypto'; 

import DreamScene from './components/DreamScene';
// IMPORT the API Service functions
import { fetchDreams, submitDream, interactEntity } from './api'; 

LogBox.ignoreLogs([
  "EXGL: gl.pixelStorei() doesn't support this parameter yet!",
  "THREE.WebGLRenderer: Context Lost.",
  "ResponderTouchHistoryStore"
]);

// Generate a random User ID for this session (Replaces hardcoded IDs)
const USER_ID = Crypto.randomUUID(); 

type AppState = 'INTRO' | 'MENU' | 'CREATE' | 'DREAM';

export default function App() {
  const [appState, setAppState] = useState<AppState>('INTRO');
  const [dreams, setDreams] = useState<any[]>([]);
  const [activeDream, setActiveDream] = useState<any>(null);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);

  // --- HANDLERS ---
  
  // 1. Load Menu (Refreshes the dream list, runs on mount/return from dream)
  const loadMenu = async () => {
    setLoading(true);
    try {
      const list = await fetchDreams(USER_ID);
      // The API returns a list of summary objects.
      setDreams(list);
      setAppState('MENU');
    } catch (e) {
      console.error("Failed to fetch dreams:", e);
    }
    setLoading(false);
  };
  
  // 2. Submit Dream Report
  const handleSubmit = async () => {
    if (!inputText.trim()) return;
    setLoading(true);
    try {
      // API returns the full Dream object (with predicted GCS URLs) immediately
      const newDreamResponse = await submitDream(USER_ID, inputText);
      
      setActiveDream(newDreamResponse); 
      setAppState('DREAM');
      setInputText('');
    } catch (e) {
      alert("Failed to submit dream: " + e);
    }
    setLoading(false);
  };

  // 3. Close Dream (via Magic Book)
  const handleCloseDream = () => {
    setActiveDream(null); 
    loadMenu(); 
  };
  
  // 4. Handle Interaction (Called from DreamScene component)
  const handleInteract = async (dreamId: string, stationId: string, command: string) => {
      setLoading(true);
      try {
          // API returns the updated station data and the unlock status
          const response = await interactEntity(USER_ID, dreamId, stationId, command);
          
          if (response.unlock) {
              // Show notification for new page unlock
              alert(`A new page has been unlocked! Title: ${response.station.entity_name}'s Secret`);
              // Force menu refresh later to show new dream
          }
          
          // Update the active dream state locally with the new station data (new prompts/URLs)
          const updatedStations = activeDream.hex.stations.map((s: any) => 
              s.id === stationId ? response.station : s
          );
          
          setActiveDream({
              ...activeDream,
              hex: {
                  ...activeDream.hex,
                  stations: updatedStations
              }
          });

      } catch (e) {
          console.error("Interaction failed:", e);
          alert("Interaction failed. Please check console.");
      }
      setLoading(false);
  };
  

  // --- RENDER VIEWS ---

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container}>
        <StatusBar hidden={true} />

        {/* LOADING OVERLAY */}
        {loading && (
          <View style={styles.loader}>
            <ActivityIndicator size="large" color="#d7ccc8" />
            <Text style={styles.loaderText}>Processing...</Text>
          </View>
        )}

        {/* 1. INTRO (Goes to Menu/Create) */}
        {appState === 'INTRO' && (
          <View style={styles.center}>
            <TouchableOpacity onPress={loadMenu} style={styles.btn}>
              <Text style={styles.btnText}>Open Dream Journal</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* 2. MENU / CREATE */}
        {appState === 'MENU' && (
          <ScrollView style={styles.menu}>
            <Text style={styles.header}>New Dream Report</Text>
            <TextInput 
              style={styles.input} 
              placeholder="Describe your dream here..." 
              placeholderTextColor="#666"
              value={inputText}
              onChangeText={setInputText}
              multiline
            />
            <TouchableOpacity onPress={handleSubmit} style={styles.btn}>
              <Text style={styles.btnText}>Scry & Generate World</Text>
            </TouchableOpacity>

            <Text style={styles.header}>Magic Book Pages ({dreams.length})</Text>
            <TouchableOpacity onPress={loadMenu} style={styles.refreshBtn}>
                <Text style={styles.refreshBtnText}>Refresh Pages (Check Status)</Text>
            </TouchableOpacity>
            
            {dreams.map(d => (
              <TouchableOpacity key={d.id} style={styles.card} onPress={() => { handleSelectDream(d.id); }}>
                <Text style={styles.cardTitle}>{d.title}</Text>
                <Text style={styles.cardStatus}>Status: {d.status}</Text>
                {d.description && <Text style={styles.cardDesc} numberOfLines={2}>{d.description}</Text>}
              </TouchableOpacity>
            ))}
            {dreams.length === 0 && <Text style={styles.cardStatus}>No dreams unlocked yet. Submit a new report above.</Text>}

          </ScrollView>
        )}

        {/* 3. DREAM SCENE */}
        {appState === 'DREAM' && activeDream && (
          <View style={{ flex: 1 }}>
            <DreamScene 
              activeDream={activeDream} 
              onOpenBook={handleCloseDream} 
              onInteract={handleInteract}
            />
          </View>
        )}

      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loader: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center', zIndex: 100 },
  loaderText: { color: '#d7ccc8', marginTop: 10 },
  menu: { padding: 20 },
  header: { color: 'white', fontSize: 24, marginVertical: 15 },
  input: { backgroundColor: '#222', color: 'white', padding: 15, borderRadius: 8, height: 100, textAlignVertical: 'top' },
  btn: { backgroundColor: '#3e2723', padding: 15, borderRadius: 8, marginVertical: 10, alignItems: 'center' },
  btnText: { color: '#d7ccc8', fontSize: 18, fontWeight: 'bold' },
  refreshBtn: { backgroundColor: '#2c2c2c', padding: 10, borderRadius: 5, marginBottom: 10, alignItems: 'center' },
  refreshBtnText: { color: '#4fc3f7', fontSize: 14 },
  card: { width: '100%', backgroundColor: '#2c2c2c', padding: 20, marginVertical: 5, borderRadius: 8, borderLeftWidth: 3, borderLeftColor: '#d7ccc8' },
  cardTitle: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  cardStatus: { color: '#a1887f', fontSize: 12, marginTop: 5 },
  cardDesc: { color: '#ccc', fontSize: 14, marginTop: 5 }
});