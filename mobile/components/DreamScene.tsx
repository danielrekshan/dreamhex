import React, { Suspense, useState, useEffect } from 'react';
import { View, StyleSheet, LayoutChangeEvent } from 'react-native';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei/native';

import { AnimatedBackground } from './AnimatedBackground';
import { AnimatedSprite } from './AnimatedSprite';
import { MagicBook } from './MagicBook';

interface DreamSceneProps {
  dreamData: any; 
  bookText: string; // Keeping for compatibility, but its content is split below
  onOpenBook: () => void;
  onInteractStation: (station: any) => void;
  isExiting: boolean;
  onExitAnimationComplete: () => void;
}

const getStationConfig = (index: number, total: number) => {
  if (index === 0) {
    return { position: [0, 1.5, 0] as [number, number, number], scale: 3.0 };
  }
  const perimeterIndex = index - 1;
  const perimeterTotal = total - 1;
  const radius = 9;
  const angle = (perimeterIndex * (Math.PI * 2) / perimeterTotal) + (Math.PI / 3);
  return { position: [radius * Math.cos(angle), -2, radius * Math.sin(angle)] as [number, number, number], scale: 1.0 };
};

export const DreamScene: React.FC<DreamSceneProps> = ({ 
    dreamData, bookText, onOpenBook, onInteractStation, isExiting, onExitAnimationComplete 
}) => {
  const [viewSize, setViewSize] = useState<{width: number, height: number} | null>(null);
  const [animationStep, setAnimationStep] = useState(0); 

  const onLayout = (e: LayoutChangeEvent) => {
     const { width, height } = e.nativeEvent.layout;
     if (width > 0 && height > 0) setViewSize({ width, height });
  };

  const currentLevel = dreamData?.world_state?.chaos_level ?? 2;
  const levelKey = `level_${currentLevel}`;
  let bgFrames = dreamData?.world_state?.generated_assets?.[levelKey]?.file_paths || [];
  if (bgFrames.length === 0) bgFrames = dreamData?.world_state?.generated_asset?.file_paths || [];
  if (bgFrames.length === 0) bgFrames = dreamData?.hex?.background_frames || [];
  
  const stations = dreamData?.stations || dreamData?.hex?.stations || [];
  const totalSteps = stations.length > 0 ? stations.length + 2 : 1; 

  // 1. Entrance Effect
  useEffect(() => {
    if (stations.length === 0) return;
    let timers: NodeJS.Timeout[] = [];
    const stepInterval = 200; 
    let targetSteps: number[] = [];
    for (let s = 1; s <= totalSteps; s++) targetSteps.push(s);
    
    targetSteps.forEach((step, index) => {
        const timer = setTimeout(() => setAnimationStep(step), index * stepInterval);
        timers.push(timer);
    });
    return () => timers.forEach(clearTimeout);
  }, [totalSteps, stations.length]); 

  // 2. Exit Effect
  useEffect(() => {
    if (!isExiting || stations.length === 0) {
      if (!isExiting && animationStep > 0) setAnimationStep(totalSteps);
      return;
    }
    let timers: NodeJS.Timeout[] = [];
    const stepInterval = 200; 
    let targetSteps: number[] = [];
    for (let s = totalSteps; s >= 0; s--) targetSteps.push(s);

    targetSteps.forEach((step, index) => {
        const timer = setTimeout(() => {
            setAnimationStep(step); 
            if (step === 0) onExitAnimationComplete();
        }, index * stepInterval);
        timers.push(timer);
    });
    return () => timers.forEach(clearTimeout);
  }, [isExiting, totalSteps, stations.length, onExitAnimationComplete]); 

  const getStationVisibility = (i: number) => {
      if (i === 0) return animationStep >= 3;
      return animationStep >= (i + 3);
  }

  const isBackgroundVisible = animationStep >= 1;
  const isBookVisible = animationStep >= 2;

  // Split text for two-page display
  const splitIndex = Math.floor(bookText.length / 2);
  const leftText = bookText.substring(0, splitIndex);
  const rightText = bookText.substring(splitIndex);

  return (
    <View style={styles.container} onLayout={onLayout}>
      {viewSize && (
        <Canvas style={{ width: viewSize.width, height: viewSize.height }} camera={{ position: [0, 2, 16], fov: 60 }}>
          <color attach="background" args={['#000']} />
          <ambientLight intensity={1.5} />
          <Suspense fallback={null}>
            <AnimatedBackground frames={bgFrames} isVisible={isBackgroundVisible} />
            {stations.map((s: any, i: number) => {
                let frames: string[] = [];
                if (s.generated_assets) {
                    const stance = s.current_stance || 'idle';
                    if (s.generated_assets[stance]) frames = s.generated_assets[stance].file_paths;
                    else if (s.generated_assets['idle']) frames = s.generated_assets['idle'].file_paths;
                    else {
                        const keys = Object.keys(s.generated_assets);
                        if (keys.length > 0) frames = s.generated_assets[keys[0]].file_paths;
                    }
                } else {
                    frames = s.sprite_frames || [];
                }
                const config = getStationConfig(i, stations.length);
                const isVisible = getStationVisibility(i);
                return (
                    <AnimatedSprite 
                        key={s.id}
                        frames={frames}
                        position={config.position}
                        scale={config.scale}
                        onPress={() => onInteractStation(s)}
                        isVisible={isVisible}
                    />
                );
            })}
            <MagicBook 
                onPress={onOpenBook} 
                leftPageText={leftText}
                rightPageText={rightText}
                isVisible={isBookVisible}
            />
          </Suspense>
          <OrbitControls enableZoom={false} enablePan={false} maxPolarAngle={Math.PI / 1.6} />
        </Canvas>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'black' },
});