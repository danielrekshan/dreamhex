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

// Helper Component: Typewriter Text
const TypewriterText: React.FC<{ 
    text: string; 
    style?: any; 
    isLoading: boolean; 
    startTyping?: boolean;
    onFinishTyping?: () => void;
}> = ({ text, style, isLoading, startTyping = true, onFinishTyping }) => {
  // Use a regex to split by any whitespace, including newlines, but keeping the delimiters
  const wordTokens = text.split(/(\s+)/).filter(token => token.length > 0);
  
  // FIX: Initialize to empty string if not loading/animating to prevent flash.
  const [displayed, setDisplayed] = useState(isLoading ? text : '');

  useEffect(() => {
    if (isLoading) {
        setDisplayed(text);
        return;
    }
    
    if (!startTyping) {
        setDisplayed(text); 
        return;
    }

    // Animation Start Logic (Using setTimeout(..., 0) to prevent flash)
    const resetAndStart = () => {
        setDisplayed(''); // Reset to empty string
        
        let i = 0;
        const speed = 1; // NEARLY INSTANT (1ms per word/token)
        
        const timer = setInterval(() => {
            if (i >= wordTokens.length) {
                clearInterval(timer);
                if (onFinishTyping) onFinishTyping(); 
                return;
            }
            
            // Append the next token (word, space, or newline)
            const nextToken = wordTokens[i];
            setDisplayed(prev => prev + nextToken);
            i++;
        }, speed);
        return timer;
    }

    // Execute reset and animation start in the next microtask to avoid flash
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
  const [lastCompletedOptionIndex, setLastCompletedOptionIndex] = useState(-1);

  const contentKey = `${greeting}${monologue}${options.join('|')}`;
  
  const hasSubstantialMonologue = !!monologue && monologue.trim().split(/\s+/).filter(w => w.length > 0).length > 2;

  // Reset logic & Start sequence
  useEffect(() => {
      if (isLoading) {
          setTypingPhase('idle');
          setLastCompletedOptionIndex(-1);
          return;
      }
      
      if (visible && !isLoading && typingPhase === 'idle') {
          setTypingPhase('greeting');
      }

  }, [visible, isLoading, contentKey]);

  // Handlers to sequence the main text
  const handleGreetingFinish = () => {
      if (hasSubstantialMonologue) {
          setTypingPhase('monologue');
      } else {
          setTypingPhase('options');
          if (options.length > 0) {
              setLastCompletedOptionIndex(0);
          } else {
              setTypingPhase('done');
          }
      }
  };

  const handleMonologueFinish = () => {
      setTypingPhase('options');
      if (options.length > 0) {
          setLastCompletedOptionIndex(0);
      } else {
          setTypingPhase('done');
      }
  };
  
  // Handler to sequence the option buttons
  const handleOptionFinish = (finishedIndex: number) => {
      if (finishedIndex === lastCompletedOptionIndex) {
          if (finishedIndex < options.length - 1) {
              setLastCompletedOptionIndex(finishedIndex + 1);
          } else {
              setTypingPhase('done');
          }
      }
  };


  const handleCustomSubmit = () => {
      if (customInput.trim().length > 0) {
          onSelectOption(customInput);
          setCustomInput('');
      }
  };

  const contentOpacity = isLoading ? 0.4 : 1;
  const isSequencing = typingPhase !== 'done' && !isLoading;

  // NEW LOGIC: Monologue should be hidden when in the 'greeting' phase,
  // to be revealed when the 'monologue' phase starts.
  const monologueOpacity = isLoading 
    ? 0.4 // Dimmed when loading (show full content)
    : (typingPhase === 'greeting' && isSequencing) 
        ? 0 // Hidden when animating Greeting (or first loading)
        : 1; // Fully visible when animating monologue/options, or done


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
                {/* Close X is ONLY hidden during API loading */}
                {!isLoading && (
                    <TouchableOpacity onPress={onClose} hitSlop={{top:10, bottom:10, left:10, right:10}}>
                        <Text style={styles.closeText}>✕</Text>
                    </TouchableOpacity>
                )}
            </View>

            <ScrollView style={styles.contentBody} contentContainerStyle={{alignItems: 'center', paddingBottom: 20}}>
                
                <EntityAvatar frames={frames} />

                {/* Static Description */}
                {description ? <Text style={styles.descriptionText}>{description}</Text> : null}
                
                {/* Greeting - Typewriter 1 (Starts the chain) */}
                <TypewriterText 
                    text={`"${greeting}"`} 
                    isLoading={isLoading}
                    startTyping={typingPhase === 'greeting'} 
                    onFinishTyping={handleGreetingFinish}
                    style={[styles.greetingText, { opacity: contentOpacity }]} 
                />

                {/* Monologue - Typewriter 2 */}
                {monologue ? (
                    <View style={[styles.monologueContainer, { opacity: monologueOpacity }]}>
                        <TypewriterText 
                            text={monologue} 
                            isLoading={isLoading}
                            // Only start typing if the monologue is substantial AND we are in the 'monologue' phase
                            startTyping={hasSubstantialMonologue && typingPhase === 'monologue'} 
                            onFinishTyping={handleMonologueFinish}
                            style={styles.monologueText} 
                        />
                        {/* FALLBACK: If monologue is present but not substantial enough to animate, 
                            we ensure the text is visible once the greeting finishes.
                            The opacity of the container already handles visibility based on typingPhase. */}
                        {!hasSubstantialMonologue && typingPhase !== 'greeting' && !isLoading && (
                            <Text style={styles.monologueText}>{monologue}</Text>
                        )}
                    </View>
                ) : null}
                
                <View style={styles.separator} />
                
                {/* Options - Sequenced Typewriters */}
                <View style={{width: '100%', marginBottom: 15, opacity: contentOpacity}}>
                    {options.map((opt, index) => {
                        const shouldType = typingPhase === 'options' && index === lastCompletedOptionIndex;
                        const hasCompletedTyping = index < lastCompletedOptionIndex;
                        const isTextVisible = typingPhase === 'done' || shouldType || hasCompletedTyping;

                        return (
                            <TouchableOpacity 
                                key={index} 
                                style={styles.optionBtn} 
                                onPress={() => !isLoading && !isSequencing && onSelectOption(opt)}
                                disabled={isLoading || isSequencing}
                                activeOpacity={isLoading || isSequencing ? 1 : 0.7}
                            >
                                <TypewriterText 
                                    text={`✦ ${opt}`} 
                                    isLoading={isLoading}
                                    startTyping={shouldType} 
                                    onFinishTyping={() => handleOptionFinish(index)} 
                                    style={[styles.optionText, { color: isTextVisible ? styles.optionText.color : 'transparent' }]} 
                                />
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

                {/* Loading Indicator Overlay */}
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