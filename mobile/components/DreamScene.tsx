import React, { Suspense, useState, useEffect } from 'react';
import { View, StyleSheet, Text, Platform, PixelRatio, LayoutChangeEvent, LogBox, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei/native';
import * as THREE from 'three';

// --- IMPORTS ---
import { AnimatedSprite } from './AnimatedSprite'; // Now imports the sequence component
import { AnimatedBackground } from './AnimatedBackground'; // Now imports the resilient component
import { GyroControls } from './GyroControls';
import { MagicBook } from './MagicBook'; 

// --- INTERFACES ---
interface Station {
  id: string; position_index: number; entity_name: string; entity_greeting: string; interaction_options: string[]; sprite_frames: string[];
}
interface DreamHex {
  id: string; title: string; background_frames: string[]; stations: Station[];
}
interface DreamSceneProps { 
  activeDream: { hex: DreamHex, status: string }; 
  onOpenBook: () => void; 
  onInteract: (dId: string, sId: string, cmd: string) => void;
}

if (Platform.OS === 'web') LogBox.ignoreLogs(['ResponderTouchHistoryStore']);

const getStationPosition = (index: number): [number, number, number] => {
  const radius = 8;
  const angle = index * (Math.PI * 2) / 6 + (Math.PI / 6); 
  return [radius * Math.cos(angle), -1.5, radius * Math.sin(angle)];
};

const cursiveStyle = { 
    fontStyle: 'italic', 
    fontFamily: Platform.select({ ios: 'Snell Roundhand', android: 'serif', default: 'serif' })
};


const DreamScene: React.FC<DreamSceneProps> = ({ activeDream, onOpenBook, onInteract }) => {
  // Use optional chaining for safety
  if (!activeDream?.hex) return <View style={styles.container} />;

  const [viewSize, setViewSize] = useState<{width: number, height: number} | null>(null);
  const [isReady, setIsReady] = useState(false); 
  const [selectedStation, setSelectedStation] = useState<Station | null>(null);
  const [isGyro, setIsGyro] = useState(Platform.OS !== 'web');

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (width > 0 && height > 0) setViewSize({ width, height });
  };
  
  // Layout Guard Fix (Android viewport stabilization)
  useEffect(() => {
    if (viewSize) {
      const t = setTimeout(() => setIsReady(true), 200);
      return () => clearTimeout(t);
    }
  }, [viewSize]);

  // Interaction Logic
  const handleOption = (cmd: string) => {
    if (selectedStation) {
      onInteract(activeDream.hex.id, selectedStation.id, cmd);
      setSelectedStation(null); // Close dialog while waiting for server response
    }
  };

  const bgFrames = activeDream.hex.background_frames || [];
  const stations = activeDream.hex.stations || [];
  const hasBg = bgFrames.length > 0;
  const isProcessing = activeDream.status === 'PROCESSING' || activeDream.status === 'GENERATING_ENTITIES';


  return (
    <View style={styles.container} onLayout={onLayout}>
      <View style={StyleSheet.absoluteFillObject}>
        {isReady && viewSize && (
          <Canvas 
            style={{ width: viewSize.width, height: viewSize.height, backgroundColor: 'black' }}
            camera={{ position: [0, 0, 0.1], fov: 75 }}
            onCreated={(state) => state.gl.setPixelRatio(PixelRatio.get())}
          >
            <ambientLight intensity={1.5} />
            <Suspense fallback={null}>
              
              {/* Background: The component now handles its own fallback/placeholder */}
              {/* NOTE: If bgFrames is empty, AnimatedBackground renders the placeholder sphere */}
              <AnimatedBackground 
                  key={activeDream.hex.id} 
                  frames={bgFrames} 
                  fps={isProcessing ? 0 : 3} // Freeze if processing
              />

              {/* Stations: The component now handles its own fallback/placeholder */}
              {stations.map((s, i) => {
                // Only render if entity name exists 
                if (!s.entity_name) return null;
                
                return (
                  <AnimatedSprite
                    // Pass ALL frame URLs to the new sequence component
                    key={`${activeDream.hex.id}-${s.id}-${s.sprite_frames[0] || 'placeholder'}`} 
                    frames={s.sprite_frames} 
                    position={getStationPosition(i)}
                    onPress={() => setSelectedStation(s)}
                  />
                );
              })}

              <MagicBook onPress={onOpenBook} />

            </Suspense>

            {isGyro ? <GyroControls /> : <OrbitControls enableZoom={false} rotateSpeed={-0.5} />}
          </Canvas>
        )}
      </View>
      
      {/* --- UI LAYER --- */}
      
      {/* 1. Processing / Status Indicator */}
      {isProcessing && (
          <View style={styles.processingIndicator}>
              <ActivityIndicator size="small" color="#d7ccc8" />
              <Text style={styles.processingText}>
                 {activeDream.status === 'PROCESSING' ? "Scrying World..." : "Summoning Entities..."}
              </Text>
          </View>
      )}

      {/* 2. Title */}
      <View style={styles.titleOverlay}>
          <Text style={styles.cursiveTitle}>{activeDream.hex.title}</Text>
          <Text style={styles.statusText}>{activeDream.status.replace('_', ' ')}</Text>
      </View>
      
      {/* 3. Dialog */}
      {selectedStation && (
        <View style={styles.dialogOverlay}>
            <View style={styles.dialogBox}>
                <Text style={styles.cursiveDialogTitle}>{selectedStation.entity_name}</Text>
                <Text style={styles.cursiveDialogText}>"{selectedStation.entity_greeting}"</Text>
                
                {/* Interaction Options */}
                {selectedStation.interaction_options.map((opt, i) => (
                    <TouchableOpacity key={i} style={styles.optBtn} onPress={() => handleOption(opt)}>
                        <Text style={styles.optText}>▶ {opt}</Text>
                    </TouchableOpacity>
                ))}
                
                <TouchableOpacity onPress={() => setSelectedStation(null)} style={styles.closeBtn}>
                    <Text style={styles.closeText}>Close</Text>
                </TouchableOpacity>
            </View>
        </View>
      )}
      
      {/* 4. Controls Toggle */}
      {!selectedStation && (
        <TouchableOpacity style={styles.toggleBtn} onPress={() => setIsGyro(!isGyro)}>
            <Text style={{color:'white'}}>{isGyro ? "Touch Mode" : "Gyro Mode"}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  
  titleOverlay: { position: 'absolute', top: 40, width: '100%', alignItems: 'center', zIndex: 10 },
  cursiveTitle: { 
    color: '#d7ccc8', 
    fontSize: 36, 
    ...cursiveStyle,
    textShadowColor:'black', 
    textShadowRadius: 10,
    textShadowOffset: {width: 2, height: 2}
  },
  statusText: { color: '#888', fontSize: 12, marginTop: 5, textTransform: 'uppercase', letterSpacing: 2 },

  processingIndicator: {
    position: 'absolute', top: 100, alignSelf: 'center', 
    padding: 10, backgroundColor: 'rgba(0, 0, 0, 0.7)', 
    borderRadius: 5, flexDirection: 'row', alignItems: 'center', zIndex: 11
  },
  processingText: { color: '#d7ccc8', marginLeft: 8, fontSize: 12 },

  dialogOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 20 },
  dialogBox: { width: 320, backgroundColor: '#222', padding: 25, borderRadius: 4, borderLeftWidth: 4, borderColor: '#d7ccc8', shadowColor: "#000", shadowOffset: {width: 0, height: 10}, shadowOpacity: 0.5, shadowRadius: 10 },
  
  cursiveDialogTitle: { color: '#d7ccc8', fontSize: 28, ...cursiveStyle, marginBottom: 15 },
  cursiveDialogText: { color: '#ccc', fontSize: 20, ...cursiveStyle, marginBottom: 20, lineHeight: 26 },
  
  optBtn: { paddingVertical: 12, borderBottomWidth: 1, borderColor: '#333' },
  optText: { color: '#4fc3f7', fontSize: 16 },
  
  closeBtn: { marginTop: 20, alignItems: 'center' },
  closeText: { color: '#888', fontSize: 14 },
  
  toggleBtn: { position: 'absolute', bottom: 30, right: 20, padding: 10, backgroundColor: 'rgba(50,50,50,0.8)', borderRadius: 5 }
});

export default DreamScene;