import React, { useState, useEffect } from 'react';
import { 
    View, Text, StyleSheet, TouchableOpacity, Modal, 
    ScrollView, Image, TextInput, ActivityIndicator, 
    KeyboardAvoidingView, Platform, useWindowDimensions 
} from 'react-native';
import { BookPage } from '../BookManifest';

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
  foundPage?: BookPage | null;
}

// Helper to clean markdown for text-only previews
const cleanMarkdownPreview = (text: string) => {
    if (!text) return "";
    return text
        .replace(/!\[.*?\]\(.*?\)/g, '')
        .replace(/\[(.*?)\]\(.*?\)/g, '$1')
        .replace(/[*#_~`>]/g, '')
        .replace(/\n+/g, ' ')
        .trim();
};

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
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;

  const contentOpacity = isLoading ? 0.4 : 1;

  const handleCustomSubmit = () => {
      if (customInput.trim().length > 0) {
          onSelectOption(customInput);
          setCustomInput('');
      }
  };

  const renderNarrativeContent = () => (
      <ScrollView contentContainerStyle={{ alignItems: 'center', paddingBottom: 20 }}>
          <EntityAvatar frames={frames} />
          {description ? <Text style={styles.descriptionText}>{description}</Text> : null}
          <Text style={[styles.greetingText, { opacity: contentOpacity }]}>"{greeting}"</Text>
          
          {monologue ? (
              <View style={[styles.monologueContainer, { opacity: contentOpacity }]}>
                   <Text style={styles.monologueText}>{monologue}</Text>
              </View>
          ) : null}

          {foundPage && (
              <View style={styles.foundPageContainer}>
                  <Text style={styles.foundPageHeader}>✦ NEW PAGE DISCOVERED ✦</Text>
                  <View style={styles.foundPageContent}>
                      <Text style={styles.foundPageTitle}>{foundPage.title}</Text>
                      <Text numberOfLines={3} style={styles.foundPagePreview}>
                          {cleanMarkdownPreview(foundPage.content)}
                      </Text>
                  </View>
                  <Text style={styles.foundPageFooter}>Open your Magic Book to view it.</Text>
              </View>
          )}
      </ScrollView>
  );

  const renderInteractionContent = () => (
      <View style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <ScrollView style={{ flex: 1, opacity: contentOpacity }} contentContainerStyle={{paddingVertical: 10}}>
              {options.map((opt, index) => (
                  <TouchableOpacity 
                      key={index} 
                      style={styles.optionBtn} 
                      onPress={() => !isLoading && onSelectOption(opt)}
                      disabled={isLoading}
                  >
                      <Text style={styles.optionText}>✦ {opt}</Text>
                  </TouchableOpacity>
              ))}
          </ScrollView>

          <View style={[styles.inputContainer, { opacity: contentOpacity }]}>
              <TextInput
                  style={styles.textInput}
                  placeholder="Speak your mind..."
                  placeholderTextColor="#a1887f"
                  value={customInput}
                  onChangeText={setCustomInput}
                  editable={!isLoading} 
              />
              <TouchableOpacity 
                  style={[styles.sendBtn, isLoading && {backgroundColor: '#a1887f'}]} 
                  onPress={handleCustomSubmit}
                  disabled={isLoading} 
              >
                  <Text style={styles.sendBtnText}>SEND</Text>
              </TouchableOpacity>
          </View>
      </View>
  );

  return (
    <Modal visible={visible} animationType="fade" transparent={true} onRequestClose={onClose}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined} 
        style={styles.overlay}
      >
        <View style={[
            styles.dialogContainer, 
            { 
                width: isLandscape ? '90%' : '100%',
                maxWidth: isLandscape ? 800 : 600,
                // Fixed height is crucial for Android flex calculation
                height: isLandscape ? '90%' : '80%', 
            }
        ]}>
            
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.entityName}>{entityName}</Text>
                {!isLoading && (
                    <TouchableOpacity onPress={onClose} hitSlop={{top:10, bottom:10, left:10, right:10}}>
                        <Text style={styles.closeText}>✕</Text>
                    </TouchableOpacity>
                )}
            </View>

            {/* Split Content */}
            <View style={{ flex: 1, flexDirection: isLandscape ? 'row' : 'column', overflow: 'hidden' }}>
                
                {/* Left/Top Pane (Narrative) */}
                <View style={[
                    styles.pane, 
                    isLandscape ? styles.landscapeLeftPane : styles.portraitContent
                ]}>
                    {renderNarrativeContent()}
                </View>

                {/* Separator */}
                <View style={isLandscape ? styles.vertSeparator : styles.horizSeparator} />

                {/* Right/Bottom Pane (Interaction) */}
                <View style={[
                    styles.pane, 
                    isLandscape ? styles.landscapeRightPane : styles.portraitContent,
                    isLandscape && { paddingBottom: 10 }
                ]}>
                    {renderInteractionContent()}
                </View>
            </View>

            {isLoading && (
                <View style={styles.loadingOverlay}>
                    <ActivityIndicator size="large" color="#3e2723" />
                </View>
            )}

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
      padding: 10
  },
  dialogContainer: { 
    backgroundColor: '#fcfbf7', 
    borderRadius: 8, 
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
    display: 'flex',
    flexDirection: 'column'
  },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    padding: 15, 
    borderBottomWidth: 1,
    borderBottomColor: '#ebe5da',
    backgroundColor: '#fcfbf7',
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  entityName: { color: '#3e2723', fontSize: 18, fontFamily: 'serif', fontWeight: 'bold' },
  closeText: { color: '#5d4037', fontSize: 24, fontWeight: 'bold' },
  
  pane: { flex: 1, padding: 15 },
  
  // Landscape Styles
  landscapeLeftPane: { flex: 1.2 }, 
  landscapeRightPane: { flex: 1 },
  vertSeparator: { width: 1, backgroundColor: '#ebe5da', height: '100%' },
  
  // Portrait Styles
  portraitContent: { flex: 1 },
  horizSeparator: { height: 1, backgroundColor: '#ebe5da', width: '100%' },

  // Avatar
  avatarContainer: {
      width: 100,
      height: 100,
      marginBottom: 10,
      justifyContent: 'center',
      alignItems: 'center',
  },
  avatarImage: { width: '100%', height: '100%' },
  placeholderAvatar: { width: 100, height: 100, backgroundColor: '#ccc', borderRadius: 50, marginBottom: 15 },

  // Text Styles
  descriptionText: { fontSize: 13, color: '#8d6e63', textAlign: 'center', marginBottom: 10, fontStyle: 'italic' },
  greetingText: { fontSize: 16, fontFamily: 'serif', color: '#2d1b15', fontWeight: 'bold', marginBottom: 15, textAlign: 'center' },
  
  monologueContainer: {
      backgroundColor: 'rgba(62, 39, 35, 0.05)',
      padding: 12,
      borderRadius: 4,
      marginBottom: 15,
      width: '100%'
  },
  monologueText: { fontSize: 15, color: '#3e2723', lineHeight: 24, fontFamily: 'serif' },

  // Interaction Styles
  optionBtn: { 
      paddingVertical: 12, 
      paddingHorizontal: 15,
      marginBottom: 8,
      backgroundColor: '#fff', 
      borderRadius: 4,
      borderWidth: 1,
      borderColor: '#d7ccc8',
      alignItems: 'center',
      width: '100%'
  },
  optionText: { fontSize: 14, color: '#3e2723', fontFamily: 'serif' },

  inputContainer: {
      flexDirection: 'row',
      width: '100%',
      marginTop: 5,
      paddingTop: 10,
      borderTopWidth: 1,
      borderTopColor: '#ebe5da',
  },
  textInput: {
      flex: 1,
      backgroundColor: '#fff',
      borderWidth: 1,
      borderColor: '#d7ccc8',
      borderRadius: 4,
      padding: 8,
      fontSize: 14,
      color: '#3e2723',
      fontFamily: 'serif',
      height: 45
  },
  sendBtn: {
      marginLeft: 8,
      backgroundColor: '#3e2723',
      justifyContent: 'center',
      paddingHorizontal: 15,
      borderRadius: 4,
      height: 45
  },
  sendBtnText: { color: '#fcfbf7', fontWeight: 'bold', fontSize: 12, fontFamily: 'serif' },
  
  loadingOverlay: {
      position: 'absolute',
      bottom: 20,
      alignSelf: 'center'
  },

  // Found Page Styles
  foundPageContainer: {
      width: '100%',
      backgroundColor: '#fff8e1',
      borderWidth: 2,
      borderColor: '#ffecb3',
      borderRadius: 8,
      padding: 10,
      marginBottom: 10,
      alignItems: 'center'
  },
  foundPageHeader: { fontSize: 12, fontWeight: 'bold', color: '#f57f17', marginBottom: 5, letterSpacing: 1 },
  foundPageContent: { alignItems: 'center', marginBottom: 5 },
  foundPageTitle: { fontSize: 16, fontFamily: 'serif', fontWeight: 'bold', color: '#3e2723', marginBottom: 2 },
  foundPagePreview: { fontSize: 12, color: '#6d4c41', textAlign: 'center', fontStyle: 'italic' },
  foundPageFooter: { fontSize: 10, color: '#a1887f', marginTop: 5 },
});