import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView, Image } from 'react-native';

export interface EntityInteractionProps {
  visible: boolean;
  entityName: string;
  greeting: string;
  options: string[];
  frames: string[]; // NEW: Pass sprite frames to dialog
  onSelectOption: (option: string) => void;
  onClose: () => void;
}

// Sub-component to handle simple frame animation in RN View
const EntityAvatar: React.FC<{ frames: string[] }> = ({ frames }) => {
  const [frameIndex, setFrameIndex] = useState(0);
  
  useEffect(() => {
    if (!frames || frames.length <= 1) return;
    const interval = setInterval(() => {
        setFrameIndex(prev => (prev + 1) % frames.length);
    }, 150); // ~6-7 FPS
    return () => clearInterval(interval);
  }, [frames]);

  const currentSource = (frames && frames.length > 0) ? { uri: frames[frameIndex] } : null;

  if (!currentSource) return <View style={styles.placeholderAvatar} />;

  return (
    <View style={styles.avatarContainer}>
        <Image 
            source={currentSource} 
            style={styles.avatarImage} 
            resizeMode="contain" 
        />
    </View>
  );
};

export const EntityDialog: React.FC<EntityInteractionProps> = ({ 
  visible, entityName, greeting, options, frames, onSelectOption, onClose 
}) => {
  return (
    <Modal visible={visible} animationType="fade" transparent={true} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.dialogContainer}>
            
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.entityName}>{entityName}</Text>
                <TouchableOpacity onPress={onClose} hitSlop={{top:10, bottom:10, left:10, right:10}}>
                    <Text style={styles.closeText}>✕</Text>
                </TouchableOpacity>
            </View>

            {/* Content: Avatar + Text */}
            <ScrollView style={styles.contentBody} contentContainerStyle={{alignItems: 'center'}}>
                
                {/* Animated Entity Display */}
                <EntityAvatar frames={frames} />

                <Text style={styles.greetingText}>"{greeting}"</Text>
                
                <View style={styles.separator} />
                
                {/* Options List */}
                <View style={{width: '100%'}}>
                    {options.map((opt, index) => (
                        <TouchableOpacity 
                            key={index} 
                            style={styles.optionBtn} 
                            onPress={() => onSelectOption(opt)}
                        >
                            <Text style={styles.optionText}>✦ {opt}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </ScrollView>

        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { 
      flex: 1, 
      backgroundColor: 'rgba(0,0,0,0.7)', 
      justifyContent: 'center', // Centered vertically
      alignItems: 'center'      // Centered horizontally
  },
  dialogContainer: { 
    width: '90%',     // Take up most width
    height: '85%',    // Take up most height
    backgroundColor: '#f5f5dc', 
    borderRadius: 12, 
    borderWidth: 4, 
    borderColor: '#4e342e',
    overflow: 'hidden'
  },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    padding: 20, 
    backgroundColor: '#3e2723',
    alignItems: 'center'
  },
  entityName: { color: '#f5f5dc', fontSize: 22, fontFamily: 'serif', fontWeight: 'bold' },
  closeText: { color: '#f5f5dc', fontSize: 24, fontWeight: 'bold' },
  
  contentBody: { flex: 1, padding: 20 },
  
  // Avatar Styles
  avatarContainer: {
      width: 200,
      height: 200,
      marginBottom: 20,
      justifyContent: 'center',
      alignItems: 'center',
      // Optional: Add a subtle glow or background behind the entity
      backgroundColor: 'rgba(62, 39, 35, 0.1)',
      borderRadius: 100
  },
  avatarImage: {
      width: '100%',
      height: '100%'
  },
  placeholderAvatar: { width: 150, height: 150, backgroundColor: '#ccc', borderRadius: 75, marginBottom: 20 },

  greetingText: { fontSize: 22, fontFamily: 'serif', color: '#3e2723', fontStyle: 'italic', marginBottom: 20, textAlign: 'center' },
  
  separator: { height: 2, backgroundColor: '#d7ccc8', width: '100%', marginVertical: 15 },
  
  optionBtn: { paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#efebe9', width: '100%' },
  optionText: { fontSize: 18, color: '#5d4037', fontFamily: 'serif', textAlign: 'center' }
});