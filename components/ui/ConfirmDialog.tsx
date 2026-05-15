import { AppText as Text } from '@/components/ui/AppText';
import { useTheme } from '@/lib/ThemeContext';
import React from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmButtonColor?: string;
  hideCancel?: boolean;
  onConfirm: () => void;
  onCancel?: () => void;
}

export function ConfirmDialog({
  visible,
  title,
  message,
  confirmText = 'Delete',
  cancelText = 'Cancel',
  confirmButtonColor = '#FF3B30',
  hideCancel = false,
  onConfirm,
  onCancel = () => {},
}: ConfirmDialogProps) {
  const { theme, isDark } = useTheme();

  if (!visible) return null;

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View style={[styles.dialogBox, { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF', borderColor: theme.cardBorder }]}>
          <Text style={[styles.title, { color: theme.primaryText }]}>{title}</Text>
          <Text style={[styles.message, { color: theme.secondaryText }]}>{message}</Text>
          
          <View style={styles.buttonRow}>
            {!hideCancel && (
              <Pressable 
                style={[styles.button, styles.cancelButton, { backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7', borderColor: theme.cardBorder }]} 
                onPress={onCancel}
              >
                <Text style={[styles.buttonText, { color: theme.primaryText }]}>{cancelText}</Text>
              </Pressable>
            )}
            <Pressable 
              style={[styles.button, styles.confirmButton, { backgroundColor: confirmButtonColor }]} 
              onPress={async () => {
                await onConfirm();
                onCancel();
              }}
            >
              <Text style={styles.confirmButtonText}>{confirmText}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  dialogBox: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
    
    
    
    
    
  },
  title: {
    fontSize: 20,
    fontFamily: 'System',
    fontWeight: '800',
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    fontFamily: 'System',
    fontWeight: '600',
    marginBottom: 24,
    textAlign: 'center',
    lineHeight: 20,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    borderWidth: 1,
  },
  confirmButton: {
    // Background color is handled dynamically
  },
  buttonText: {
    fontSize: 15,
    fontFamily: 'System',
    fontWeight: '700',
  },
  confirmButtonText: {
    fontSize: 15,
    fontFamily: 'System',
    fontWeight: '700',
    color: '#FFF',
  },
});
