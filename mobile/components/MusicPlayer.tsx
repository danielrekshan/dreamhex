import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Audio } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import * as api from '../api';

interface MusicPlayerProps {
  currentDreamSlug: string;
  isExiting: boolean;
  hasInteracted?: boolean;
}

const DEFAULT_VOLUME = 0.5;

export const MusicPlayer: React.FC<MusicPlayerProps> = ({ currentDreamSlug, isExiting }) => {
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null); // Ref to hold sound for synchronous access
  const [isMuted, setIsMuted] = useState(false);
  const isFirstLoad = useRef(true);
  const currentVolume = useRef(isMuted ? 0 : DEFAULT_VOLUME); 
  const currentSoundId = useRef<number>(0); 
  
  const [trackChangeCount, setTrackChangeCount] = useState(0); 

  // Function to load and play a new track
  const loadMusic = useCallback(async (isDreamGate: boolean) => {
    // Increment ID to invalidate old pending callbacks
    currentSoundId.current += 1;
    const newSoundId = currentSoundId.current;
    
    // Immediately unload the current sound using the ref to prevent overlap
    if (soundRef.current) {
        try {
            await soundRef.current.unloadAsync();
        } catch (e) {
            console.warn("Error unloading previous sound", e);
        }
        soundRef.current = null;
        setSound(null);
    }
    
    // 1. Determine the source
    let source = null;
    if (isFirstLoad.current) {
        source = require('../assets/l1_orlando_fantasia.mp3');
        isFirstLoad.current = false;
    } else {
        const url = await api.getRandomMusic();
        if (url) {
            source = { uri: url };
        } else {
            source = require('../assets/l1_orlando_fantasia.mp3');
        }
    }

    if (source) {
      try {
        const initialVolume = isMuted ? 0 : DEFAULT_VOLUME;
        currentVolume.current = initialVolume;

        // 2. Create the new sound object
        const { sound: newSound } = await Audio.Sound.createAsync(
          source,
          { shouldPlay: !isExiting, isLooping: false, volume: initialVolume },
          (status) => {
              if (status.didJustFinish && newSoundId === currentSoundId.current) {
                  setTrackChangeCount(prev => prev + 1);
              }
          }
        );

        // Safety check: if we exited or started a new load while creating, unload immediately
        if (newSoundId !== currentSoundId.current || isExiting) {
             await newSound.unloadAsync();
             return;
        }

        soundRef.current = newSound; // Update ref
        setSound(newSound);          // Update state
      } catch (e) {
        console.warn("Failed to load music:", e);
      }
    }
  }, [isMuted, isExiting]); 

  // EFFECT 1: Handle Dream Change
  useEffect(() => {
    if (!isExiting) {
        loadMusic(true);
    }
  }, [currentDreamSlug, loadMusic]);

  // EFFECT 2: Handle Track End
  useEffect(() => {
    if (trackChangeCount > 0 && !isExiting) {
        loadMusic(false);
    }
  }, [trackChangeCount, isExiting, loadMusic]);

  // EFFECT 3: Fade Out
  useEffect(() => {
    let fadeInterval: NodeJS.Timeout | null = null;
    const FADE_DURATION = 1000;
    const STEPS = 20;
    const STEP_INTERVAL = FADE_DURATION / STEPS;
    
    // Use soundRef for fading logic to ensure we target the active sound
    if (isExiting && soundRef.current) {
      const activeSound = soundRef.current;
      const startVolume = currentVolume.current; 
      const volumeStep = startVolume / STEPS;

      let currentStep = 0;
      
      fadeInterval = setInterval(async () => {
        if (currentStep < STEPS) {
          const newVolume = Math.max(0, startVolume - volumeStep * (currentStep + 1));
          try {
             await activeSound.setVolumeAsync(newVolume);
          } catch(e) { /* ignore cleanup errors */ }
          currentStep++;
        } else {
          if (fadeInterval) clearInterval(fadeInterval);
          try {
             await activeSound.setVolumeAsync(0);
          } catch(e) {}
        }
      }, STEP_INTERVAL);
    } 
    
    return () => {
      if (fadeInterval) clearInterval(fadeInterval);
    };
  }, [isExiting]); 

  // Cleanup on Unmount
  useEffect(() => {
      return () => {
          if (soundRef.current) {
              soundRef.current.unloadAsync();
          }
      };
  }, []);

  const toggleMute = async () => {
    if (soundRef.current) {
      const newMutedState = !isMuted;
      setIsMuted(newMutedState);
      
      const targetVolume = newMutedState ? 0 : DEFAULT_VOLUME;
      if (!newMutedState) {
        currentVolume.current = DEFAULT_VOLUME; 
      }
      
      try {
        await soundRef.current.setVolumeAsync(targetVolume);
      } catch(e) {}
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={toggleMute} style={styles.button}>
        <Ionicons 
          name={isMuted || isExiting ? "volume-mute" : "volume-medium"} 
          size={24} 
          color="rgba(255,255,255,0.7)" 
        />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 30,
    right: 30,
    zIndex: 100,
  },
  button: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 10,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  }
});