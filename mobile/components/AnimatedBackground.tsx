import React, { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { useTexture } from '@react-three/drei/native';
import * as THREE from 'three';
import { Texture } from 'three'; // Import Texture type for clarity

interface AnimatedBackgroundProps {
  frames: string[];
  fps?: number;
}

const PLACEHOLDER_BG_COLOR = 0x1a1a1a;

export const AnimatedBackground: React.FC<AnimatedBackgroundProps> = ({ frames, fps = 6 }) => {
  let loadedTextures: (Texture | undefined)[] = [];
  
  try {
    // useTexture might return an array with undefined elements if loading fails partially
    loadedTextures = useTexture(frames); 
  } catch (e) {
    console.error("Failed to load background textures, using placeholder logic.", e);
    // If the entire loading process fails, we default to the placeholder
  }
  
  // CRITICAL: Filter out any failed or undefined textures. This ensures resilience.
  const validTextures = loadedTextures.filter((t): t is Texture => t instanceof THREE.Texture);

  // If we have no valid textures, render the placeholder.
  if (validTextures.length === 0) {
      return (
        // Fallback to a single solid colored mesh
        <mesh scale={[-10, 10, 10]}>
            <sphereGeometry args={[1, 32, 32]} />
            <meshBasicMaterial color={PLACEHOLDER_BG_COLOR} side={THREE.BackSide} />
        </mesh>
      );
  }

  // 2. Animation State
  const [currentIndex, setCurrentIndex] = useState(0);
  const timer = useRef(0);
  const interval = 1 / fps;
  const frameCount = validTextures.length;
  
  useFrame((state, delta) => {
    // Only animate if we have more than one frame
    if (frameCount > 1) {
        timer.current += delta;
        if (timer.current >= interval) {
          timer.current = 0;
          setCurrentIndex((prev) => (prev + 1) % frameCount);
        }
    }
    // If frameCount is 1, the single frame renders statically.
  });

  return (
    <group rotation={[0, -Math.PI / 2, 0]}>
      {/* RENDER STRATEGY: Toggle visibility of the sphere meshes */}
      {/* We only map over validTextures, ensuring no null/undefined is passed to map */}
      {validTextures.map((texture, i) => (
        <mesh key={i} visible={currentIndex === i}>
          <sphereGeometry args={[10, 32, 32]} />
          
          <meshBasicMaterial 
            map={texture} 
            side={THREE.BackSide} 
          />
        </mesh>
      ))}
    </group>
  );
};