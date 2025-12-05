import React, { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { useTexture, Billboard } from '@react-three/drei/native';
import * as THREE from 'three';

interface AnimatedSpriteProps {
  frames: string[];
  position?: [number, number, number];
  scale?: number; // NEW: Scale factor
  onPress?: () => void;
  isVisible: boolean; // ADDED PROP
}

const PLACEHOLDER_IMG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

export const AnimatedSprite: React.FC<AnimatedSpriteProps> = ({ 
  frames, 
  position = [0, 0, 0], 
  scale = 1.0,
  onPress,
  isVisible // ADDED PROP
}) => {
  const textureSources = (frames && frames.length > 0) ? frames : [PLACEHOLDER_IMG];
  const loadedTextures = useTexture(textureSources);
  const isPlaceholder = !frames || frames.length === 0;

  const [currentIndex, setCurrentIndex] = useState(0);
  const timer = useRef(0);
  const interval = 1 / 6;
  
  const spriteRef = useRef<THREE.Mesh>(null); // ADDED REF

  // Base size is 4x4, we multiply by scale prop
  const size = 4 * scale;

  useFrame((state, delta) => {
    if (!isPlaceholder && loadedTextures.length > 1) {
      timer.current += delta;
      if (timer.current >= interval) {
        timer.current = 0;
        setCurrentIndex((prev) => (prev + 1) % loadedTextures.length);
      }
    }
    
    // NEW: Scale animation for entrance/exit (pop-in/pop-out effect)
    if (spriteRef.current) {
        const targetScale = isVisible ? 1 : 0.001; // Scale from 0.001 to 1 and back
        const currentScale = spriteRef.current.scale.x;
        
        // Simple linear interpolation (lerp) for smooth scale change
        const newScale = THREE.MathUtils.lerp(
            currentScale,
            targetScale,
            delta * 8 // UPDATED: Faster transition speed
        );
        
        spriteRef.current.scale.set(newScale, newScale, newScale);
    }
  });

  if (isPlaceholder) return null;

  return (
    <Billboard position={position} follow={true}>
      <mesh 
        ref={spriteRef} // ADDED REF
        onClick={(e) => { e.stopPropagation(); if(onPress) onPress(); }}
        scale={[0.001, 0.001, 0.001]} // Start hidden, will be animated by useFrame
      >
        <planeGeometry args={[size, size]} />
        <meshBasicMaterial 
          map={loadedTextures[currentIndex]} 
          transparent={true} 
          side={THREE.DoubleSide}
          alphaTest={0.1}
        />
      </mesh>
    </Billboard>
  );
};