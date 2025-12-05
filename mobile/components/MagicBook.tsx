import React, { useRef } from 'react';
import { GroupProps, useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei/native';
import * as THREE from 'three';

interface MagicBookProps extends GroupProps {
  onPress: () => void;
  leftPageText?: string;
  rightPageText?: string;
  isVisible: boolean;
}

// Constants reflecting the component's design
const BASE_POSITION: [number, number, number] = [0, -6.0, 0]; 
const BASE_SCALE = 1.0; 
const ANIMATION_SPEED = 8; 

// Book geometry constants
const PAGE_WIDTH = 6;
const PAGE_HEIGHT = 8; // Depth (Z-axis in this group space)
const PAGE_THICKNESS = 0.2;
const COVER_THICKNESS = 0.3;
const SPINE_RADIUS = 0.4;
const OPEN_ANGLE = 0; 

// Helper to strip markdown and truncate text for 3D display
const stripMarkdown = (str: string | undefined) => {
    if (!str) return "";
    // Aggressively remove markdown syntax: bold, italic, headers, links, and list markers
    let clean = str
        .replace(/(\*\*|__)(.*?)\1/g, '$2')  // Remove **bold**
        .replace(/(\*|_)(.*?)\1/g, '$2')    // Remove *italic*
        .replace(/#+\s/g, '')               // Remove headers (##, ###)
        .replace(/\[(.*?)\]\(.*?\)/g, '$1') // Remove [links](url)
        .replace(/`([^`]+)`/g, '$1')        // Remove inline code
        .replace(/^-\s/gm, '')              // Remove list items (- item)
        .replace(/\n\n+/g, '\n\n')          // Consolidate extra newlines
        .trim();
        
    return clean;
};

const truncate = (str: string | undefined, length: number) => {
    const clean = stripMarkdown(str);
    return clean.length > length ? clean.substring(0, length) + "..." : clean;
};

export const MagicBook: React.FC<MagicBookProps> = ({ onPress, leftPageText, rightPageText, isVisible, ...props }) => {
  const groupRef = useRef<THREE.Group>(null);

  // Calculate the horizontal offset for pages to sit flush next to the spine (centered at 0)
  const PAGE_CENTER_OFFSET = PAGE_WIDTH / 2 + SPINE_RADIUS;

  useFrame((state, delta) => {
    if (groupRef.current) {
        const targetScale = isVisible ? BASE_SCALE : 0.001; 
        const currentScale = groupRef.current.scale.x;
        const newScale = THREE.MathUtils.lerp(currentScale, targetScale, delta * ANIMATION_SPEED);
        groupRef.current.scale.set(newScale, newScale, newScale);
        
        // Gentle hovering is maintained
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
        {/* The book is now flat on the XZ plane */}
        <group>
            
            {/* --- LEFT SIDE --- */}
            <group rotation={[0, OPEN_ANGLE, 0]} position={[-PAGE_CENTER_OFFSET, 0, 0]}>
                {/* Cover (Lying flat on the Y=0 plane) */}
                <mesh position={[0, -0.2, 0]}>
                    <boxGeometry args={[PAGE_WIDTH, COVER_THICKNESS, PAGE_HEIGHT]} />
                    <meshStandardMaterial color="#3e2723" roughness={0.9} />
                </mesh>
                {/* Page */}
                <mesh position={[0, 0.1, 0]}>
                    <boxGeometry args={[PAGE_WIDTH - 0.2, PAGE_THICKNESS, PAGE_HEIGHT - 0.4]} />
                    <meshStandardMaterial color="#fcfbf7" roughness={0.6} />
                </mesh>
                {/* Text */}
                <Text
                    position={[0, 0.3, 0]}
                    rotation={[-Math.PI / 2, 0, 0]} // Rotate 90 degrees on X to lay flat on page
                    fontSize={0.25}
                    color="#2d1b15"
                    maxWidth={PAGE_WIDTH - 1}
                    textAlign="left"
                    anchorX="center"
                    anchorY="middle"
                >
                    {truncate(leftPageText, 400)}
                </Text>
            </group>

            {/* --- SPINE --- */}
            {/* Cylinder is rotated 90 degrees on X to lay flat, running along Z (depth) axis */}
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
                {/* Page */}
                <mesh position={[0, 0.1, 0]}>
                    <boxGeometry args={[PAGE_WIDTH - 0.2, PAGE_THICKNESS, PAGE_HEIGHT - 0.4]} />
                    <meshStandardMaterial color="#fcfbf7" roughness={0.6} />
                </mesh>
                {/* Text */}
                <Text
                    position={[0, 0.3, 0]}
                    rotation={[-Math.PI / 2, 0, 0]} // Rotate 90 degrees on X to lay flat on page
                    fontSize={0.25}
                    color="#2d1b15"
                    maxWidth={PAGE_WIDTH - 1}
                    textAlign="left"
                    anchorX="center"
                    anchorY="middle"
                >
                    {truncate(rightPageText, 400)}
                </Text>
            </group>

        </group>
    </group>
  );
};