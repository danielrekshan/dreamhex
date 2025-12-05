import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal } from 'react-native';
import { BookPage } from '../BookManifest';

interface BookReaderProps {
  visible: boolean;
  onClose: () => void;
  pages: BookPage[];
  onAction: (page: BookPage) => void; 
  scarabCount: number;
  
  // Controlled State Props
  pageIndex: number;
  setPageIndex: (i: number) => void;
}

export const BookReader: React.FC<BookReaderProps> = ({ 
    visible, onClose, pages, onAction, scarabCount, 
    pageIndex, setPageIndex 
}) => {
  
  const activePage = pages[pageIndex];
  const hasNext = pageIndex < pages.length - 1;
  const hasPrev = pageIndex > 0;

  const handleNext = () => { if (hasNext) setPageIndex(pageIndex + 1); };
  const handlePrev = () => { if (hasPrev) setPageIndex(pageIndex - 1); };

  const isLocked = activePage.type === 'CREDITS_UNLOCK' && scarabCount < (activePage.requiredScarabs || 4);

  return (
    <Modal visible={visible} animationType="fade" transparent={true} onRequestClose={onClose}>
      <View style={styles.overlay}>
        {/* Centered Page Container with Max Width */}
        <View style={styles.pageContainer}>
            
            {/* Header: Simple X and Page Count */}
            <View style={styles.header}>
                <Text style={styles.pageNumber}>Page {pageIndex + 1} / {pages.length}</Text>
                <TouchableOpacity onPress={onClose} hitSlop={{top:10, bottom:10, left:10, right:10}}>
                    <Text style={styles.closeText}>✕</Text>
                </TouchableOpacity>
            </View>

            {/* Main Content Area */}
            <ScrollView style={styles.contentScroll} contentContainerStyle={styles.scrollContent}>
                <Text style={styles.pageTitle}>{activePage.title}</Text>
                
                {isLocked ? (
                    <View style={styles.lockedContainer}>
                        <Text style={styles.lockIcon}>🔒</Text>
                        <Text style={styles.lockedText}>
                            The ink swirls indecipherably.
                            {"\n\n"}
                            Requires {activePage.requiredScarabs} Golden Scarabs.
                        </Text>
                    </View>
                ) : (
                    <Text style={styles.pageContent}>{activePage.content}</Text>
                )}
            </ScrollView>
            
            {/* Footer: Navigation */}
            <View style={styles.footer}>
                <TouchableOpacity onPress={handlePrev} disabled={!hasPrev} style={{opacity: !hasPrev ? 0.3 : 1}}>
                    <Text style={styles.navText}>←</Text>
                </TouchableOpacity>

                {/* Action Button */}
                {!isLocked && (activePage.type === 'DREAM_GATE' || activePage.type === 'CREDITS_UNLOCK') ? (
                    <TouchableOpacity onPress={() => onAction(activePage)} style={styles.actionBtn}>
                        <Text style={styles.actionText}>
                            {activePage.type === 'DREAM_GATE' ? 'Enter' : 'Scry'}
                        </Text>
                    </TouchableOpacity>
                ) : <View style={{width: 50}} />} 

                <TouchableOpacity onPress={handleNext} disabled={!hasNext} style={{opacity: !hasNext ? 0.3 : 1}}>
                    <Text style={styles.navText}>→</Text>
                </TouchableOpacity>
            </View>

        </View>
      </View>
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
  pageContainer: { 
      width: '100%',
      maxWidth: 700, // Max Reading Width
      maxHeight: '90%',
      backgroundColor: '#fcfbf7', // Parchment color
      borderRadius: 4, 
      padding: 25,
      
      // Page Shadow / "Physicality"
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 10,
      elevation: 10,
      borderLeftWidth: 1,
      borderLeftColor: '#e0dcd5'
  },
  
  header: { 
      flexDirection: 'row', 
      justifyContent: 'space-between', 
      marginBottom: 20, 
      borderBottomWidth: 1, 
      borderBottomColor: '#ebe5da',
      paddingBottom: 10
  },
  pageNumber: { fontFamily: 'serif', color: '#a1887f', fontSize: 14, fontStyle: 'italic' },
  closeText: { fontSize: 20, color: '#5d4037', opacity: 0.7 },

  contentScroll: { flex: 1 },
  scrollContent: { paddingBottom: 20 },
  
  pageTitle: { 
      fontSize: 28, 
      fontFamily: 'serif', 
      color: '#2d1b15', 
      marginBottom: 25, 
      textAlign: 'center',
      fontWeight: 'bold'
  },
  pageContent: { 
      fontSize: 18, 
      fontFamily: 'serif', 
      color: '#3e2723', 
      lineHeight: 32, // Relaxed leading for readability
      textAlign: 'left'
  },

  lockedContainer: { alignItems: 'center', marginTop: 50 },
  lockIcon: { fontSize: 40, marginBottom: 15, opacity: 0.5 },
  lockedText: { fontSize: 16, fontFamily: 'serif', color: '#b71c1c', textAlign: 'center' },

  footer: { 
      flexDirection: 'row', 
      justifyContent: 'space-between', 
      alignItems: 'center', 
      paddingTop: 15, 
      borderTopWidth: 1, 
      borderTopColor: '#ebe5da' 
  },
  navText: { fontSize: 24, fontFamily: 'serif', color: '#5d4037', fontWeight: 'bold' },
  
  actionBtn: { 
      backgroundColor: '#3e2723', 
      paddingVertical: 8, 
      paddingHorizontal: 25, 
      borderRadius: 4 
  },
  actionText: { color: '#fcfbf7', fontFamily: 'serif', fontWeight: 'bold', fontSize: 14, textTransform: 'uppercase', letterSpacing: 1 }
});