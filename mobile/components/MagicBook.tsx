import React, { useRef } from 'react';
import { GroupProps, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface MagicBookProps extends GroupProps {
  onPress: () => void;
  isVisible: boolean;
  // Keeping these optional so the parent component doesn't crash, 
  // but they are ignored in this version.
  leftPageText?: string;
  rightPageText?: string;
}

const BASE_POSITION: [number, number, number] = [0, -6.0, 0]; 
const BASE_SCALE = 1.0; 
const ANIMATION_SPEED = 8; 

// Book geometry constants
const PAGE_WIDTH = 6;
const PAGE_HEIGHT = 8; 
const PAGE_THICKNESS = 0.2;
const COVER_THICKNESS = 0.3;
const SPINE_RADIUS = 0.4;
const OPEN_ANGLE = 0; 

export const MagicBook: React.FC<MagicBookProps> = ({ onPress, isVisible, ...props }) => {
  const groupRef = useRef<THREE.Group>(null);

  const PAGE_CENTER_OFFSET = PAGE_WIDTH / 2 + SPINE_RADIUS;

  useFrame((state, delta) => {
    if (groupRef.current) {
        const targetScale = isVisible ? BASE_SCALE : 0.001; 
        const currentScale = groupRef.current.scale.x;
        const newScale = THREE.MathUtils.lerp(currentScale, targetScale, delta * ANIMATION_SPEED);
        groupRef.current.scale.set(newScale, newScale, newScale);
        
        // Gentle hovering
        groupRef.current.position.y = BASE_POSITION[1] + Math.sin(state.clock.elapsedTime) * 0.1;
    }
  });

  return (
    <group 
        ref={groupRef} 
        position={BASE_POSITION} 
        scale={0.001} 
        onClick={(e) => {
             e.stopPropagation();
             onPress();
        }}
        {...props}
    >
        <group>
            
            {/* --- LEFT SIDE --- */}
            <group rotation={[0, OPEN_ANGLE, 0]} position={[-PAGE_CENTER_OFFSET, 0, 0]}>
                {/* Cover */}
                <mesh position={[0, -0.2, 0]}>
                    <boxGeometry args={[PAGE_WIDTH, COVER_THICKNESS, PAGE_HEIGHT]} />
                    <meshStandardMaterial color="#3e2723" roughness={0.9} />
                </mesh>
                {/* Page (Solid Color) */}
                <mesh position={[0, 0.1, 0]}>
                    <boxGeometry args={[PAGE_WIDTH - 0.2, PAGE_THICKNESS, PAGE_HEIGHT - 0.4]} />
                    <meshStandardMaterial color="#fcfbf7" roughness={0.6} />
                </mesh>
            </group>

            {/* --- SPINE --- */}
            <mesh position={[0, -0.2, 0]} rotation={[Math.PI / 2, 0, 0]}> 
                <cylinderGeometry args={[SPINE_RADIUS, SPINE_RADIUS, PAGE_HEIGHT + 0.4, 12]} />
                <meshStandardMaterial color="#2d1b15" />
            </mesh>

            {/* --- RIGHT SIDE --- */}
            <group rotation={[0, -OPEN_ANGLE, 0]} position={[PAGE_CENTER_OFFSET, 0, 0]}>
                {/* Cover */}
                <mesh position={[0, -0.2, 0]}>
                    <boxGeometry args={[PAGE_WIDTH, COVER_THICKNESS, PAGE_HEIGHT]} />
                    <meshStandardMaterial color="#3e2723" roughness={0.9} />
                </mesh>
                {/* Page (Solid Color) */}
                <mesh position={[0, 0.1, 0]}>
                    <boxGeometry args={[PAGE_WIDTH - 0.2, PAGE_THICKNESS, PAGE_HEIGHT - 0.4]} />
                    <meshStandardMaterial color="#fcfbf7" roughness={0.6} />
                </mesh>
            </group>

        </group>
    </group>
  );
};