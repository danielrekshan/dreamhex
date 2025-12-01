import React, { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { useTexture } from '@react-three/drei/native';
import * as THREE from 'three';

interface AnimatedBackgroundProps {
  frames: string[];
  fps?: number;
}

export const AnimatedBackground: React.FC<AnimatedBackgroundProps> = ({ frames, fps = 6 }) => {
  // 1. Load all textures upfront
  const textures = useTexture(frames);
  
  // 2. Animation State
  const [currentIndex, setCurrentIndex] = useState(0);
  const timer = useRef(0);
  const interval = 1 / fps;

  useFrame((state, delta) => {
    timer.current += delta;
    if (timer.current >= interval) {
      timer.current = 0;
      setCurrentIndex((prev) => (prev + 1) % textures.length);
    }
  });

  return (
    <group rotation={[0, -Math.PI / 2, 0]}>
      {/* RENDER STRATEGY:
         Instead of swapping textures (which lags), we create one sphere per frame.
         We just toggle 'visible' on/off. This is instant on the GPU.
      */}
      {textures.map((texture, i) => (
        <mesh key={i} visible={currentIndex === i}>
          {/* Back to SphereGeometry as requested */}
          <sphereGeometry args={[10, 32, 32]} />
          
          {/* BackSide = View from inside */}
          <meshBasicMaterial 
            map={texture} 
            side={THREE.BackSide} 
          />
        </mesh>
      ))}
    </group>
  );
};