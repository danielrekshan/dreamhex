import React, { useRef, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Billboard } from '@react-three/drei/native';
import * as THREE from 'three';

interface AnimatedSpriteProps {
  frames: string[];
  position?: [number, number, number];
  scale?: number; 
  onPress?: () => void;
  isVisible: boolean; 
}

const PLACEHOLDER_IMG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

export const AnimatedSprite: React.FC<AnimatedSpriteProps> = ({ 
  frames, 
  position = [0, 0, 0], 
  scale = 1.0,
  onPress,
  isVisible 
}) => {
  const [loadedTextures, setLoadedTextures] = useState<THREE.Texture[]>([]);
  const [isPlaceholder, setIsPlaceholder] = useState(true);

  // Manual Loader to handle 404s gracefully
  useEffect(() => {
    const textureLoader = new THREE.TextureLoader();
    const placeholderTex = textureLoader.load(PLACEHOLDER_IMG);

    if (!frames || frames.length === 0) {
        setLoadedTextures([placeholderTex]);
        setIsPlaceholder(true);
        return;
    }

    const loadTextureSafe = (url: string) => {
        return new Promise<THREE.Texture>((resolve) => {
            textureLoader.load(
                url,
                (tex) => resolve(tex),
                undefined,
                (err) => {
                    console.warn(`Failed to load sprite frame: ${url}. Status: 404/Error.`);
                    resolve(placeholderTex); // Fallback
                }
            );
        });
    };

    Promise.all(frames.map(frame => loadTextureSafe(frame))).then(textures => {
        setLoadedTextures(textures);
        setIsPlaceholder(false);
    });
  }, [frames]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const timer = useRef(0);
  const interval = 1 / 6;
  
  const spriteRef = useRef<THREE.Mesh>(null); 
  const size = 4 * scale;

  useFrame((state, delta) => {
    if (!isPlaceholder && loadedTextures.length > 1) {
      timer.current += delta;
      if (timer.current >= interval) {
        timer.current = 0;
        setCurrentIndex((prev) => (prev + 1) % loadedTextures.length);
      }
    }
    
    if (spriteRef.current) {
        const targetScale = isVisible ? 1 : 0.001; 
        const currentScale = spriteRef.current.scale.x;
        
        const newScale = THREE.MathUtils.lerp(
            currentScale,
            targetScale,
            delta * 8 
        );
        
        spriteRef.current.scale.set(newScale, newScale, newScale);
    }
  });

  const activeTexture = loadedTextures[currentIndex] || loadedTextures[0];

  if (!activeTexture || isPlaceholder) return null;

  return (
    <Billboard position={position} follow={true}>
      <mesh 
        ref={spriteRef} 
        onClick={(e) => { e.stopPropagation(); if(onPress) onPress(); }}
        scale={[0.001, 0.001, 0.001]} 
      >
        <planeGeometry args={[size, size]} />
        <meshBasicMaterial 
          map={activeTexture} 
          transparent={true} 
          side={THREE.DoubleSide}
          alphaTest={0.1}
        />
      </mesh>
    </Billboard>
  );
};