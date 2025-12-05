import React from 'react';
import { GroupProps } from '@react-three/fiber';

interface MagicBookProps extends GroupProps {
  onPress: () => void;
}

export const MagicBook: React.FC<MagicBookProps> = ({ onPress, ...props }) => {
  return (
    // Positioned low (-5.5) to act as a "foundation" for the world
    <group position={[0, -5.5, 0]} scale={0.6} {...props}>
      
      {/* 1. The Book Cover (Dark Leather) */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[15, 1, 12]} />
        <meshStandardMaterial color="#3e2723" roughness={0.9} />
      </mesh>

      {/* 2. The Pages (Paper block) */}
      <mesh position={[0, 0.6, 0]}>
        <boxGeometry args={[14, 0.5, 11]} />
        <meshStandardMaterial color="#f5f5dc" roughness={0.5} />
      </mesh>

      {/* 3. The Binding/Spine Detail */}
      <mesh position={[-7.2, 0.2, 0]}>
        <boxGeometry args={[1, 1.2, 12.2]} />
        <meshStandardMaterial color="#2d1b15" />
      </mesh>

      {/* 4. THE INTERACTION BUTTON */}
      {/* A raised red seal/gem on the page. Only clicking THIS opens the UI. */}
      <mesh 
        position={[0, 1.2, 3]} 
        onClick={(e) => {
          e.stopPropagation(); // Stop event from bubbling
          onPress();
        }}
      >
        <cylinderGeometry args={[1, 1, 0.2, 32]} />
        <meshStandardMaterial color="#b71c1c" emissive="#500000" emissiveIntensity={0.5} />
      </mesh>
      
    </group>
  );
};