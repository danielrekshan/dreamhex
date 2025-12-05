import React, { useState, useEffect } from 'react';
import { 
    View, Text, StyleSheet, TouchableOpacity, Modal, 
    ScrollView, Image, TextInput, ActivityIndicator, 
    KeyboardAvoidingView, Platform 
} from 'react-native';

export interface EntityInteractionProps {
  visible: boolean;
  entityName: string;
  description: string;
  greeting: string;
  monologue?: string; // NEW: The deep response from the entity
  options: string[];
  frames: string[]; 
  isLoading: boolean;
  onSelectOption: (option: string) => void;
  onClose: () => void;
}

const EntityAvatar: React.FC<{ frames: string[] }> = ({ frames }) => {
  const [frameIndex, setFrameIndex] = useState(0);
  
  useEffect(() => {
    if (!frames || frames.length <= 1) return;
    const interval = setInterval(() => {
        setFrameIndex(prev => (prev + 1) % frames.length);
    }, 200); 
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
  visible, entityName, description, greeting, monologue, options, frames, isLoading, onSelectOption, onClose 
}) => {
  const [customInput, setCustomInput] = useState('');

  const handleCustomSubmit = () => {
      if (customInput.trim().length > 0) {
          onSelectOption(customInput);
          setCustomInput('');
      }
  };

  return (
    <Modal visible={visible} animationType="fade" transparent={true} onRequestClose={onClose}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        style={styles.overlay}
      >
        <View style={styles.dialogContainer}>
            
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.entityName}>{entityName}</Text>
                {!isLoading && (
                    <TouchableOpacity onPress={onClose} hitSlop={{top:10, bottom:10, left:10, right:10}}>
                        <Text style={styles.closeText}>✕</Text>
                    </TouchableOpacity>
                )}
            </View>

            <ScrollView style={styles.contentBody} contentContainerStyle={{alignItems: 'center', paddingBottom: 20}}>
                
                <EntityAvatar frames={frames} />

                {isLoading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="#3e2723" />
                        <Text style={styles.loadingText}>The entity is contemplating...</Text>
                    </View>
                ) : (
                    <>
                        {/* Static Description */}
                        {description ? <Text style={styles.descriptionText}>{description}</Text> : null}
                        
                        {/* Short Punchy Greeting */}
                        <Text style={styles.greetingText}>"{greeting}"</Text>

                        {/* NEW: Deep Monologue */}
                        {monologue ? (
                            <View style={styles.monologueContainer}>
                                <Text style={styles.monologueText}>{monologue}</Text>
                            </View>
                        ) : null}
                        
                        <View style={styles.separator} />
                        
                        {/* Options */}
                        <View style={{width: '100%', marginBottom: 15}}>
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

                        {/* Write-in */}
                        <View style={styles.inputContainer}>
                            <TextInput
                                style={styles.textInput}
                                placeholder="Speak your mind..."
                                placeholderTextColor="#8d6e63"
                                value={customInput}
                                onChangeText={setCustomInput}
                            />
                            <TouchableOpacity style={styles.sendBtn} onPress={handleCustomSubmit}>
                                <Text style={styles.sendBtnText}>SEND</Text>
                            </TouchableOpacity>
                        </View>
                    </>
                )}

            </ScrollView>

        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { 
      flex: 1, 
      backgroundColor: 'rgba(0,0,0,0.8)', 
      justifyContent: 'center', 
      alignItems: 'center'      
  },
  dialogContainer: { 
    width: '90%',     
    height: '90%',    
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
  
  avatarContainer: {
      width: 140,
      height: 140,
      marginBottom: 10,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'rgba(62, 39, 35, 0.1)',
      borderRadius: 70
  },
  avatarImage: { width: '100%', height: '100%' },
  placeholderAvatar: { width: 120, height: 120, backgroundColor: '#ccc', borderRadius: 60, marginBottom: 20 },

  descriptionText: { fontSize: 14, color: '#5d4037', textAlign: 'center', marginBottom: 10, fontStyle: 'italic', opacity: 0.8 },
  greetingText: { fontSize: 20, fontFamily: 'serif', color: '#3e2723', fontWeight: 'bold', marginBottom: 15, textAlign: 'center' },
  
  monologueContainer: {
      backgroundColor: '#efebe9',
      padding: 15,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: '#d7ccc8',
      marginBottom: 15,
      width: '100%'
  },
  monologueText: {
      fontSize: 16,
      color: '#3e2723',
      lineHeight: 24,
      fontFamily: 'serif'
  },

  separator: { height: 2, backgroundColor: '#d7ccc8', width: '100%', marginBottom: 15 },
  
  optionBtn: { 
      paddingVertical: 12, 
      paddingHorizontal: 10,
      marginBottom: 8,
      backgroundColor: '#fff', 
      borderRadius: 8,
      borderWidth: 1,
      borderColor: '#a1887f'
  },
  optionText: { fontSize: 16, color: '#3e2723', fontFamily: 'serif', textAlign: 'center' },

  inputContainer: {
      flexDirection: 'row',
      width: '100%',
      marginTop: 10,
      borderTopWidth: 1,
      borderTopColor: '#d7ccc8',
      paddingTop: 15
  },
  textInput: {
      flex: 1,
      backgroundColor: '#fff',
      borderWidth: 1,
      borderColor: '#8d6e63',
      borderRadius: 8,
      padding: 10,
      fontSize: 16,
      color: '#3e2723',
      fontFamily: 'serif'
  },
  sendBtn: {
      marginLeft: 10,
      backgroundColor: '#3e2723',
      justifyContent: 'center',
      paddingHorizontal: 15,
      borderRadius: 8
  },
  sendBtnText: {
      color: '#f5f5dc',
      fontWeight: 'bold',
      fontSize: 14
  },
  loadingContainer: { marginTop: 30, alignItems: 'center' },
  loadingText: { marginTop: 10, color: '#5d4037', fontSize: 16, fontStyle: 'italic' }
});