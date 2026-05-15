import { AppText as Text } from '@/components/ui/AppText';
import React from 'react';
import { View, StyleSheet, Modal, Pressable, Animated, Dimensions, Platform } from 'react-native';
import { Theme } from '@/lib/ThemeContext';
import { AnimatedButton } from './AnimatedButton';

interface NativePopupProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  message: string;
  theme: Theme;
  isDark: boolean;
  primaryButton: {
    text: string;
    onPress: () => void;
    destructive?: boolean;
  };
  secondaryButton?: {
    text: string;
    onPress: () => void;
  };
}

const { width } = Dimensions.get('window');

export function NativePopup({
  visible,
  onClose,
  title,
  message,
  theme,
  isDark,
  primaryButton,
  secondaryButton,
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
              backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
              borderColor: theme.cardBorder,
              borderWidth: 1,
            },
          ]}
        >
          <View style={styles.content}>
            <Text style={[styles.title, { color: theme.primaryText }]}>{title}</Text>
            <Text style={[styles.message, { color: theme.secondaryText }]}>{message}</Text>
            
            <View style={styles.buttonContainer}>
              {secondaryButton && (
                <AnimatedButton
                  title={secondaryButton.text}
                  onPress={secondaryButton.onPress}
                  variant="secondary"
                  style={styles.button}
                />
              )}
              <AnimatedButton
                title={primaryButton.text}
                onPress={primaryButton.onPress}
                variant="primary"
                style={[
                  styles.button,
                  primaryButton.destructive && { backgroundColor: '#FF3B30' }
                ]}
              />
            </View>
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
    gap: 12,
  },
  button: {
    width: '100%',
  },
});
