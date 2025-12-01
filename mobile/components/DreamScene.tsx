import React, { Suspense, useState } from 'react';
import { View, StyleSheet, Text, Platform, TouchableOpacity } from 'react-native';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei/native';
import * as THREE from 'three';

// --- IMPORTS ---
import { AnimatedSprite } from './AnimatedSprite';
import { AnimatedBackground } from './AnimatedBackground';
import { GyroControls } from './GyroControls';

// ... (Keep your Interfaces: Station, DreamHex, etc. unchanged) ...
export interface SpriteConfig {
  filename: string;
  cols: number;
  rows: number;
  count: number;
}
export interface Station {
  id: string;
  position_index: number;
  entity_name: string | null;
  state_start: string | null;
  state_end: string | null;
  entity_greeting: string | null;
  interaction_options: string[];
  sprite_image?: string; 
  sprite_sheet_config?: SpriteConfig;
}
export interface DreamHex {
  title: string;
  description_360: string;
  central_imagery: string;
  background_image?: string; 
  background_frames?: string[]; 
  stations: Station[];
}
export interface DreamData {
  hex: DreamHex;
  summary?: string;
}
interface DreamSceneProps {
  dreamJson: DreamData;
  onEntityPress?: (station: Station) => void;
}

const getStationPosition = (index: number): [number, number, number] => {
  if (index === 0) return [0, -2, -6]; 
  const radius = 8;
  const angleStep = (Math.PI * 2) / 6;
  const angle = (index - 1) * angleStep + (Math.PI / 6); 
  return [radius * Math.cos(angle), -2, radius * Math.sin(angle)];
};

const DreamScene: React.FC<DreamSceneProps> = ({ dreamJson, onEntityPress }) => {
  const { hex } = dreamJson;
  const isWeb = Platform.OS === 'web';
  const [isGyro, setIsGyro] = useState(!isWeb);

  return (
    <View style={styles.container}>
      {/* LAYOUT FIX: absoluteFillObject 
         This ignores flexbox negotiation and forces full screen.
      */}
      <View style={StyleSheet.absoluteFillObject}>
        <Canvas 
          style={{ flex: 1, backgroundColor: 'black' }}
          camera={{ position: [0, 0, 0.1], fov: 75 }}
          onCreated={(state) => state.gl.setPixelRatio(1)}
        >
          <ambientLight intensity={1.5} />
          
          {/* Debug Helper: Red=X, Green=Y, Blue=Z */}
          <axesHelper args={[5]} />
          
          <Suspense fallback={null}>
            {/* Background */}
            {hex.background_frames && hex.background_frames.length > 0 ? (
               <AnimatedBackground frames={hex.background_frames} fps={6} />
            ) : hex.background_image ? (
               <AnimatedBackground frames={[hex.background_image]} fps={1} />
            ) : null}

            {/* Stations */}
            {hex.stations.map((station) => {
              const position = getStationPosition(station.position_index);
              if (station.sprite_sheet_config && station.sprite_image) {
                return (
                  <AnimatedSprite
                    key={station.id}
                    uri={station.sprite_image}
                    position={position}
                    columns={station.sprite_sheet_config.cols}
                    rows={station.sprite_sheet_config.rows}
                    frameCount={station.sprite_sheet_config.count}
                    onPress={() => onEntityPress && onEntityPress(station)}
                  />
                );
              }
              return null; 
            })}
          </Suspense>

          {/* Controls */}
          {isGyro && !isWeb ? (
              <GyroControls /> 
          ) : (
              <OrbitControls enableZoom={false} enablePan={false} rotateSpeed={-0.5} />
          )}
        </Canvas>
      </View>
      
      <View style={styles.overlay}>
        <Text style={styles.title}>{hex.title}</Text>
      </View>

      {!isWeb && (
        <View style={styles.controlsBtn}>
            <TouchableOpacity onPress={() => setIsGyro(!isGyro)}>
                <Text style={styles.btnText}>{isGyro ? "Use Touch" : "Use Gyro"}</Text>
            </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000', 
  },
  overlay: {
    position: 'absolute',
    top: 40,
    width: '100%',
    alignItems: 'center',
    pointerEvents: 'none', 
    zIndex: 10,
  },
  title: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'serif' : 'sans-serif', 
    textShadowColor: 'black', 
    textShadowRadius: 10,
  },
  controlsBtn: {
      position: 'absolute',
      bottom: 20,
      right: 20,
      backgroundColor: 'rgba(255,255,255,0.3)',
      padding: 10,
      borderRadius: 8,
      zIndex: 20,
  },
  btnText: {
      color: 'white',
      fontWeight: 'bold',
  }
});

export default DreamScene;