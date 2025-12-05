import React, { useRef, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface AnimatedBackgroundProps {
  frames: string[];
  fps?: number;
  isVisible: boolean; 
}

const PLACEHOLDER_IMG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

export const AnimatedBackground: React.FC<AnimatedBackgroundProps> = ({ frames, fps = 0.5, isVisible }) => {
  const [loadedTextures, setLoadedTextures] = useState<THREE.Texture[]>([]);
  const [isPlaceholder, setIsPlaceholder] = useState(true);

  // Manual Loader to handle 404s gracefully
  useEffect(() => {
    const textureLoader = new THREE.TextureLoader();
    // Default to placeholder immediately
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
                (tex) => resolve(tex), // Success
                undefined,
                (err) => { // Error
                    console.warn(`Failed to load background frame: ${url}. Status: 404/Error.`);
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
  const interval = 1 / fps;
  const materialRef = useRef<THREE.MeshBasicMaterial>(null); 

  useFrame((state, delta) => {
    if (!isPlaceholder && loadedTextures.length > 1) {
      timer.current += delta;
      if (timer.current >= interval) {
        timer.current = 0;
        setCurrentIndex((prev) => (prev + 1) % loadedTextures.length);
      }
    }

    if (materialRef.current) {
        const targetOpacity = isVisible ? 1 : 0;
        materialRef.current.opacity = THREE.MathUtils.lerp(
            materialRef.current.opacity,
            targetOpacity,
            delta * 10 
        );

        if (materialRef.current.transparent === false) {
             materialRef.current.transparent = true;
        }
    }
  });

  // Safely get current texture, defaulting to first if index is out of bounds
  const activeTexture = loadedTextures[currentIndex] || loadedTextures[0];

  if (!activeTexture) return null;

  return (
    <group rotation={[0, -Math.PI / 2, 0]}>
      <mesh scale={[-1, 1, 1]}> 
        <sphereGeometry args={[40, 32, 32]} />
        {isPlaceholder ? (
           <meshBasicMaterial color="#050505" side={THREE.BackSide} />
        ) : (
           <meshBasicMaterial 
             ref={materialRef} 
             map={activeTexture} 
             side={THREE.BackSide} 
             transparent={true} 
             opacity={0} 
           />
        )}
      </mesh>
    </group>
  );
};