import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, SafeAreaView } from 'react-native';
import { BookPage } from '../BookManifest';

interface BookReaderProps {
  visible: boolean;
  onClose: () => void;
  pages: BookPage[];
  onAction: (page: BookPage) => void; // Unified action handler
  scarabCount: number;
}

export const BookReader: React.FC<BookReaderProps> = ({ visible, onClose, pages, onAction, scarabCount }) => {
  const [pageIndex, setPageIndex] = useState(0);
  const activePage = pages[pageIndex];

  // Helper: Can we go forward?
  const hasNext = pageIndex < pages.length - 1;
  const hasPrev = pageIndex > 0;

  const handleNext = () => {
    if (hasNext) setPageIndex(pageIndex + 1);
  };

  const handlePrev = () => {
    if (hasPrev) setPageIndex(pageIndex - 1);
  };

  // Helper: Is the current page locked?
  const isLocked = activePage.type === 'CREDITS_UNLOCK' && scarabCount < (activePage.requiredScarabs || 4);

  return (
    <Modal visible={visible} animationType="fade" transparent={true} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <SafeAreaView style={styles.bookContainer}>
            
            {/* Header: Page Number / Title */}
            <View style={styles.header}>
                <Text style={styles.pageNumber}>Page {pageIndex + 1} of {pages.length}</Text>
                <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                    <Text style={styles.closeText}>✕</Text>
                </TouchableOpacity>
            </View>

            {/* Main Content Area */}
            <View style={styles.pageView}>
                <Text style={styles.pageTitle}>{activePage.title}</Text>
                
                <ScrollView style={styles.contentScroll} contentContainerStyle={{paddingBottom: 20}}>
                    {isLocked ? (
                        <View style={styles.lockedContainer}>
                            <Text style={styles.lockIcon}>🔒</Text>
                            <Text style={styles.lockedText}>
                                This page is sealed by ancient magic.
                                {"\n\n"}
                                Collect {activePage.requiredScarabs} Golden Scarabs to decipher it.
                                {"\n"}(You have {scarabCount})
                            </Text>
                        </View>
                    ) : (
                        <Text style={styles.pageContent}>{activePage.content}</Text>
                    )}
                </ScrollView>
            </View>
            
            {/* Footer: Navigation & Actions */}
            <View style={styles.footer}>
                {/* Previous Button */}
                <TouchableOpacity 
                    onPress={handlePrev} 
                    style={[styles.navBtn, !hasPrev && styles.disabledBtn]}
                    disabled={!hasPrev}
                >
                    <Text style={styles.navText}>← Prev</Text>
                </TouchableOpacity>

                {/* Action Button (Center) - Only for Gates or Unlocked Credits */}
                {!isLocked && (activePage.type === 'DREAM_GATE' || activePage.type === 'CREDITS_UNLOCK') ? (
                    <TouchableOpacity 
                        onPress={() => onAction(activePage)} 
                        style={styles.actionBtn}
                    >
                        <Text style={styles.actionText}>
                            {activePage.type === 'DREAM_GATE' ? 'Enter Dream' : 'Scry World'}
                        </Text>
                    </TouchableOpacity>
                ) : <View style={{width: 100}} />} 

                {/* Next Button */}
                <TouchableOpacity 
                    onPress={handleNext} 
                    style={[styles.navBtn, !hasNext && styles.disabledBtn]}
                    disabled={!hasNext}
                >
                    <Text style={styles.navText}>Next →</Text>
                </TouchableOpacity>
            </View>

        </SafeAreaView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', padding: 15 },
  bookContainer: { flex: 1, backgroundColor: '#f5f5dc', borderRadius: 8, overflow: 'hidden', marginVertical: 30, borderWidth: 5, borderColor: '#3e2723' },
  
  header: { flexDirection: 'row', justifyContent: 'space-between', padding: 15, borderBottomWidth: 1, borderColor: '#d7ccc8', backgroundColor: '#efebe9' },
  pageNumber: { fontFamily: 'serif', color: '#8d6e63', fontSize: 14, marginTop: 5 },
  closeBtn: { paddingHorizontal: 10 },
  closeText: { fontSize: 20, color: '#3e2723', fontWeight: 'bold' },

  pageView: { flex: 1, padding: 25 },
  pageTitle: { fontSize: 26, fontFamily: 'serif', color: '#3e2723', marginBottom: 20, textAlign: 'center', textDecorationLine: 'underline' },
  contentScroll: { flex: 1 },
  pageContent: { fontSize: 18, fontFamily: 'serif', color: '#212121', lineHeight: 30 },

  lockedContainer: { alignItems: 'center', marginTop: 50 },
  lockIcon: { fontSize: 50, marginBottom: 20 },
  lockedText: { fontSize: 18, fontFamily: 'serif', color: '#b71c1c', textAlign: 'center', lineHeight: 28 },

  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, borderTopWidth: 1, borderColor: '#d7ccc8', backgroundColor: '#efebe9' },
  navBtn: { paddingVertical: 10, paddingHorizontal: 15 },
  disabledBtn: { opacity: 0.3 },
  navText: { fontSize: 18, fontFamily: 'serif', color: '#3e2723', fontWeight: 'bold' },
  
  actionBtn: { backgroundColor: '#81c784', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 20, elevation: 3 },
  actionText: { color: '#1b5e20', fontWeight: 'bold', fontSize: 14, textTransform: 'uppercase' }
});