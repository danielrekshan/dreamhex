import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Audio } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import * as api from '../api';

interface MusicPlayerProps {
  currentDreamSlug: string;
  isExiting: boolean;
}

const DEFAULT_VOLUME = 0.5;

export const MusicPlayer: React.FC<MusicPlayerProps> = ({ currentDreamSlug, isExiting }) => {
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const isFirstLoad = useRef(true);
  const currentVolume = useRef(isMuted ? 0 : DEFAULT_VOLUME); 
  const currentSoundId = useRef<number>(0); // Used to ensure only the latest sound object triggers playback logic
  
  // Define a counter to trigger new track loads from API
  const [trackChangeCount, setTrackChangeCount] = useState(0); 

  // Function to load and play a new track
  const loadMusic = useCallback(async (isDreamGate: boolean) => {
    // Increment the ID to prevent status updates from old sound objects
    currentSoundId.current += 1;
    const newSoundId = currentSoundId.current;
    
    // Unload previous sound if exists
    if (sound) {
        await sound.unloadAsync();
        setSound(null);
    }
    
    // 1. Determine the source (Local Intro or Remote Random Track)
    let source = null;
    if (isFirstLoad.current) {
        source = require('../assets/l1_orlando_fantasia.mp3');
        isFirstLoad.current = false;
    } else {
        const url = await api.getRandomMusic();
        if (url) {
            source = { uri: url };
        } else {
            // Fallback to local if fetch fails
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
          { shouldPlay: !isExiting, isLooping: false, volume: initialVolume }, // isLooping: false
          (status) => { // 3. Add onPlaybackStatusUpdate handler
              if (status.didJustFinish && newSoundId === currentSoundId.current) {
                  // Song finished playing, trigger next song load
                  setTrackChangeCount(prev => prev + 1);
              }
          }
        );
        setSound(newSound);
      } catch (e) {
        console.warn("Failed to load music:", e);
      }
    }
  }, [sound, isMuted, isExiting]); // Include dependencies

  // EFFECT 1: Handle Dream Change (New Slug)
  useEffect(() => {
    // Only trigger if not exiting, as loadMusic will run again when isExiting becomes false.
    if (!isExiting) {
        loadMusic(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentDreamSlug]); // Re-run when dream changes

  // EFFECT 2: Handle Track End (Triggered by onPlaybackStatusUpdate)
  useEffect(() => {
    if (trackChangeCount > 0 && !isExiting) {
        loadMusic(false); // Load next random song
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trackChangeCount]); // Re-run when a song finishes

  // EFFECT 3: Handle Fade-Out when Exiting
  useEffect(() => {
    let fadeInterval: NodeJS.Timeout | null = null;
    const FADE_DURATION = 1000; // 1 second fade
    const STEPS = 20;
    const STEP_INTERVAL = FADE_DURATION / STEPS;
    
    if (isExiting && sound) {
      const startVolume = currentVolume.current; 
      const volumeStep = startVolume / STEPS;

      let currentStep = 0;
      
      fadeInterval = setInterval(async () => {
        if (currentStep < STEPS) {
          const newVolume = Math.max(0, startVolume - volumeStep * (currentStep + 1));
          await sound.setVolumeAsync(newVolume);
          currentStep++;
        } else {
          if (fadeInterval) clearInterval(fadeInterval);
          await sound.setVolumeAsync(0); 
          // Sound object is effectively silent until it is unloaded by the next track load in the dream change effect.
        }
      }, STEP_INTERVAL);
    } 
    
    // Cleanup interval
    return () => {
      if (fadeInterval) clearInterval(fadeInterval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isExiting, sound]); 


  // Handle Mute Toggling
  const toggleMute = async () => {
    if (sound) {
      const newMutedState = !isMuted;
      setIsMuted(newMutedState);
      
      const targetVolume = newMutedState ? 0 : DEFAULT_VOLUME;
      
      if (!newMutedState) {
        currentVolume.current = DEFAULT_VOLUME; 
      }
      
      await sound.setVolumeAsync(targetVolume);
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