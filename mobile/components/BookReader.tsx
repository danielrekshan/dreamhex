import React from 'react';
import { 
    View, Text, StyleSheet, TouchableOpacity, Modal, 
    ScrollView, Image, useWindowDimensions, Platform 
} from 'react-native';
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

// Custom Markdown Renderer
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
  
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;

  const activePage = pages[pageIndex];
  if (!activePage) return null;

  const hasNext = pageIndex < pages.length - 1;
  const hasPrev = pageIndex > 0;

  const handleNext = () => { if (hasNext) setPageIndex(pageIndex + 1); };
  const handlePrev = () => { if (hasPrev) setPageIndex(pageIndex - 1); };

  // Check if the page target matches the current dream
  const isCurrentDream = activePage.type === 'DREAM_GATE' && activePage.targetDreamId === currentDreamSlug;

  // --- Render Components ---

  const renderActionButton = () => {
    if (activePage.type === 'DREAM_GATE') {
        if (isCurrentDream) {
            return (
                <View style={styles.disabledActionBtn}>
                    <Text style={styles.disabledActionText}>CURRENT DREAM</Text>
                </View>
            );
        }
        return (
            <TouchableOpacity onPress={() => onAction(activePage)} style={styles.actionBtn}>
                <Text style={styles.actionText}>ENTER DREAM</Text>
            </TouchableOpacity>
        );
    } 
    
    if (activePage.type === 'CREDITS_UNLOCK') {
        return (
            <TouchableOpacity onPress={() => onAction(activePage)} style={styles.actionBtn}>
                <Text style={styles.actionText}>VIEW ENDING</Text>
            </TouchableOpacity>
        );
    }

    return null;
  };

  const renderContent = () => (
      <ScrollView style={styles.markdownScroll} contentContainerStyle={styles.markdownContentContainer}>
          <Text style={styles.titleText}>{activePage.title}</Text>
          <Markdown 
              key={pageIndex} 
              style={markdownStyles}
              renderers={customRenderers} 
          >
              {activePage.content}
          </Markdown>
      </ScrollView>
  );

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[
            styles.bookContainer, 
            { 
                width: isLandscape ? '90%' : '100%', 
                height: isLandscape ? '90%' : '80%',
                flexDirection: isLandscape ? 'row' : 'column'
            }
        ]}>
            
            {/* --- LANDSCAPE LAYOUT --- */}
            {isLandscape ? (
                <>
                    {/* Left Column: Content */}
                    <View style={styles.landscapeLeftCol}>
                        {renderContent()}
                    </View>

                    {/* Right Column: Controls */}
                    <View style={styles.landscapeRightCol}>
                        <TouchableOpacity onPress={onClose} style={styles.landscapeCloseBtn}>
                            <Text style={styles.closeText}>✕</Text>
                        </TouchableOpacity>

                        <View style={styles.landscapeControls}>
                            <Text style={styles.pageIndicator}>Page {pageIndex + 1}/{pages.length}</Text>
                            
                            <View style={styles.landscapeNavRow}>
                                <TouchableOpacity onPress={handlePrev} disabled={!hasPrev} style={[styles.navButton, !hasPrev && styles.disabledNav]}>
                                    <Text style={styles.navText}>←</Text>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={handleNext} disabled={!hasNext} style={[styles.navButton, !hasNext && styles.disabledNav]}>
                                    <Text style={styles.navText}>→</Text>
                                </TouchableOpacity>
                            </View>

                            <View style={{marginTop: 20}}>
                                {renderActionButton()}
                            </View>
                        </View>
                    </View>
                </>
            ) : (
                /* --- PORTRAIT LAYOUT --- */
                <>
                    <View style={styles.header}>
                        <Text style={styles.pageIndicator}>Page {pageIndex + 1} of {pages.length}</Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <Text style={styles.closeText}>✕</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.contentArea}>
                        {renderContent()}
                    </View>

                    <View style={styles.footer}>
                        <TouchableOpacity onPress={handlePrev} disabled={!hasPrev} style={[styles.navButton, !hasPrev && styles.disabledNav]}>
                            <Text style={styles.navText}>← PREV</Text>
                        </TouchableOpacity>

                        {renderActionButton() || <View style={{width: 50}} />}

                        <TouchableOpacity onPress={handleNext} disabled={!hasNext} style={[styles.navButton, !hasNext && styles.disabledNav]}>
                            <Text style={styles.navText}>NEXT →</Text>
                        </TouchableOpacity>
                    </View>
                </>
            )}

        </View>
      </View>
    </Modal>
  );
};

