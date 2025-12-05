import React, { Suspense, useState, useEffect } from 'react';
import { View, StyleSheet, LayoutChangeEvent } from 'react-native';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei/native';

import { AnimatedBackground } from './AnimatedBackground';
import { AnimatedSprite } from './AnimatedSprite';
import { MagicBook } from './MagicBook';

interface DreamSceneProps {
  dreamData: any; 
  bookText: string;
  onOpenBook: () => void;
  onInteractStation: (station: any) => void;
  // NEW PROP: To signal a transition out
  isExiting: boolean;
  // NEW PROP: Callback to signal completion of the exit animation
  onExitAnimationComplete: () => void;
}

const getStationConfig = (index: number, total: number) => {
  if (index === 0) {
    return {
      position: [0, 1.5, 0] as [number, number, number], 
      scale: 3.0 
    };
  }

  const perimeterIndex = index - 1;
  const perimeterTotal = total - 1;
  
  const radius = 9;
  const angle = (perimeterIndex * (Math.PI * 2) / perimeterTotal) + (Math.PI / 3);
  
  return {
    position: [radius * Math.cos(angle), -2, radius * Math.sin(angle)] as [number, number, number],
    scale: 1.0 
  };
};

export const DreamScene: React.FC<DreamSceneProps> = ({ dreamData, bookText, onOpenBook, onInteractStation, isExiting, onExitAnimationComplete }) => {
  const [viewSize, setViewSize] = useState<{width: number, height: number} | null>(null);
  // State for controlling the animation sequence (0=Hidden, 1=BG, 2=Book, 3=Central, 4+=Peripherals)
  const [animationStep, setAnimationStep] = useState(0); 

  const onLayout = (e: LayoutChangeEvent) => {
     const { width, height } = e.nativeEvent.layout;
     if (width > 0 && height > 0) setViewSize({ width, height });
  };

  const currentLevel = dreamData?.world_state?.chaos_level ?? 2;
  const levelKey = `level_${currentLevel}`;

  let bgFrames = dreamData?.world_state?.generated_assets?.[levelKey]?.file_paths || [];

  if (bgFrames.length === 0) {
      bgFrames = dreamData?.world_state?.generated_asset?.file_paths || [];
  }
  if (bgFrames.length === 0) {
      bgFrames = dreamData?.hex?.background_frames || [];
  }
  
  const stations = dreamData?.stations || dreamData?.hex?.stations || [];
  
  // Total steps: 1 (BG) + 1 (Book) + N (Stations) = N+2
  const totalSteps = stations.length > 0 ? stations.length + 2 : 1; 

  // Logic for the entrance and exit animation sequence (~4 seconds total)
  useEffect(() => {
    let timers: NodeJS.Timeout[] = [];
    // UPDATED: Faster step interval for a 70% speed increase (650ms * 0.30 ≈ 200ms)
    const stepInterval = 200; 
    
    let targetSteps: number[] = [];
    
    if (isExiting) {
        // EXIT ANIMATION: Reverse sequence: totalSteps (Last Entity Hide) -> ... -> 1 (BG Hide)
        for (let s = totalSteps; s >= 0; s--) {
            targetSteps.push(s);
        }
    } else if (stations.length > 0 && animationStep === 0) { 
        // ENTRANCE ANIMATION: Sequence: 0 -> 1 (BG Show) -> ... -> totalSteps (Last Entity Show)
        // ONLY triggers if the component mounts (initial load) or on dream change (via key) 
        // AND animation has not started (animationStep === 0).
        for (let s = 1; s <= totalSteps; s++) {
            targetSteps.push(s);
        }
    } else {
        // Prevent setting animationStep = 0 if it has already completed the entrance
        if (!isExiting && animationStep > 0) return () => {timers.forEach(clearTimeout)};
        setAnimationStep(0);
        return () => {timers.forEach(clearTimeout)};
    }

    // Schedule Steps
    targetSteps.forEach((step, index) => {
        const timer = setTimeout(() => {
            setAnimationStep(step); 
            
            // Trigger callback when the final step (0) is reached during exit
            if (isExiting && step === 0) {
                onExitAnimationComplete();
            }
        }, index * stepInterval);
        timers.push(timer);
    });

    // Dependency array ensures this only runs on: 1) Mount (initial load, animationStep=0) 2) isExiting state change
    return () => {
        timers.forEach(clearTimeout);
    };
  }, [isExiting, totalSteps, onExitAnimationComplete]); 

  // Helper to determine sprite visibility based on index and current step
  const getStationVisibility = (i: number) => {
      // i=0 (Central Station): Should be 3rd element (after BG and Book). Step >= 3
      if (i === 0) {
          return animationStep >= 3;
      }
      // i>0 (Peripheral Stations): Visible at step i + 3 and beyond.
      // Peripheral at index 1 is step 4. Peripheral at index 2 is step 5.
      return animationStep >= (i + 3);
  }

  // The background is visible as long as animationStep is 1 or greater
  const isBackgroundVisible = animationStep >= 1;
  // The MagicBook is visible at step 2 and beyond. (Second item to appear/Second to last to leave)
  const isBookVisible = animationStep >= 2;

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
            {/* Pass isVisible for background fade-in/out */}
            <AnimatedBackground frames={bgFrames} isVisible={isBackgroundVisible} />

            {stations.map((s: any, i: number) => {
                let frames: string[] = [];
                
                if (s.generated_assets) {
                    const stance = s.current_stance || 'idle';
                    if (s.generated_assets[stance]) {
                        frames = s.generated_assets[stance].file_paths;
                    } else if (s.generated_assets['idle']) {
                        frames = s.generated_assets['idle'].file_paths;
                    } else {
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
                        // NEW PROP: Triggers pop-in/pop-out animation in component
                        isVisible={isVisible}
                    />
                );
            })}

            {/* Pass the text and click handler to the Book, controlled by totalSteps */}
            <MagicBook 
                onPress={onOpenBook} 
                pageText={bookText} 
                isVisible={isBookVisible}
            />
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