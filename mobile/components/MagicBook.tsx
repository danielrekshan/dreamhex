import React from 'react';
import { GroupProps } from '@react-three/fiber';
import { Text } from '@react-three/drei/native';

interface MagicBookProps extends GroupProps {
  onPress: () => void;
  pageText?: string;
}

export const MagicBook: React.FC<MagicBookProps> = ({ onPress, pageText, ...props }) => {
  return (
    // Positioned low (-5.5) to act as a "foundation" for the world
    // Added onClick here to make the whole book interactive
    <group 
        position={[0, -5.5, 0]} 
        scale={0.6} 
        onClick={(e) => {
             e.stopPropagation();
             onPress();
        }}
        {...props}
    >
      
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

      {/* 4. Page Text Preview */}
      {pageText && (
          <Text
            position={[0, 0.86, 0]} // Slightly above the paper surface
            rotation={[-Math.PI / 2, 0, Math.PI / 2]} // Laying flat, rotated to face 'up' in standard view if needed, or Z-up
            fontSize={0.5}
            color="#3e2723"
            maxWidth={10}
            textAlign="center"
            anchorX="center"
            anchorY="middle"
          >
            {pageText.substring(0, 300) + (pageText.length > 300 ? "..." : "")}
          </Text>
      )}
      
    </group>
  );
};