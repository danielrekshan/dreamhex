import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, SafeAreaView, Dimensions, ScrollView, Image } from 'react-native';
import Markdown from 'react-native-markdown-display';
import { BookPage } from '../BookManifest';

interface BookReaderProps {
  visible: boolean;
  onClose: () => void;
  pages: BookPage[];
  onAction: (page: BookPage) => void; 
  
  // Controlled State Props
  pageIndex: number;
  setPageIndex: (i: number) => void;
  
  // ADDED SCARAB COUNT
  scarabCount: number;
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// Custom Markdown Renderer to ensure images are handled correctly
const customRenderers = {
  // Explicitly tell the library to render images as React Native <Image> components
  image: (node: any, children: any, parentStyles: any, styles: any) => {
    const uri = node.attributes.src;
    
    // Check if URI is valid before rendering
    if (!uri) return null;

    return (
      // 1. Use the imageContainer style to center the image block horizontally
      <View key={node.key} style={styles.imageContainer}>
        <Image 
          source={{ uri: uri }}
          // 2. Use the image style to apply fixed width/height to satisfy the library requirement
          style={styles.image} 
          accessibilityLabel={node.attributes.alt || 'image'}
        />
      </View>
    );
  }
};


export const BookReader: React.FC<BookReaderProps> = ({ 
    visible, onClose, pages, onAction, 
    pageIndex, setPageIndex, scarabCount
}) => {
  
  const activePage = pages[pageIndex];
  if (!activePage) return null;

  const hasNext = pageIndex < pages.length - 1;
  const hasPrev = pageIndex > 0;
  const isLastPage = pageIndex === pages.length - 1;

  const handleNext = () => { if (hasNext) setPageIndex(pageIndex + 1); };
  const handlePrev = () => { if (hasPrev) setPageIndex(pageIndex - 1); };

  const isUnlockableAction = activePage.type === 'DREAM_GATE' || 
                           (activePage.type === 'CREDITS_UNLOCK' && scarabCount >= (activePage.requiredScarabs || 0));


  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.bookContainer}>
            
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.pageIndicator}>Page {pageIndex + 1} of {pages.length}</Text>
                
                {/* CONDITIONAL RENDERING OF SCARAB COUNTER: Only visible on the last page */}
                {isLastPage && (
                    <View style={styles.scarabCounter}>
                        <Text style={styles.scarabText}>Golden Scarabs: {scarabCount}</Text>
                    </View>
                )}
                
                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                    <Text style={styles.closeText}>✕</Text>
                </TouchableOpacity>
            </View>

            {/* Content Area - Fixed Height for consistency */}
            <View style={styles.contentArea}>
                <Text style={styles.titleText}>{activePage.title}</Text>
                
                {/* WRAPPED MARKDOWN IN SCROLLVIEW FOR VERTICAL SCROLLING */}
                <ScrollView style={styles.markdownScroll} contentContainerStyle={styles.markdownContentContainer}>
                    <Markdown 
                        key={pageIndex} 
                        style={markdownStyles}
                        renderers={customRenderers} 
                    >
                        {activePage.content}
                    </Markdown>
                </ScrollView>
            </View>

            {/* Footer Navigation - Fixed position */}
            <View style={styles.footer}>
                <TouchableOpacity 
                    onPress={handlePrev} 
                    disabled={!hasPrev} 
                    style={[styles.navButton, !hasPrev && styles.disabledNav]}
                >
                    <Text style={styles.navText}>← PREV</Text>
                </TouchableOpacity>

                {/* Action Button (Center) */}
                {activePage.type === 'DREAM_GATE' ? (
                    <TouchableOpacity onPress={() => onAction(activePage)} style={styles.actionBtn}>
                        <Text style={styles.actionText}>ENTER DREAM</Text>
                    </TouchableOpacity>
                ) : activePage.type === 'CREDITS_UNLOCK' ? (
                    <TouchableOpacity 
                        onPress={() => onAction(activePage)} 
                        style={[styles.actionBtn, !isUnlockableAction && styles.lockedActionBtn]}
                        disabled={!isUnlockableAction}
                    >
                        <Text style={styles.actionText}>
                             {scarabCount >= (activePage.requiredScarabs || 0) ? 'VIEW ENDING' : `LOCKED (${activePage.requiredScarabs})`}
                        </Text>
                    </TouchableOpacity>
                ) : (
                    <View style={{width: 100}} /> 
                )}

                <TouchableOpacity 
                    onPress={handleNext} 
                    disabled={!hasNext} 
                    style={[styles.navButton, !hasNext && styles.disabledNav]}
                >
                    <Text style={styles.navText}>NEXT →</Text>
                </TouchableOpacity>
            </View>

        </View>
      </View>
    </Modal>
  );
};

