import React, { useState, useEffect } from 'react';
import { 
    View, Text, StyleSheet, TouchableOpacity, Modal, 
    ScrollView, Image, TextInput, ActivityIndicator, 
    KeyboardAvoidingView, Platform 
} from 'react-native';
import { BookPage } from '../BookManifest'; // Import type

export interface EntityInteractionProps {
  visible: boolean;
  entityName: string;
  description: string;
  greeting: string;
  monologue?: string; 
  options: string[];
  frames: string[]; 
  isLoading: boolean;
  onSelectOption: (option: string) => void;
  onClose: () => void;
  
  // New Prop for Page Discovery
  foundPage?: BookPage | null;
}

// Module-level cache to track seen content across re-renders/unmounts (Keeping for original logic)
const viewedContentCache = new Set<string>();

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
        <Image source={currentSource} style={styles.avatarImage} resizeMode="contain" />
    </View>
  );
};

export const EntityDialog: React.FC<EntityInteractionProps> = ({ 
  visible, entityName, description, greeting, monologue, options, frames, isLoading, onSelectOption, onClose, foundPage
}) => {
  const [customInput, setCustomInput] = useState('');
  const [typingPhase, setTypingPhase] = useState<'idle' | 'greeting' | 'monologue' | 'options' | 'done'>('done'); // Simplified typing animation for this scope
  const [visibleOptionsCount, setVisibleOptionsCount] = useState(options.length);

  const contentOpacity = isLoading ? 0.4 : 1;
  const isSequencing = typingPhase !== 'done' && !isLoading;

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
            
            <View style={styles.header}>
                <Text style={styles.entityName}>{entityName}</Text>
                {!isLoading && (
                    <TouchableOpacity onPress={onClose} hitSlop={{top:10, bottom:10, left:10, right:10}}>
                        <Text style={styles.closeText}>✕</Text>
                    </TouchableOpacity>
                )}
            </View>

            <ScrollView style={styles.contentBody} contentContainerStyle={{alignItems: 'center', paddingBottom: 40}}>
                
                <EntityAvatar frames={frames} />

                {description ? <Text style={styles.descriptionText}>{description}</Text> : null}
                <Text style={[styles.greetingText, { opacity: contentOpacity }]}>"{greeting}"</Text>

                {monologue ? (
                    <View style={[styles.monologueContainer, { opacity: contentOpacity }]}>
                         <Text style={styles.monologueText}>{monologue}</Text>
                    </View>
                ) : null}
                
                <View style={styles.separator} />
                
                {/* --- NEW PAGE DISCOVERY BOX --- */}
                {foundPage && (
                    <View style={styles.foundPageContainer}>
                        <Text style={styles.foundPageHeader}>✦ NEW PAGE DISCOVERED ✦</Text>
                        <View style={styles.foundPageContent}>
                            <Text style={styles.foundPageTitle}>{foundPage.title}</Text>
                            <Text numberOfLines={3} style={styles.foundPagePreview}>
                                {foundPage.content.replace(/[*#]/g, '')}
                            </Text>
                        </View>
                        <Text style={styles.foundPageFooter}>Open your Magic Book to view it.</Text>
                    </View>
                )}
                
                {/* Options */}
                <View style={{width: '100%', marginBottom: 15, opacity: contentOpacity}}>
                    {options.map((opt, index) => {
                        const isVisible = index < visibleOptionsCount;
                        if (!isVisible) return null;

                        return (
                            <TouchableOpacity 
                                key={index} 
                                style={styles.optionBtn} 
                                onPress={() => !isLoading && !isSequencing && onSelectOption(opt)}
                                disabled={isLoading || isSequencing}
                                activeOpacity={isLoading || isSequencing ? 1 : 0.7}
                            >
                                <Text style={styles.optionText}>✦ {opt}</Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>

                {/* Write-in */}
                <View style={[styles.inputContainer, { opacity: contentOpacity }]}>
                    <TextInput
                        style={styles.textInput}
                        placeholder="Speak your mind..."
                        placeholderTextColor="#a1887f"
                        value={customInput}
                        onChangeText={setCustomInput}
                        editable={!isLoading && !isSequencing} 
                    />
                    <TouchableOpacity 
                        style={[styles.sendBtn, (isLoading || isSequencing) && {backgroundColor: '#a1887f'}]} 
                        onPress={handleCustomSubmit}
                        disabled={isLoading || isSequencing} 
                    >
                        <Text style={styles.sendBtnText}>SEND</Text>
                    </TouchableOpacity>
                </View>

                {isLoading && (
                    <View style={styles.loadingOverlay}>
                        <ActivityIndicator size="large" color="#3e2723" />
                    </View>
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
      backgroundColor: 'rgba(0,0,0,0.7)', 
      justifyContent: 'center', 
      alignItems: 'center',
      padding: 20
  },
  dialogContainer: { 
    width: '100%',
    maxWidth: 600,    
    maxHeight: '90%',    
    backgroundColor: '#fcfbf7', 
    borderRadius: 8, 
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
    overflow: 'hidden'
  },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    padding: 20, 
    borderBottomWidth: 1,
    borderBottomColor: '#ebe5da'
  },
  entityName: { color: '#3e2723', fontSize: 20, fontFamily: 'serif', fontWeight: 'bold' },
  closeText: { color: '#5d4037', fontSize: 24, fontWeight: 'bold' },
  
  contentBody: { flex: 1, padding: 25 },
  
  avatarContainer: {
      width: 120,
      height: 120,
      marginBottom: 15,
      justifyContent: 'center',
      alignItems: 'center',
  },
  avatarImage: { width: '100%', height: '100%' },
  placeholderAvatar: { width: 120, height: 120, backgroundColor: '#ccc', borderRadius: 60, marginBottom: 20 },

  descriptionText: { fontSize: 14, color: '#8d6e63', textAlign: 'center', marginBottom: 15, fontStyle: 'italic' },
  greetingText: { fontSize: 18, fontFamily: 'serif', color: '#2d1b15', fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  
  monologueContainer: {
      backgroundColor: 'rgba(62, 39, 35, 0.05)',
      padding: 15,
      borderRadius: 4,
      marginBottom: 20,
      width: '100%'
  },
  monologueText: {
      fontSize: 16,
      color: '#3e2723',
      lineHeight: 26,
      fontFamily: 'serif'
  },

  separator: { height: 1, backgroundColor: '#ebe5da', width: '100%', marginBottom: 20 },
  
  optionBtn: { 
      paddingVertical: 12, 
      paddingHorizontal: 15,
      marginBottom: 10,
      backgroundColor: '#fff', 
      borderRadius: 4,
      borderWidth: 1,
      borderColor: '#d7ccc8',
      alignItems: 'center'
  },
  optionText: { fontSize: 16, color: '#3e2723', fontFamily: 'serif' },

  inputContainer: {
      flexDirection: 'row',
      width: '100%',
      marginTop: 10,
      borderTopWidth: 1,
      borderTopColor: '#ebe5da',
      paddingTop: 15
  },
  textInput: {
      flex: 1,
      backgroundColor: '#fff',
      borderWidth: 1,
      borderColor: '#d7ccc8',
      borderRadius: 4,
      padding: 10,
      fontSize: 16,
      color: '#3e2723',
      fontFamily: 'serif'
  },
  sendBtn: {
      marginLeft: 10,
      backgroundColor: '#3e2723',
      justifyContent: 'center',
      paddingHorizontal: 20,
      borderRadius: 4
  },
  sendBtnText: {
      color: '#fcfbf7',
      fontWeight: 'bold',
      fontSize: 14,
      fontFamily: 'serif'
  },
  
  loadingOverlay: {
      position: 'absolute',
      bottom: 20,
      alignSelf: 'center'
  },
  // New Page Styles
  foundPageContainer: {
      width: '100%',
      backgroundColor: '#fff8e1',
      borderWidth: 2,
      borderColor: '#ffecb3',
      borderRadius: 8,
      padding: 15,
      marginBottom: 20,
      alignItems: 'center'
  },
  foundPageHeader: { fontSize: 14, fontWeight: 'bold', color: '#f57f17', marginBottom: 10, letterSpacing: 1 },
  foundPageContent: { alignItems: 'center', marginBottom: 5 },
  foundPageTitle: { fontSize: 18, fontFamily: 'serif', fontWeight: 'bold', color: '#3e2723', marginBottom: 5 },
  foundPagePreview: { fontSize: 14, color: '#6d4c41', textAlign: 'center', fontStyle: 'italic' },
  foundPageFooter: { fontSize: 12, color: '#a1887f', marginTop: 10 },
});