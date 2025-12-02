import React from 'react';
import { Billboard } from '@react-three/drei/native';
import * as THREE from 'three';

interface MagicBookProps {
  onPress: () => void;
}

export const MagicBook: React.FC<MagicBookProps> = ({ onPress }) => {
  return (
    // Position: Down (y=-2) and slightly forward (z=-1.5)
    <group position={[0, -2.5, -1.5]} rotation={[-Math.PI / 3, 0, 0]}>
      <mesh onClick={onPress}>
        {/* The Book Body */}
        <boxGeometry args={[3, 0.2, 2]} /> 
        <meshStandardMaterial color="#8b4513" />
      </mesh>
      
      {/* The "Pages" (White box on top) */}
      <mesh position={[0, 0.11, 0]}>
        <planeGeometry args={[2.8, 1.8]} />
        <meshStandardMaterial color="#f5f5dc" />
      </mesh>
    </group>
  );
};