const markdownStyles = StyleSheet.create({
    body: {
        fontSize: 16,
        fontFamily: 'serif',
        color: '#3e2723',
        lineHeight: 24,
    },
    strong: { fontWeight: 'bold', color: '#2d1b15' },
    heading1: {
        fontSize: 22,
        color: '#2d1b15',
        marginTop: 10,
        marginBottom: 10,
        fontFamily: 'serif',
    },
    image: {
        width: 200, 
        height: 200, 
        resizeMode: 'contain',
    },
    imageContainer: {
        alignItems: 'center', 
        marginVertical: 10,
        width: '100%'
    }
});

const styles = StyleSheet.create({
  overlay: { 
      flex: 1, 
      backgroundColor: 'rgba(0,0,0,0.85)', 
      justifyContent: 'center', 
      alignItems: 'center',
      padding: 10 
  },
  bookContainer: { 
      maxWidth: 800,
      backgroundColor: '#fcfbf7', 
      borderRadius: 8, 
      padding: 15,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.5,
      shadowRadius: 20,
      elevation: 20,
      overflow: 'hidden',
  },
  
  // Portrait Specifics
  header: { 
      flexDirection: 'row', 
      justifyContent: 'space-between', 
      alignItems: 'center',
      borderBottomWidth: 1, 
      borderBottomColor: '#d7ccc8',
      paddingBottom: 10,
      marginBottom: 10,
  },
  footer: { 
      flexDirection: 'row', 
      justifyContent: 'space-between', 
      alignItems: 'center', 
      paddingTop: 10, 
      borderTopWidth: 1, 
      borderTopColor: '#d7ccc8',
      marginTop: 10
  },
  contentArea: { flex: 1 },

  // Landscape Specifics
  landscapeLeftCol: {
      flex: 3,
      paddingRight: 20,
      borderRightWidth: 1,
      borderRightColor: '#d7ccc8',
  },
  landscapeRightCol: {
      flex: 1,
      paddingLeft: 20,
      justifyContent: 'space-between',
      alignItems: 'center',
  },
  landscapeCloseBtn: {
      alignSelf: 'flex-end',
      padding: 5,
  },
  landscapeControls: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      width: '100%',
  },
  landscapeNavRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      width: '100%',
      marginTop: 20,
      marginBottom: 20,
  },

  // Common Elements
  pageIndicator: { fontFamily: 'serif', color: '#8d6e63', fontSize: 14, fontStyle: 'italic' },
  closeButton: { padding: 5 },
  closeText: { fontSize: 24, color: '#5d4037', fontWeight: 'bold' },
  
  titleText: {
      fontSize: 24,
      fontFamily: 'serif',
      color: '#2d1b15',
      textAlign: 'center',
      fontWeight: 'bold',
      marginBottom: 15
  },
  markdownScroll: { flex: 1 },
  markdownContentContainer: { paddingBottom: 20 },
  
  navButton: { padding: 10 },
  navText: { fontSize: 16, fontFamily: 'serif', color: '#5d4037', fontWeight: 'bold', letterSpacing: 1 },
  disabledNav: { opacity: 0.2 },
  
  actionBtn: { 
      backgroundColor: '#3e2723', 
      paddingVertical: 12, 
      paddingHorizontal: 15, 
      borderRadius: 4,
      alignItems: 'center'
  },
  disabledActionBtn: {
      backgroundColor: 'transparent',
      borderColor: '#8d6e63',
      borderWidth: 1,
      paddingVertical: 12, 
      paddingHorizontal: 15, 
      borderRadius: 4,
      opacity: 0.6,
      alignItems: 'center'
  },
  actionText: { color: '#fcfbf7', fontFamily: 'serif', fontWeight: 'bold', fontSize: 14, textAlign: 'center' },
  disabledActionText: { color: '#8d6e63', fontFamily: 'serif', fontWeight: 'bold', fontSize: 12, textAlign: 'center' }
});