import { useTheme } from '@/lib/ThemeContext';
import React from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, View } from 'react-native';

interface CenterModalProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  maxWidth?: number;
}

export function CenterModal({
  visible,
  onClose,
  children,
  maxWidth = 340,
}: CenterModalProps) {
  const { theme } = useTheme();

  return (
    <Modal
      transparent
      visible={visible}
      onRequestClose={onClose}
      animationType="fade"
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        {/* Backdrop - simplified to ensure it never gets stuck */}
        <Pressable 
          style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.6)' }]} 
          onPress={onClose} 
        />
        
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ width: '100%', alignItems: 'center' }}
          pointerEvents="box-none"
        >
          <View 
            style={[
              styles.modalBox, 
              { 
                backgroundColor: theme.background,
                borderColor: theme.cardBorder,
                
                maxWidth: maxWidth,
              }
            ]}
          >
            <View style={{ padding: 24 }}>
              {children}
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalBox: {
    width: '100%',
    borderRadius: 32,
    borderWidth: 1,
    
    
    
    
    overflow: 'hidden',
  },
});
