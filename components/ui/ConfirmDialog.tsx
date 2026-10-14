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
      <View style={[styles.overlay, { backgroundColor: isDark ? 'rgba(0,0,0,0.85)' : 'rgba(0,0,0,0.45)' }]}>
        <View style={[styles.dialogBox, { backgroundColor: theme.cardSolid, borderColor: theme.separator }]}>
          <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
          <Text style={[styles.message, { color: theme.textSecondary }]}>{message}</Text>
          
          <View style={styles.buttonRow}>
            {!hideCancel && (
              <Pressable 
                testID={`popup-btn-${String(cancelText || 'cancel').toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                accessibilityRole="button"
                accessibilityLabel={cancelText}
                style={[styles.button, styles.cancelButton, { backgroundColor: theme.background, borderColor: theme.separator }]} 
                onPress={onCancel}
              >
                <Text style={[styles.buttonText, { color: theme.text }]}>{cancelText}</Text>
              </Pressable>
            )}
            <Pressable 
              testID={`popup-btn-${String(confirmText || 'delete').toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
              accessibilityRole="button"
              accessibilityLabel={confirmText}
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
    fontFamily: 'Inter_700Bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    lineHeight: 20,
    marginBottom: 24,
    textAlign: 'center',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    borderWidth: 1,
  },
  confirmButton: {},
  buttonText: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
  },
  confirmButtonText: {
    fontSize: 15,
    fontFamily: 'Inter_700Bold',
    color: '#FFFFFF',
  },
});
