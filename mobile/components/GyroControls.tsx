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

    // --- RAW MAPPING FOR LANDSCAPE (HOME BUTTON RIGHT) ---
    // Alpha (Compass) => Rotation around Y (Looking Left/Right)
    // Gamma (Tilt Left/Right) => Rotation around X (Looking Up/Down)
    // Beta  (Tilt Fwd/Back) => Rotation around Z (Head Tilt)

    // 1. Create Euler. Order 'YXZ' minimizes gimbal lock for looking around.
    // Note: We might need to invert (-) some values depending on the device.
    const camX = gamma;  // Look Up/Down
    const camY = alpha;  // Look Left/Right
    const camZ = beta - (Math.PI / 2); // Offset to hold phone upright
    
    const euler = new THREE.Euler(camX, camY, 0, 'YXZ'); // Z is 0 to lock head-tilt for stability
    
    // 2. Apply -90 degree offset to "Look Forward" instead of "Look Down"
    // (Three.js camera defaults to looking down -Z axis)
    const finalQuat = new THREE.Quaternion().setFromEuler(euler);
    
    // Rotate -90 degrees around X to lift eyes to horizon
    const offset = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2);
    finalQuat.multiply(offset);

    // 3. Smoothly rotate camera
    camera.quaternion.slerp(finalQuat, 0.1);
  });

  return null;
};