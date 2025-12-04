import React, { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { useTexture, Billboard } from '@react-three/drei/native';
import * as THREE from 'three';
import { Texture } from 'three'; // Import Texture type for clarity

interface AnimatedSpriteProps {
  frames: string[]; // List of individual frame URLs
  fps?: number;
  position?: [number, number, number];
  onPress?: () => void;
}

const PLACEHOLDER_SPRITE_COLOR = 0x5d4037; // Brown/Red color for a book/magic feel

export const AnimatedSprite: React.FC<AnimatedSpriteProps> = ({
  frames,
  fps = 8,
  position = [0, 0, 0],
  onPress
}) => {
  let loadedTextures: (Texture | undefined)[] = [];
  
  try {
    // useTexture might return an array with undefined elements if loading fails partially
    loadedTextures = useTexture(frames);
  } catch (e) {
    console.error("Failed to load sprite textures, using placeholder logic.", e);
  }
  
  // CRITICAL: Filter out any failed or undefined textures. This ensures resilience.
  const validTextures = loadedTextures.filter((t): t is Texture => t instanceof THREE.Texture);

  // Fallback to a simple geometric placeholder if no valid textures are loaded
  if (validTextures.length === 0) {
      return (
        <group position={position} onClick={onPress}>
          <mesh position={[0, 1.5, 0]}>
             <boxGeometry args={[2, 3, 0.1]} />
             <meshBasicMaterial color={PLACEHOLDER_SPRITE_COLOR} wireframe={false} />
          </mesh>
        </group>
      );
  }

  // 2. Animation State (Only runs if we have frames)
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
  });
  
  // The current texture to display
  const currentTexture = validTextures[currentIndex];
  
  if (!currentTexture) return null;

  return (
    <Billboard position={position} follow={true} lockX={false} lockY={false} lockZ={false}>
      {/* Mesh visibility is managed by the animation logic through map switching */}
      <mesh onClick={onPress} visible={true}>
        <planeGeometry args={[3, 3]} />
        <meshBasicMaterial 
          map={currentTexture} // Use the current valid texture
          transparent={true} 
          side={THREE.DoubleSide} 
          alphaTest={0.1}
        />
      </mesh>
    </Billboard>
  );
};