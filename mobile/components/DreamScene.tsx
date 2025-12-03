import React, { Suspense, useState, useEffect } from 'react';
import { View, StyleSheet, Text, Platform, PixelRatio, LayoutChangeEvent, LogBox, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei/native';
import * as THREE from 'three';

// --- IMPORTS ---
import { AnimatedSprite } from './AnimatedSprite';
import { AnimatedBackground } from './AnimatedBackground';
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
  const isProcessing = activeDream.status === 'PROCESSING';

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
              
              {/* Background: Array of GCS URIs */}
              {bgFrames.length > 0 && (
                 <AnimatedBackground 
                    key={activeDream.hex.id} 
                    frames={bgFrames} 
                    fps={isProcessing ? 0 : 3} // Freeze if processing
                 />
              )}

              {/* Stations: Array of GCS URIs */}
              {activeDream.hex.stations.map((s, i) => {
                // Only render if entity name exists and asset URLs have been provided
                if (!s.entity_name || s.sprite_frames.length === 0) return null;
                
                return (
                  <AnimatedSprite
                    // Key changes if the first frame URL changes (on interaction/regen)
                    key={`${activeDream.hex.id}-${s.id}-${s.sprite_frames[0]}`} 
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
      
      {/* 1. Processing / Placeholder Indicator */}
      {isProcessing && (
          <View style={styles.processingIndicator}>
              <ActivityIndicator size="small" color="#d7ccc8" />
              <Text style={styles.processingText}>Generating Dream Assets...</Text>
          </View>
      )}

      {/* 2. Title */}
      <View style={styles.titleOverlay}>
          <Text style={styles.title}>{activeDream.hex.title}</Text>
      </View>
      
      {/* 3. Dialog */}
      {selectedStation && (
        <View style={styles.dialogOverlay}>
            <View style={styles.dialogBox}>
                <Text style={styles.dialogTitle}>{selectedStation.entity_name}</Text>
                <Text style={styles.dialogText}>"{selectedStation.entity_greeting}"</Text>
                
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
  title: { color: 'white', fontSize: 24, fontWeight: 'bold' },
  
  processingIndicator: {
    position: 'absolute', top: 80, padding: 10, backgroundColor: 'rgba(0, 0, 0, 0.7)', borderRadius: 5, flexDirection: 'row', alignItems: 'center', zIndex: 11
  },
  processingText: { color: '#d7ccc8', marginLeft: 8 },

  dialogOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 20 },
  dialogBox: { width: 300, backgroundColor: '#222', padding: 20, borderRadius: 10, borderLeftWidth: 4, borderColor: '#d7ccc8' },
  dialogTitle: { color: 'white', fontSize: 18, fontWeight: 'bold', marginBottom: 10 },
  dialogText: { color: '#ccc', marginBottom: 15, fontStyle: 'italic' },
  optBtn: { paddingVertical: 10, borderBottomWidth: 1, borderColor: '#333' },
  optText: { color: '#4fc3f7' },
  closeBtn: { marginTop: 15, alignItems: 'center' },
  closeText: { color: '#888' },
  toggleBtn: { position: 'absolute', bottom: 20, right: 20, padding: 10, backgroundColor: '#333', borderRadius: 5 }
});

export default DreamScene;