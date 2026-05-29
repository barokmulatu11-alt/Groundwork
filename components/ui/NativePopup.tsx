import { AppText as Text } from '@/components/ui/AppText';
import React from 'react';
import { View, StyleSheet, Modal, Pressable, Animated, Dimensions, Platform, TouchableOpacity } from 'react-native';
import { X } from 'lucide-react-native';
import { Theme } from '@/lib/ThemeContext';

interface NativePopupProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  message: string;
  theme: Theme;
  isDark: boolean;
  primaryButton?: {
    text: string;
    onPress: () => void;
    destructive?: boolean;
  };
  secondaryButton?: {
    text: string;
    onPress: () => void;
  };
  showCloseButton?: boolean;
}

const { width } = Dimensions.get('window');

function PopupButton({ title, onPress, variant, theme, destructive, flex }: any) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={[
        styles.button,
        flex ? { flex: 1 } : { width: '100%' },
        variant === 'primary'
          ? { backgroundColor: destructive ? theme.danger : theme.accent }
          : { backgroundColor: theme.card, borderWidth: 1, borderColor: theme.cardBorder }
      ]}
    >
      <Text style={[
        styles.buttonText,
        { color: variant === 'primary' ? '#FFFFFF' : (destructive ? theme.danger : theme.accent) }
      ]}>
        {title}
      </Text>
    </TouchableOpacity>
  );
}

export function NativePopup({
  visible,
  onClose,
  title,
  message,
  theme,
  isDark,
  primaryButton,
  secondaryButton,
  showCloseButton = true,
}: NativePopupProps) {
  const [showModal, setShowModal] = React.useState(visible);
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const scaleAnim = React.useRef(new Animated.Value(0.9)).current;

  React.useEffect(() => {
    if (visible) {
      setShowModal(true);
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          damping: 20,
          stiffness: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.9,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setShowModal(false);
      });
    }
  }, [visible]);

  if (!showModal && !visible) return null;

  return (
    <Modal
      transparent
      visible={showModal}
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        
        <Animated.View
          style={[
            styles.container,
            {
              backgroundColor: theme.cardSolid,
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
              borderColor: theme.cardBorder,
              borderWidth: 1,
            },
          ]}
        >
          <View style={styles.content}>
            {showCloseButton && (
              <TouchableOpacity style={styles.closeButton} onPress={onClose} activeOpacity={0.7}>
                <X size={20} color={theme.tertiaryText} />
              </TouchableOpacity>
            )}
            
            <Text style={[styles.title, { color: theme.primaryText }]}>{title}</Text>
            <Text style={[styles.message, { color: theme.secondaryText }]}>{message}</Text>
            
            {(primaryButton || secondaryButton) && (
              <View style={[
                styles.buttonContainer,
                (primaryButton && secondaryButton) ? styles.buttonContainerRow : styles.buttonContainerCol
              ]}>
                {secondaryButton && (
                  <PopupButton
                    title={secondaryButton.text}
                    onPress={secondaryButton.onPress}
                    variant="secondary"
                    theme={theme}
                    flex={!!(primaryButton && secondaryButton)}
                  />
                )}
                {primaryButton && (
                  <PopupButton
                    title={primaryButton.text}
                    onPress={primaryButton.onPress}
                    variant="primary"
                    theme={theme}
                    destructive={primaryButton.destructive}
                    flex={!!(primaryButton && secondaryButton)}
                  />
                )}
              </View>
            )}
          </View>
        </Animated.View>
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
    padding: 20,
  },
  container: {
    width: width * 0.85,
    maxWidth: 400,
    borderRadius: 32,
    borderWidth: 1,
    overflow: 'hidden',
    
    
    
    
    
  },
  content: {
    padding: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontFamily: 'Inter_700Bold',
    textAlign: 'center',
    marginBottom: 12,
  },
  message: {
    fontSize: 15,
    fontFamily: 'Inter_500Medium',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  buttonContainer: {
    width: '100%',
    flexDirection: 'column',
    gap: 10,
  },
  buttonContainerRow: {
    flexDirection: 'row',
    gap: 10,
  },
  buttonContainerCol: {
    flexDirection: 'column',
    gap: 10,
  },
  button: {
    paddingVertical: 14,
    borderRadius: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    fontWeight: '600',
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
