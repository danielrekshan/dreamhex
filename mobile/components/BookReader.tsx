import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Dimensions, ScrollView, Image } from 'react-native';
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

  // Context Props
  currentDreamSlug?: string;
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// Custom Markdown Renderer to ensure images are handled correctly
const customRenderers = {
  image: (node: any, children: any, parentStyles: any, styles: any) => {
    const uri = node.attributes.src;
    if (!uri) return null;

    return (
      <View key={node.key} style={styles.imageContainer}>
        <Image 
          source={{ uri: uri }}
          style={styles.image} 
          accessibilityLabel={node.attributes.alt || 'image'}
        />
      </View>
    );
  }
};


export const BookReader: React.FC<BookReaderProps> = ({ 
    visible, onClose, pages, onAction, 
    pageIndex, setPageIndex, currentDreamSlug
}) => {
  
  const activePage = pages[pageIndex];
  if (!activePage) return null;

  const hasNext = pageIndex < pages.length - 1;
  const hasPrev = pageIndex > 0;

  const handleNext = () => { if (hasNext) setPageIndex(pageIndex + 1); };
  const handlePrev = () => { if (hasPrev) setPageIndex(pageIndex - 1); };

  // Check if the page target matches the current dream
  const isCurrentDream = activePage.type === 'DREAM_GATE' && activePage.targetDreamId === currentDreamSlug;

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.bookContainer}>
            
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.pageIndicator}>Page {pageIndex + 1} of {pages.length}</Text>
                
                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                    <Text style={styles.closeText}>✕</Text>
                </TouchableOpacity>
            </View>

            {/* Content Area */}
            <View style={styles.contentArea}>
                <Text style={styles.titleText}>{activePage.title}</Text>
                
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

            {/* Footer Navigation */}
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
                    isCurrentDream ? (
                        <View style={styles.disabledActionBtn}>
                            <Text style={styles.disabledActionText}>CURRENT DREAM</Text>
                        </View>
                    ) : (
                        <TouchableOpacity onPress={() => onAction(activePage)} style={styles.actionBtn}>
                            <Text style={styles.actionText}>ENTER DREAM</Text>
                        </TouchableOpacity>
                    )
                ) : activePage.type === 'CREDITS_UNLOCK' ? (
                    <TouchableOpacity 
                        onPress={() => onAction(activePage)} 
                        style={styles.actionBtn}
                    >
                        <Text style={styles.actionText}>VIEW ENDING</Text>
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
    image: {
        width: 300, 
        height: 300, 
        resizeMode: 'contain',
    },
    imageContainer: {
        alignItems: 'center', 
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
      height: Math.min(SCREEN_HEIGHT * 0.8, 700),
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
  markdownScroll: {
      flex: 1,
  },
  markdownContentContainer: {
      paddingBottom: 20, 
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
  disabledActionBtn: {
      backgroundColor: 'transparent',
      borderColor: '#8d6e63',
      borderWidth: 1,
      paddingVertical: 10, 
      paddingHorizontal: 20, 
      borderRadius: 4,
      opacity: 0.6
  },
  actionText: { color: '#fcfbf7', fontFamily: 'serif', fontWeight: 'bold', fontSize: 14 },
  disabledActionText: { color: '#8d6e63', fontFamily: 'serif', fontWeight: 'bold', fontSize: 12 }
});