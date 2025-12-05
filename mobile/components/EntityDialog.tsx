// { type: "uploaded file", fileName: "danielrekshan/dreamhex/dreamhex-c40b1817e6f8a8dacdbb60691ae6b58b5951408b/mobile/components/EntityDialog.tsx" }

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
  monologue?: string; 
  options: string[];
  frames: string[]; 
  isLoading: boolean;
  onSelectOption: (option: string) => void;
  onClose: () => void;
}

// Module-level cache to track seen content across re-renders/unmounts
const viewedContentCache = new Set<string>();

// Helper Component: Typewriter Text
const TypewriterText: React.FC<{ 
    text: string; 
    style?: any; 
    isLoading: boolean; 
    startTyping?: boolean;
    onFinishTyping?: () => void;
}> = ({ text, style, isLoading, startTyping = true, onFinishTyping }) => {
  const wordTokens = text.split(/(\s+)/).filter(token => token.length > 0);
  
  const [displayed, setDisplayed] = useState(isLoading ? text : '');

  useEffect(() => {
    if (isLoading) {
        setDisplayed(text);
        return;
    }
    
    if (!startTyping) {
        // If we are not typing, and not loading, we might want to show empty or full
        // depending on context, but usually if startTyping is false we wait.
        // However, for the "skip animation" logic, the parent will unmount/remount 
        // or we rely on the parent rendering a normal Text component instead of TypewriterText.
        setDisplayed(text); 
        return;
    }

    const resetAndStart = () => {
        setDisplayed(''); 
        
        let i = 0;
        const speed = 1; 
        
        const timer = setInterval(() => {
            if (i >= wordTokens.length) {
                clearInterval(timer);
                if (onFinishTyping) onFinishTyping(); 
                return;
            }
            
            const nextToken = wordTokens[i];
            setDisplayed(prev => prev + nextToken);
            i++;
        }, speed);
        return timer;
    }

    const startTimer = setTimeout(() => {
        const intervalId = resetAndStart();
        return () => clearInterval(intervalId);
    }, 0); 

    return () => clearTimeout(startTimer);
  }, [text, isLoading, startTyping, onFinishTyping]);

  return <Text style={style}>{displayed}</Text>;
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
  visible, entityName, description, greeting, monologue, options, frames, isLoading, onSelectOption, onClose 
}) => {
  const [customInput, setCustomInput] = useState('');
  const [typingPhase, setTypingPhase] = useState<'idle' | 'greeting' | 'monologue' | 'options' | 'done'>('idle');
  // Determines how many option buttons are currently visible
  const [visibleOptionsCount, setVisibleOptionsCount] = useState(0);

  const contentKey = `${greeting}${monologue}${options.join('|')}`;
  
  const hasSubstantialMonologue = !!monologue && monologue.trim().split(/\s+/).filter(w => w.length > 0).length > 2;

  // 1. Reset & Cache Check Logic
  useEffect(() => {
      if (isLoading) {
          setTypingPhase('idle');
          setVisibleOptionsCount(0);
          return;
      }
      
      // When dialog becomes visible and we are ready
      if (visible && !isLoading && typingPhase === 'idle') {
          // Check if we have already seen this specific content interaction
          if (viewedContentCache.has(contentKey)) {
              // SKIP ANIMATION
              setTypingPhase('done');
              setVisibleOptionsCount(options.length); 
          } else {
              // PLAY ANIMATION
              setTypingPhase('greeting');
          }
      }
  }, [visible, isLoading, contentKey, typingPhase, options.length]);

  // 2. Mark content as viewed when animation finishes
  useEffect(() => {
      if (visible && !isLoading && typingPhase === 'done') {
          viewedContentCache.add(contentKey);
      }
  }, [visible, isLoading, typingPhase, contentKey]);

  // 3. Option Sequencing Logic (Independent of Text Typing)
  useEffect(() => {
    if (typingPhase === 'options') {
        if (options.length === 0) {
            setTypingPhase('done');
            return;
        }

        // Initialize sequence
        setVisibleOptionsCount(0);
        let current = 0;

        const interval = setInterval(() => {
            current += 1;
            setVisibleOptionsCount(current);

            if (current >= options.length) {
                clearInterval(interval);
                setTypingPhase('done');
            }
        }, 300); // 300ms delay between each button appearing

        return () => clearInterval(interval);
    }
  }, [typingPhase, options.length]);


  // Text Sequence Handlers
  const handleGreetingFinish = () => {
      if (hasSubstantialMonologue) {
          setTypingPhase('monologue');
      } else {
          setTypingPhase('options');
      }
  };

  const handleMonologueFinish = () => {
      setTypingPhase('options');
  };
  
  const handleCustomSubmit = () => {
      if (customInput.trim().length > 0) {
          onSelectOption(customInput);
          setCustomInput('');
      }
  };

  const contentOpacity = isLoading ? 0.4 : 1;
  const isSequencing = typingPhase !== 'done' && !isLoading;

  const monologueOpacity = isLoading 
    ? 0.4 
    : (typingPhase === 'greeting' && isSequencing) 
        ? 0 
        : 1; 

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

            <ScrollView style={styles.contentBody} contentContainerStyle={{alignItems: 'center', paddingBottom: 20}}>
                
                <EntityAvatar frames={frames} />

                {description ? <Text style={styles.descriptionText}>{description}</Text> : null}
                
                {/* Greeting - uses Typewriter if animating, or standard Text if 'done' */}
                {typingPhase === 'done' ? (
                    <Text style={[styles.greetingText, { opacity: contentOpacity }]}>"{greeting}"</Text>
                ) : (
                    <TypewriterText 
                        text={`"${greeting}"`} 
                        isLoading={isLoading}
                        startTyping={typingPhase === 'greeting'} 
                        onFinishTyping={handleGreetingFinish}
                        style={[styles.greetingText, { opacity: contentOpacity }]} 
                    />
                )}

                {/* Monologue */}
                {monologue ? (
                    <View style={[styles.monologueContainer, { opacity: monologueOpacity }]}>
                        {typingPhase === 'done' || !hasSubstantialMonologue ? (
                             <Text style={styles.monologueText}>{monologue}</Text>
                        ) : (
                            <TypewriterText 
                                text={monologue} 
                                isLoading={isLoading}
                                startTyping={hasSubstantialMonologue && typingPhase === 'monologue'} 
                                onFinishTyping={handleMonologueFinish}
                                style={styles.monologueText} 
                            />
                        )}
                    </View>
                ) : null}
                
                <View style={styles.separator} />
                
                {/* Options - No Typewriter, Sequenced Fade In */}
                <View style={{width: '100%', marginBottom: 15, opacity: contentOpacity}}>
                    {options.map((opt, index) => {
                        // Visible if we are done, or if the sequencer has reached this index
                        const isVisible = typingPhase === 'done' || (typingPhase === 'options' && index < visibleOptionsCount);
                        
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
    maxWidth: 700,    
    maxHeight: '90%',    
    backgroundColor: '#fcfbf7', 
    borderRadius: 4, 
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
  entityName: { color: '#3e2723', fontSize: 22, fontFamily: 'serif', fontWeight: 'bold' },
  closeText: { color: '#5d4037', fontSize: 24, fontWeight: 'bold' },
  
  contentBody: { flex: 1, padding: 25 },
  
  avatarContainer: {
      width: 140,
      height: 140,
      marginBottom: 15,
      justifyContent: 'center',
      alignItems: 'center',
  },
  avatarImage: { width: '100%', height: '100%' },
  placeholderAvatar: { width: 120, height: 120, backgroundColor: '#ccc', borderRadius: 60, marginBottom: 20 },

  descriptionText: { fontSize: 14, color: '#8d6e63', textAlign: 'center', marginBottom: 15, fontStyle: 'italic' },
  greetingText: { fontSize: 20, fontFamily: 'serif', color: '#2d1b15', fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  
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
  }
});