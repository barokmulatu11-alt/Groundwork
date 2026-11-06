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
  const { theme, isDark } = useTheme();

  return (
    <Modal
      transparent
      visible={visible}
      onRequestClose={onClose}
      animationType="fade"
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        {/* Backdrop */}
        <Pressable 
          style={[StyleSheet.absoluteFill, { backgroundColor: isDark ? 'rgba(0,0,0,0.85)' : 'rgba(0,0,0,0.45)' }]} 
          onPress={onClose} 
        />
        
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1, width: '100%', alignItems: 'center', justifyContent: 'center' }}
          pointerEvents="box-none"
        >
          <View 
            style={[
              styles.modalBox, 
              { 
                backgroundColor: theme.cardSolid,
                borderColor: theme.separator,
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
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalBox: {
    width: '100%',
    borderRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
  },
});
