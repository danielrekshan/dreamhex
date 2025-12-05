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
      position: [0, -2.5, 0] as [number, number, number], // Center, floating above book (y=-5.5)
      scale: 2.0 // Twice as big
    };
  }

  // CONFIG 2: Perimeter Stations (Index 1..N)
  // We distribute the remaining (total - 1) stations in a circle
  const perimeterIndex = index - 1;
  const perimeterTotal = total - 1;
  
  const radius = 9;
  // Start angle offset so the first perimeter entity isn't blocking the camera view
  const angle = (perimeterIndex * (Math.PI * 2) / perimeterTotal) + (Math.PI / 3);
  
  return {
    position: [radius * Math.cos(angle), -2, radius * Math.sin(angle)] as [number, number, number],
    scale: 1.0 // Normal size
  };
};

export const DreamScene: React.FC<DreamSceneProps> = ({ dreamData, onOpenBook, onInteractStation }) => {
  const [viewSize, setViewSize] = useState<{width: number, height: number} | null>(null);

  const onLayout = (e: LayoutChangeEvent) => {
     const { width, height } = e.nativeEvent.layout;
     if (width > 0 && height > 0) setViewSize({ width, height });
  };

  const bgAsset = dreamData?.world_state?.generated_asset?.file_paths || [];
  const stations = dreamData?.stations || [];

  return (
    <View style={styles.container} onLayout={onLayout}>
      {viewSize && (
        <Canvas 
            style={{ width: viewSize.width, height: viewSize.height }}
            // Camera looking slightly down
            camera={{ position: [0, 1, 14], fov: 60 }} 
        >
          <color attach="background" args={['#000']} />
          <ambientLight intensity={1.5} />
          
          <Suspense fallback={null}>
            <AnimatedBackground frames={bgAsset} />

            {stations.map((s: any, i: number) => {
                const assetKeys = Object.keys(s.generated_assets || {});
                const firstKey = assetKeys[0];
                const frames = firstKey ? s.generated_assets[firstKey].file_paths : [];
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

          <OrbitControls enableZoom={false} maxPolarAngle={Math.PI / 1.6} />
        </Canvas>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'black' },
});