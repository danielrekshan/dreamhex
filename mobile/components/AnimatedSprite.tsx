import React, { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { useTexture, Billboard } from '@react-three/drei/native';
import * as THREE from 'three';

interface AnimatedSpriteProps {
  frames: string[];
  position?: [number, number, number];
  scale?: number; // NEW: Scale factor
  onPress?: () => void;
}

const PLACEHOLDER_IMG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

export const AnimatedSprite: React.FC<AnimatedSpriteProps> = ({ 
  frames, 
  position = [0, 0, 0], 
  scale = 1.0,
  onPress 
}) => {
  const textureSources = (frames && frames.length > 0) ? frames : [PLACEHOLDER_IMG];
  const loadedTextures = useTexture(textureSources);
  const isPlaceholder = !frames || frames.length === 0;

  const [currentIndex, setCurrentIndex] = useState(0);
  const timer = useRef(0);
  const interval = 1 / 6;

  useFrame((state, delta) => {
    if (!isPlaceholder && loadedTextures.length > 1) {
      timer.current += delta;
      if (timer.current >= interval) {
        timer.current = 0;
        setCurrentIndex((prev) => (prev + 1) % loadedTextures.length);
      }
    }
  });

  if (isPlaceholder) return null;

  // Base size is 4x4, we multiply by scale prop
  const size = 4 * scale;

  return (
    <Billboard position={position} follow={true}>
      <mesh onClick={(e) => { e.stopPropagation(); if(onPress) onPress(); }}>
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