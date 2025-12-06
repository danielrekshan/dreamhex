import React, { useRef } from 'react';
import { 
    View, Text, StyleSheet, TouchableOpacity, Modal, 
    ScrollView, Image, useWindowDimensions
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

    // FIX: Removed key={node.key}. The Markdown library manages keying internally, 
    // and explicitly setting it often causes conflicts leading to the spread error.
    return (
      <View style={styles.imageContainer}>
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
  
  const scrollViewRef = useRef<ScrollView>(null); 

  const activePage = pages[pageIndex];
  if (!activePage) return null;

  const hasNext = pageIndex < pages.length - 1;
  const hasPrev = pageIndex > 0;

  const scrollToTop = () => {
      if (scrollViewRef.current) {
          scrollViewRef.current.scrollTo({ y: 0, animated: true });
      }
  };

  const handleNext = () => { 
      if (hasNext) {
          setPageIndex(pageIndex + 1);
          scrollToTop();
      } 
  };
  const handlePrev = () => { 
      if (hasPrev) {
          setPageIndex(pageIndex - 1); 
          scrollToTop();
      }
  };

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
      <ScrollView 
          ref={scrollViewRef} 
          style={styles.markdownScroll} 
          contentContainerStyle={styles.markdownContentContainer}
      >
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

  const renderBottomNav = () => (
      <View style={styles.bottomNavContainer}>
          {/* Left: Previous */}
          <View style={styles.navItemLeft}>
            <TouchableOpacity 
                onPress={handlePrev} 
                disabled={!hasPrev} 
                style={[styles.navButton, !hasPrev && styles.disabledNav]}
            >
                <Text style={styles.navText}>← PREV</Text>
            </TouchableOpacity>
          </View>

          {/* Center: Action */}
          <View style={styles.navItemCenter}>
              {renderActionButton()}
          </View>

          {/* Right: Next */}
          <View style={styles.navItemRight}>
            <TouchableOpacity 
                onPress={handleNext} 
                disabled={!hasNext} 
                style={[styles.navButton, !hasNext && styles.disabledNav]}
            >
                <Text style={styles.navText}>NEXT →</Text>
            </TouchableOpacity>
          </View>
      </View>
  );

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[
            styles.bookContainer, 
            { 
                width: isLandscape ? '90%' : '100%', 
                height: isLandscape ? '90%' : '90%',
            }
        ]}>
            
            {/* --- LAYOUT CONTENT --- */}
            <View style={{ flex: 1 }}>
            {isLandscape ? (
                /* --- LANDSCAPE LAYOUT (Single Column) --- */
                <View style={styles.landscapeContentWrapper}>
                    {/* Close button moved to top-right of the book view */}
                    <TouchableOpacity 
                        onPress={onClose} 
                        style={styles.landscapeCloseBtnAbsolute}
                    >
                        <Text style={styles.closeText}>✕</Text>
                    </TouchableOpacity>
                    <View style={styles.contentArea}>
                        {renderContent()}
                    </View>
                </View>
            ) : (
                /* --- PORTRAIT LAYOUT --- */
                <>
                    <View style={styles.header}>
                        {/* Only shows the close button now */}
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <Text style={styles.closeText}>✕</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.contentArea}>
                        {renderContent()}
                    </View>
                </>
            )}
            </View>

            {/* --- UNIFIED BOTTOM NAVIGATION --- */}
            {renderBottomNav()}

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
        alignSelf: 'center',
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
      display: 'flex',
      flexDirection: 'column',
  },
  
  // Portrait Specifics
  header: { 
      flexDirection: 'row', 
      justifyContent: 'flex-end', 
      alignItems: 'center',
      borderBottomWidth: 1, 
      borderBottomColor: '#d7ccc8',
      paddingBottom: 10,
      marginBottom: 10,
  },
  contentArea: { flex: 1 },

  // Landscape Specifics (Simplified)
  landscapeContentWrapper: {
      flex: 1,
      position: 'relative', 
      paddingTop: 30, 
  },
  landscapeCloseBtnAbsolute: {
      position: 'absolute',
      top: 0,
      right: 0,
      padding: 5,
      zIndex: 10, 
  },


  // Common Elements
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
  
  // Bottom Navigation Bar
  bottomNavContainer: { 
      flexDirection: 'row', 
      justifyContent: 'space-between', 
      alignItems: 'center', 
      paddingTop: 10, 
      borderTopWidth: 1, 
      borderTopColor: '#d7ccc8',
      marginTop: 10,
      height: 60, 
  },
  navItemLeft: {
      flex: 1,
      alignItems: 'flex-start',
  },
  navItemRight: {
      flex: 1,
      alignItems: 'flex-end',
  },
  navItemCenter: {
      flex: 2, 
      alignItems: 'center',
      justifyContent: 'center',
  },

  navButton: { padding: 10 },
  navText: { fontSize: 16, fontFamily: 'serif', color: '#5d4037', fontWeight: 'bold', letterSpacing: 1 },
  disabledNav: { opacity: 0.2 },
  
  actionBtn: { 
      backgroundColor: '#3e2723', 
      paddingVertical: 12, 
      paddingHorizontal: 15, 
      borderRadius: 4,
      alignItems: 'center',
      minWidth: 120,
  },
  disabledActionBtn: {
      backgroundColor: 'transparent',
      borderColor: '#8d6e63',
      borderWidth: 1,
      paddingVertical: 12, 
      paddingHorizontal: 15, 
      borderRadius: 4,
      opacity: 0.6,
      alignItems: 'center',
      minWidth: 120,
  },
  actionText: { color: '#fcfbf7', fontFamily: 'serif', fontWeight: 'bold', fontSize: 14, textAlign: 'center' },
  disabledActionText: { color: '#8d6e63', fontFamily: 'serif', fontWeight: 'bold', fontSize: 12, textAlign: 'center' }
});