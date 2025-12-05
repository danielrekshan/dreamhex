import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView } from 'react-native';

export interface EntityInteractionProps {
  visible: boolean;
  entityName: string;
  greeting: string;
  options: string[];
  onSelectOption: (option: string) => void;
  onClose: () => void;
}

export const EntityDialog: React.FC<EntityInteractionProps> = ({ 
  visible, entityName, greeting, options, onSelectOption, onClose 
}) => {
  return (
    <Modal visible={visible} animationType="fade" transparent={true} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.dialogContainer}>
            
            <View style={styles.header}>
                <Text style={styles.entityName}>{entityName}</Text>
                <TouchableOpacity onPress={onClose}>
                    <Text style={styles.closeText}>✕</Text>
                </TouchableOpacity>
            </View>

            <ScrollView style={styles.contentBody}>
                <Text style={styles.greetingText}>"{greeting}"</Text>
                
                <View style={styles.separator} />
                
                {options.map((opt, index) => (
                    <TouchableOpacity 
                        key={index} 
                        style={styles.optionBtn} 
                        onPress={() => onSelectOption(opt)}
                    >
                        <Text style={styles.optionText}>✦ {opt}</Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>

        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end', paddingBottom: 50 },
  dialogContainer: { 
    marginHorizontal: 20, 
    backgroundColor: '#f5f5dc', 
    borderRadius: 8, 
    borderWidth: 4, 
    borderColor: '#4e342e',
    maxHeight: '50%' 
  },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    padding: 15, 
    backgroundColor: '#3e2723' 
  },
  entityName: { color: '#f5f5dc', fontSize: 18, fontFamily: 'serif', fontWeight: 'bold' },
  closeText: { color: '#f5f5dc', fontSize: 18 },
  
  contentBody: { padding: 20 },
  greetingText: { fontSize: 20, fontFamily: 'serif', color: '#3e2723', fontStyle: 'italic', marginBottom: 20 },
  
  separator: { height: 1, backgroundColor: '#d7ccc8', marginVertical: 10 },
  
  optionBtn: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#efebe9' },
  optionText: { fontSize: 16, color: '#5d4037', fontFamily: 'serif' }
});