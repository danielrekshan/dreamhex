import React, { useRef } from 'react';
import { GroupProps, useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei/native';
import * as THREE from 'three';

interface MagicBookProps extends GroupProps {
  onPress: () => void;
  pageText?: string;
  isVisible: boolean; // ADDED PROP for animation
}

// Constants reflecting the component's original design
const BASE_POSITION: [number, number, number] = [0, -5.5, 0];
const BASE_SCALE = 0.6; 
const ANIMATION_SPEED = 8; // UPDATED: Faster speed

export const MagicBook: React.FC<MagicBookProps> = ({ onPress, pageText, isVisible, ...props }) => {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state, delta) => {
    if (groupRef.current) {
        // Target scale is the base scale (0.6) when visible, 0.001 when hidden
        const targetScale = isVisible ? BASE_SCALE : 0.001; 
        const currentScale = groupRef.current.scale.x;
        
        // Lerp for smooth scale transition (Pop-in/Pop-out effect)
        const newScale = THREE.MathUtils.lerp(
            currentScale,
            targetScale,
            delta * ANIMATION_SPEED 
        );
        
        groupRef.current.scale.set(newScale, newScale, newScale);
    }
  });

  return (
    // Attach ref to the main group for animation control
    <group 
        ref={groupRef} 
        position={BASE_POSITION} 
        // Initial scale is set low, quickly corrected by useFrame
        scale={0.001} 
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
            position={[0, 0.86, 0]} 
            rotation={[-Math.PI / 2, 0, Math.PI / 2]} 
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