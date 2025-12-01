import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useTexture, Billboard } from '@react-three/drei/native';
import * as THREE from 'three';

interface AnimatedSpriteProps {
  uri: string;
  columns: number;
  rows: number;
  frameCount: number;
  fps?: number;
  position?: [number, number, number];
  onPress?: () => void;
}

export const AnimatedSprite: React.FC<AnimatedSpriteProps> = ({
  uri,
  columns,
  rows,
  frameCount,
  fps = 8, // Default to 8fps for that "hand-drawn" jerky feel
  position = [0, 0, 0],
  onPress
}) => {
  const texture = useTexture(uri);

  // Clone texture to ensure independent offsets if multiple sprites use the same sheet
  const spriteTexture = useMemo(() => {
    const t = texture.clone();
    // Set the "Window" size (e.g., if 2 cols, window is 0.5 wide)
    t.repeat.set(1 / columns, 1 / rows);
    
    // LinearFilter is better for watercolor/ink styles. 
    // Use NearestFilter if you want pixel-art crispness.
    t.magFilter = THREE.LinearFilter; 
    t.minFilter = THREE.LinearFilter;
    
    t.needsUpdate = true;
    return t;
  }, [texture, columns, rows]);

  // Animation Logic
  const timer = useRef(0);
  const currentFrame = useRef(0);
  const interval = 1 / fps;

  useFrame((state, delta) => {
    timer.current += delta;
    
    if (timer.current >= interval) {
      timer.current = 0;
      currentFrame.current = (currentFrame.current + 1) % frameCount;

      const col = currentFrame.current % columns;
      const row = Math.floor(currentFrame.current / columns);

      // Move the texture window
      // GL coordinates (0,0) are bottom-left. Images are top-left.
      // We calculate x normally, but flip y.
      spriteTexture.offset.x = col / columns;
      spriteTexture.offset.y = (rows - 1 - row) / rows; 
    }
  });

  return (
    <Billboard position={position} follow={true} lockX={false} lockY={false} lockZ={false}>
      <mesh onClick={onPress}>
        <planeGeometry args={[3, 3]} />
        <meshBasicMaterial 
          map={spriteTexture} 
          transparent={true} 
          side={THREE.DoubleSide} 
          alphaTest={0.1} // Helps discard invisible pixels
        />
      </mesh>
    </Billboard>
  );
};