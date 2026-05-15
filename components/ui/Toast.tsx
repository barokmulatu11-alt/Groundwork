import { AppText as Text } from '@/components/ui/AppText';
import { useTheme } from '@/lib/ThemeContext';
import { AlertCircle, CheckCircle } from 'lucide-react-native';
import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    withTiming
} from 'react-native-reanimated';

interface ToastProps {
  visible: boolean;
  message: string;
  type?: 'error' | 'success';
  onHide: () => void;
  duration?: number;
}

export function Toast({ visible, message, type = 'error', onHide, duration = 3000 }: ToastProps) {
  const { theme } = useTheme();
  const translateY = useSharedValue(-100);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      translateY.value = withSpring(0, { damping: 15, stiffness: 100 });
      opacity.value = withTiming(1, { duration: 300 });

      const timer = setTimeout(() => {
        hideToast();
      }, duration);

      return () => clearTimeout(timer);
    } else {
      hideToast();
    }
  }, [visible]);

  const hideToast = () => {
    translateY.value = withTiming(-100, { duration: 300 }, (finished) => {
      if (finished) {
        runOnJS(onHide)();
      }
    });
    opacity.value = withTiming(0, { duration: 300 });
  };

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: translateY.value }],
      opacity: opacity.value,
    };
  });

  if (!visible && opacity.value === 0) return null;

  const isError = type === 'error';
  const backgroundColor = theme.card;
  const borderColor = isError ? '#FF3B30' : '#34C759';
  const iconColor = isError ? '#FF3B30' : '#34C759';

  return (
    <Animated.View style={[styles.container, animatedStyle]} pointerEvents="none">
      <View style={[styles.content, { backgroundColor, borderColor, }]}>
        {isError ? (
          <AlertCircle size={20} color={iconColor} style={styles.icon} />
        ) : (
          <CheckCircle size={20} color={iconColor} style={styles.icon} />
        )}
        <Text style={[styles.message, { color: theme.primaryText }]}>{message}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 60, // Safe area top margin approx
    left: 20,
    right: 20,
    zIndex: 9999,
    alignItems: 'center',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    
    
    
    
  },
  icon: {
    marginRight: 10,
  },
  message: {
    fontSize: 15,
    fontFamily: 'Inter_500Medium',
    flexShrink: 1,
  },
});
