import React, { useState, useEffect } from 'react';
import { StyleSheet, View, StatusBar, Text, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, LogBox, Platform, Alert } from 'react-native'; 
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context'; 
import * as Crypto from 'expo-crypto'; 
import AsyncStorage from '@react-native-async-storage/async-storage';

import DreamScene from './components/DreamScene';
import { fetchDreams, submitDream, interactEntity, triggerWarmup, getDream, deleteDream, reprocessDream } from './api'; 

LogBox.ignoreLogs([
  "EXGL: gl.pixelStorei()",
  "THREE.WebGLRenderer",
  "ResponderTouchHistoryStore"
]);

type AppState = 'INTRO' | 'MENU' | 'CREATE' | 'DREAM';

const cursiveStyle = { 
    fontStyle: 'italic', 
    fontFamily: Platform.select({ ios: 'Snell Roundhand', android: 'serif', default: 'serif' })
};


export default function App() {
  const [appState, setAppState] = useState<AppState>('INTRO');
  const [userId, setUserId] = useState<string | null>(null);
  const [dreams, setDreams] = useState<any[]>([]);
  const [activeDream, setActiveDream] = useState<any>(null);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);

  // 1. Session Persistence
  useEffect(() => {
    const initSession = async () => {
      let storedId = await AsyncStorage.getItem('DREAMHEX_USER_ID');
      if (!storedId) {
        storedId = Crypto.randomUUID();
        await AsyncStorage.setItem('DREAMHEX_USER_ID', storedId);
      }
      setUserId(storedId);
    };
    initSession();
  }, []); 

  // 2. Polling Logic for Active Dream
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (appState === 'DREAM' && activeDream && activeDream.status !== 'COMPLETE') {
      interval = setInterval(async () => {
        const freshData = await getDream(activeDream.id);
        if (freshData) {
          setActiveDream(freshData);
          if (freshData.status === 'COMPLETE' || freshData.status === 'ERROR') {
            if (interval) clearInterval(interval);
          }
        }
      }, 3000); 
    }
    return () => {
        if (interval) clearInterval(interval);
    };
  }, [appState, activeDream?.status, activeDream?.id]);


  // --- HANDLERS ---
  
  const loadMenu = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const list = await fetchDreams(userId);
      setDreams(list);
      setAppState('MENU');
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };
  
  const handleSubmit = async () => {
    if (!inputText.trim() || !userId) return;

    // 🔥 TEST-MODE WARMUP: Trigger warmup immediately upon submit click
    triggerWarmup(userId); 

    setLoading(true);
    try {
      const newDreamResponse = await submitDream(userId, inputText);
      setActiveDream(newDreamResponse); 
      setAppState('DREAM');
      setInputText('');
    } catch (e) {
      alert("Failed to submit dream: " + e);
    }
    setLoading(false);
  };

  const handleSelectDream = async (dreamId: string) => {
      setLoading(true);
      const fullDream = await getDream(dreamId);
      setActiveDream(fullDream);
      setAppState('DREAM');
      setLoading(false);
  }

  const handleCloseDream = () => {
    setActiveDream(null); 
    loadMenu(); 
  };
  
  // NEW: Handle Delete
  const handleDeleteDream = (dreamId: string, title: string) => {
    if (!userId) return;
    Alert.alert(
      "Confirm Deletion",
      `Are you sure you want to delete the dream page "${title}"?`,
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setLoading(true);
            try {
              await deleteDream(dreamId, userId);
              loadMenu(); // Refresh the list
            } catch (e) {
              Alert.alert("Error", "Failed to delete dream.");
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  // NEW: Handle Reprocess
  const handleReprocessDream = async (dreamId: string, title: string) => {
    if (!userId) return;
    setLoading(true);
    try {
      await reprocessDream(dreamId, userId);
      // Immediately fetch the newly reset dream to show status change
      const newDream = await getDream(dreamId);
      if (newDream) {
          setActiveDream(newDream);
          setAppState('DREAM');
      } else {
          loadMenu();
      }
    } catch (e) {
      Alert.alert("Error", "Failed to reprocess dream.");
    }
    setLoading(false);
  };


  const handleInteract = async (dreamId: string, stationId: string, command: string) => {
     if (!userId) return;
     setLoading(true);
      try {
          const response = await interactEntity(userId, dreamId, stationId, command);
          if (response.unlock) alert(`New page unlocked!`);
          
           const updatedStations = activeDream.hex.stations.map((s: any) => 
              s.id === stationId ? response.station : s
          );
          setActiveDream({
              ...activeDream,
              hex: { ...activeDream.hex, stations: updatedStations }
          });
      } catch (e) {
          console.error(e);
      }
      setLoading(false);
  };

  if (!userId) return <View style={styles.center}><ActivityIndicator /></View>;

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container}>
        <StatusBar hidden={true} />

        {loading && (
          <View style={styles.loader}>
            <ActivityIndicator size="large" color="#d7ccc8" />
            <Text style={[styles.loaderText, cursiveStyle]}>Scrying...</Text>
          </View>
        )}

        {appState === 'INTRO' && (
          <View style={styles.center}>
            <TouchableOpacity onPress={loadMenu} style={styles.btn}>
              <Text style={styles.btnText}>Open Dream Journal</Text>
            </TouchableOpacity>
          </View>
        )}

        {appState === 'MENU' && (
          <ScrollView style={styles.menu}>
            <Text style={styles.cursiveHeader}>New Dream Report</Text>
            <TextInput 
              style={[styles.input, cursiveStyle]} 
              placeholder="Describe your dream here..." 
              placeholderTextColor="#666"
              value={inputText}
              onChangeText={setInputText}
              multiline
            />
            <TouchableOpacity onPress={handleSubmit} style={styles.btn}>
              <Text style={styles.btnText}>Scry & Generate</Text>
            </TouchableOpacity>

            <Text style={styles.cursiveHeader}>Magic Book Pages</Text>
            {dreams.map(d => (
              <View key={d.id} style={styles.cardContainer}>
                <TouchableOpacity style={styles.card} onPress={() => handleSelectDream(d.id)}>
                  <Text style={styles.cardTitle}>{d.title}</Text>
                  <Text style={styles.cardStatus}>Status: {d.status}</Text>
                </TouchableOpacity>
                <View style={styles.cardActions}>
                    <TouchableOpacity 
                        onPress={() => handleReprocessDream(d.id, d.title)} 
                        style={[styles.actionBtn, {backgroundColor: '#795548'}]}
                    >
                        <Text style={styles.actionBtnText}>Reprocess</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                        onPress={() => handleDeleteDream(d.id, d.title)} 
                        style={[styles.actionBtn, {backgroundColor: '#b71c1c'}]}
                    >
                        <Text style={styles.actionBtnText}>Delete</Text>
                    </TouchableOpacity>
                </View>
              </View>
            ))}
          </ScrollView>
        )}

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
  loaderText: { color: '#d7ccc8', marginTop: 10, fontSize: 20 },
  menu: { padding: 20 },
  header: { color: 'white', fontSize: 24, marginVertical: 15 },
  cursiveHeader: { color: '#d7ccc8', fontSize: 32, marginVertical: 15, ...cursiveStyle },
  input: { backgroundColor: '#222', color: '#d7ccc8', padding: 15, borderRadius: 8, height: 100, textAlignVertical: 'top', fontSize: 18 },
  btn: { backgroundColor: '#3e2723', padding: 15, borderRadius: 8, marginVertical: 10, alignItems: 'center' },
  btnText: { color: '#d7ccc8', fontSize: 20, ...cursiveStyle },
  
  // New Styles for Dream Card and Actions
  cardContainer: {
    marginVertical: 5,
    backgroundColor: '#2c2c2c',
    borderRadius: 8,
    borderLeftWidth: 3, 
    borderLeftColor: '#d7ccc8',
    overflow: 'hidden'
  },
  card: { padding: 20 },
  cardTitle: { color: 'white', fontSize: 20, ...cursiveStyle },
  cardStatus: { color: '#a1887f', fontSize: 12, marginTop: 5 },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 5,
    borderTopWidth: 1,
    borderColor: '#333'
  },
  actionBtn: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 4,
    marginLeft: 10,
  },
  actionBtnText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  }
});