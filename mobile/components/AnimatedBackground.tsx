import React, { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { useTexture } from '@react-three/drei/native';
import * as THREE from 'three';

interface AnimatedBackgroundProps {
  frames: string[];
  fps?: number;
  isVisible: boolean; // ADDED PROP
}

// 1x1 Pixel Transparent PNG Base64 to satisfy hook when frames are empty
const PLACEHOLDER_IMG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

export const AnimatedBackground: React.FC<AnimatedBackgroundProps> = ({ frames, fps = 0.5, isVisible }) => {
  // 1. Defensive Hook Usage: Always pass a non-empty array
  const textureSources = (frames && frames.length > 0) ? frames : [PLACEHOLDER_IMG];
  
  // 2. Load Textures (Always called)
  const loadedTextures = useTexture(textureSources);

  // 3. Logic to determine if we are in "Real" mode or "Placeholder" mode
  const isPlaceholder = !frames || frames.length === 0;

  const [currentIndex, setCurrentIndex] = useState(0);
  const timer = useRef(0);
  const interval = 1 / fps;
  const materialRef = useRef<THREE.MeshBasicMaterial>(null); // ADDED REF

  useFrame((state, delta) => {
    if (!isPlaceholder && loadedTextures.length > 1) {
      timer.current += delta;
      if (timer.current >= interval) {
        timer.current = 0;
        setCurrentIndex((prev) => (prev + 1) % loadedTextures.length);
      }
    }

    // NEW: Opacity animation for entrance/exit (FADE IN/OUT)
    if (materialRef.current) {
        const targetOpacity = isVisible ? 1 : 0;
        // Simple linear interpolation (lerp) for smooth fade
        materialRef.current.opacity = THREE.MathUtils.lerp(
            materialRef.current.opacity,
            targetOpacity,
            delta * 10 // UPDATED: Faster fade speed
        );

        // Ensure transparency is enabled if we're fading
        if (materialRef.current.transparent === false) {
             materialRef.current.transparent = true;
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
             ref={materialRef} // ADDED REF
             map={loadedTextures[currentIndex]} 
             side={THREE.BackSide} 
             transparent={true} // Must be true for opacity to work
             opacity={0} // Start hidden
           />
        )}
      </mesh>
    </group>
  );
};