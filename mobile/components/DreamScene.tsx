import React, { Suspense, useState } from 'react';
import { View, StyleSheet, LayoutChangeEvent } from 'react-native';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei/native';

import { AnimatedBackground } from './AnimatedBackground';
import { AnimatedSprite } from './AnimatedSprite';
import { MagicBook } from './MagicBook';

interface DreamSceneProps {
  dreamData: any; 
  onOpenBook: () => void;
  onInteractStation: (station: any) => void;
}

const getStationConfig = (index: number, total: number) => {
  // CONFIG 1: The Central Station (Index 0)
  if (index === 0) {
    return {
      position: [0, 1.5, 0] as [number, number, number], 
      scale: 3.0 
    };
  }

  // CONFIG 2: Perimeter Stations (Index 1..N)
  const perimeterIndex = index - 1;
  const perimeterTotal = total - 1;
  
  const radius = 9;
  const angle = (perimeterIndex * (Math.PI * 2) / perimeterTotal) + (Math.PI / 3);
  
  return {
    position: [radius * Math.cos(angle), -2, radius * Math.sin(angle)] as [number, number, number],
    scale: 1.0 
  };
};

export const DreamScene: React.FC<DreamSceneProps> = ({ dreamData, onOpenBook, onInteractStation }) => {
  const [viewSize, setViewSize] = useState<{width: number, height: number} | null>(null);

  const onLayout = (e: LayoutChangeEvent) => {
     const { width, height } = e.nativeEvent.layout;
     if (width > 0 && height > 0) setViewSize({ width, height });
  };

  const bgAsset = dreamData?.world_state?.generated_asset?.file_paths || [];
  // Fallback for old data structure
  const bgFrames = bgAsset.length > 0 ? bgAsset : (dreamData?.hex?.background_frames || []);
  
  const stations = dreamData?.stations || dreamData?.hex?.stations || [];

  return (
    <View style={styles.container} onLayout={onLayout}>
      {viewSize && (
        <Canvas 
            style={{ width: viewSize.width, height: viewSize.height }}
            camera={{ position: [0, 2, 16], fov: 60 }} 
        >
          <color attach="background" args={['#000']} />
          <ambientLight intensity={1.5} />
          
          <Suspense fallback={null}>
            <AnimatedBackground frames={bgFrames} />

            {stations.map((s: any, i: number) => {
                // LOGIC: Check for generated_assets (world.json structure)
                // If present, use the 'current_stance' to pick keys.
                // Fallback to 'idle' or the first available key.
                let frames: string[] = [];
                
                if (s.generated_assets) {
                    const stance = s.current_stance || 'idle';
                    if (s.generated_assets[stance]) {
                        frames = s.generated_assets[stance].file_paths;
                    } else if (s.generated_assets['idle']) {
                        frames = s.generated_assets['idle'].file_paths;
                    } else {
                        // Fallback: take first key
                        const keys = Object.keys(s.generated_assets);
                        if (keys.length > 0) frames = s.generated_assets[keys[0]].file_paths;
                    }
                } else {
                    // Fallback for old API generated data
                    frames = s.sprite_frames || [];
                }

                const config = getStationConfig(i, stations.length);

                return (
                    <AnimatedSprite 
                        key={s.id}
                        frames={frames}
                        position={config.position}
                        scale={config.scale}
                        onPress={() => onInteractStation(s)}
                    />
                );
            })}

            <MagicBook onPress={onOpenBook} />
          </Suspense>

          <OrbitControls 
            enableZoom={false} 
            enablePan={false} 
            maxPolarAngle={Math.PI / 1.6} 
          />
        </Canvas>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'black' },
});