// Markdown Styles for rendering rich text and images
const markdownStyles = StyleSheet.create({
    body: {
        fontSize: 18,
        fontFamily: 'serif',
        color: '#3e2723',
        lineHeight: 28,
    },
    strong: {
        fontWeight: 'bold',
        color: '#2d1b15',
    },
    heading1: {
        fontSize: 24,
        color: '#2d1b15',
        marginTop: 10,
        marginBottom: 10,
        fontFamily: 'serif',
    },
    // Fix: Set fixed width/height in pixels to satisfy the underlying library.
    // The value 300px is chosen as it is roughly 50% of the 600px max container width.
    image: {
        width: 300, 
        height: 300, 
        resizeMode: 'contain',
    },
    // Custom style for the surrounding container of the image to ensure center alignment
    imageContainer: {
        alignItems: 'center', // This is what centers the image block horizontally
        marginVertical: 10,
    }
});

const styles = StyleSheet.create({
  overlay: { 
      flex: 1, 
      backgroundColor: 'rgba(0,0,0,0.85)', 
      justifyContent: 'center', 
      alignItems: 'center',
      padding: 20 
  },
  bookContainer: { 
      width: '100%',
      maxWidth: 600,
      height: Math.min(SCREEN_HEIGHT * 0.8, 700), // Standard height constraint
      backgroundColor: '#fcfbf7', 
      borderRadius: 8, 
      padding: 20,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.5,
      shadowRadius: 20,
      elevation: 20,
      display: 'flex',
      flexDirection: 'column'
  },
  header: { 
      flexDirection: 'row', 
      justifyContent: 'space-between', 
      alignItems: 'center',
      borderBottomWidth: 1, 
      borderBottomColor: '#d7ccc8',
      paddingBottom: 15,
      marginBottom: 15,
      position: 'relative'
  },
  pageIndicator: { fontFamily: 'serif', color: '#8d6e63', fontSize: 14, fontStyle: 'italic' },
  closeButton: { padding: 5 },
  closeText: { fontSize: 24, color: '#5d4037', fontWeight: 'bold' },
  
  // SCARAB STYLES
  scarabCounter: {
      position: 'absolute',
      alignSelf: 'center',
      backgroundColor: 'rgba(62, 39, 35, 0.2)', 
      borderRadius: 15,
      paddingVertical: 5,
      paddingHorizontal: 10,
      left: '50%',
      transform: [{ translateX: -50 }],
  },
  scarabText: {
      color: '#ffdd00',
      fontSize: 12,
      fontWeight: 'bold',
      fontFamily: 'serif'
  },

  contentArea: {
      flex: 1, 
  },
  titleText: {
      fontSize: 26,
      fontFamily: 'serif',
      color: '#2d1b15',
      textAlign: 'center',
      fontWeight: 'bold',
      marginBottom: 20
  },
  // New Styles for ScrollView wrapping Markdown
  markdownScroll: {
      flex: 1,
  },
  markdownContentContainer: {
      paddingBottom: 20, // Add some bottom padding for the scroll content
  },


  footer: { 
      flexDirection: 'row', 
      justifyContent: 'space-between', 
      alignItems: 'center', 
      paddingTop: 15, 
      borderTopWidth: 1, 
      borderTopColor: '#d7ccc8',
      marginTop: 10
  },
  navButton: { padding: 10 },
  navText: { fontSize: 16, fontFamily: 'serif', color: '#5d4037', fontWeight: 'bold', letterSpacing: 1 },
  disabledNav: { opacity: 0.2 },
  
  actionBtn: { 
      backgroundColor: '#3e2723', 
      paddingVertical: 10, 
      paddingHorizontal: 20, 
      borderRadius: 4 
  },
  lockedActionBtn: {
      backgroundColor: '#a1887f', 
  },
  actionText: { color: '#fcfbf7', fontFamily: 'serif', fontWeight: 'bold', fontSize: 14 }
});