import React, { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { useTexture } from '@react-three/drei/native';
import * as THREE from 'three';

interface AnimatedBackgroundProps {
  frames: string[];
  fps?: number;
}

// 1x1 Pixel Transparent PNG Base64 to satisfy hook when frames are empty
const PLACEHOLDER_IMG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

export const AnimatedBackground: React.FC<AnimatedBackgroundProps> = ({ frames, fps = 0.5 }) => {
  // 1. Defensive Hook Usage: Always pass a non-empty array
  const textureSources = (frames && frames.length > 0) ? frames : [PLACEHOLDER_IMG];
  
  // 2. Load Textures (Always called)
  const loadedTextures = useTexture(textureSources);

  // 3. Logic to determine if we are in "Real" mode or "Placeholder" mode
  const isPlaceholder = !frames || frames.length === 0;

  const [currentIndex, setCurrentIndex] = useState(0);
  const timer = useRef(0);
  const interval = 1 / fps;

  useFrame((state, delta) => {
    if (!isPlaceholder && loadedTextures.length > 1) {
      timer.current += delta;
      if (timer.current >= interval) {
        timer.current = 0;
        setCurrentIndex((prev) => (prev + 1) % loadedTextures.length);
      }
    }
  });

  return (
    <group rotation={[0, -Math.PI / 2, 0]}>
      {/* Huge sphere for 360 effect */}
      <mesh scale={[-1, 1, 1]}> 
        <sphereGeometry args={[40, 32, 32]} />
        {isPlaceholder ? (
           // Placeholder: Dark Void
           <meshBasicMaterial color="#050505" side={THREE.BackSide} />
        ) : (
           // Real Texture
           <meshBasicMaterial 
             map={loadedTextures[currentIndex]} 
             side={THREE.BackSide} 
             transparent={false}
           />
        )}
      </mesh>
    </group>
  );
};