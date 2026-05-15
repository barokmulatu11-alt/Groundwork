import { AppText as Text } from '@/components/ui/AppText';
import { useTheme } from '@/lib/ThemeContext';
import { AlertCircle, CheckCircle2, Info, XCircle } from 'lucide-react-native';
import React from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

export type AlertType = 'info' | 'success' | 'error' | 'warning';

interface CustomAlertProps {
  visible: boolean;
  type?: AlertType;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel?: () => void;
  showCancel?: boolean;
}

export function CustomAlert({
  visible,
  type = 'info',
  title,
  message,
  confirmText = 'Got it',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  showCancel = false
}: CustomAlertProps) {
  const { theme, isDark } = useTheme();

  if (!visible) return null;

  const getIcon = () => {
    switch (type) {
      case 'success': return <CheckCircle2 size={32} color="#34C759" />;
      case 'error': return <XCircle size={32} color="#FF3B30" />;
      case 'warning': return <AlertCircle size={32} color="#FF9500" />;
      default: return <Info size={32} color={theme.accent} />;
    }
  };

  const accentColor = {
    success: '#34C759',
    error: '#FF3B30',
    warning: '#FF9500',
    info: theme.accent,
  }[type];

  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onCancel || onConfirm} />
        
        <Animated.View 
          entering={FadeIn.duration(300)}
          style={[
            styles.alertBox, 
            { backgroundColor: theme.background, borderColor: theme.cardBorder }
          ]}
        >
          <View style={[styles.iconContainer, { backgroundColor: accentColor + '15' }]}>
            {getIcon()}
          </View>

          <Text style={[styles.title, { color: theme.primaryText }]}>{title}</Text>
          <Text style={[styles.message, { color: theme.secondaryText }]}>{message}</Text>

          <View style={styles.buttonRow}>
            {showCancel && (
              <Pressable 
                style={[styles.button, styles.cancelBtn, { borderColor: theme.cardBorder }]} 
                onPress={onCancel}
              >
                <Text style={[styles.buttonText, { color: theme.secondaryText }]}>{cancelText}</Text>
              </Pressable>
            )}
            <Pressable 
              style={[styles.button, { backgroundColor: accentColor }]} 
              onPress={onConfirm}
            >
              <Text style={styles.confirmText}>{confirmText}</Text>
            </Pressable>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  alertBox: {
    width: '100%',
    maxWidth: 320,
    borderRadius: 32,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    
    
    
    
    
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
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
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 24,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  button: {
    flex: 1,
    height: 52,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtn: {
    backgroundColor: 'transparent',
    borderWidth: 1,
  },
  buttonText: {
    fontSize: 15,
    fontFamily: 'System',
    fontWeight: '700',
  },
  confirmText: {
    fontSize: 15,
    fontFamily: 'System',
    fontWeight: '800',
    color: '#FFF',
  },
});



