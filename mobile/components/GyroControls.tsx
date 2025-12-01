import React, { useEffect, useRef } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { DeviceMotion } from 'expo-sensors';
import * as THREE from 'three';

export const GyroControls = () => {
  const { camera } = useThree();
  const sensorData = useRef({ alpha: 0, beta: 0, gamma: 0 });

  useEffect(() => {
    // Fast updates for smooth movement
    DeviceMotion.setUpdateInterval(16);
    
    const sub = DeviceMotion.addListener((data) => {
      if (data.rotation) {
        sensorData.current = data.rotation;
      }
    });

    return () => sub.remove();
  }, []);

  useFrame(() => {
    const { alpha, beta, gamma } = sensorData.current;

    // --- RAW MAPPING (Landscape Home-Right Standard) ---
    // Alpha (Compass) => Rotation around Y (Looking Left/Right)
    // Gamma (Tilt Left/Right) => Rotation around X (Looking Up/Down)
    // Beta  (Tilt Fwd/Back) => Rotation around Z (Head Tilt)

    const camX = gamma;  // Look Up/Down
    const camY = alpha;  // Look Left/Right
    
    // We lock Z to 0 for now to prevent the "dizzying roll" 
    // while you debug the axes.
    const camZ = 0; 
    
    // YXZ order prevents "steering wheel" rotation when looking up
    const euler = new THREE.Euler(camX, camY, camZ, 'YXZ');
    
    const finalQuat = new THREE.Quaternion().setFromEuler(euler);
    
    // OFFSET: Rotate -90 degrees around X to lift eyes to horizon
    // (Without this, you look at the floor/Green Axis)
    const offset = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2);
    finalQuat.multiply(offset);

    // Smoothly rotate camera
    camera.quaternion.slerp(finalQuat, 0.1);
  });

  return null;
};