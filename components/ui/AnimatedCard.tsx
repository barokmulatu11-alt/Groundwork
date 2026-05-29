import { useTheme } from '@/lib/ThemeContext';
import { hapticLight } from '@/lib/haptics';
import React, { useEffect } from 'react';
import { Pressable, ViewProps } from 'react-native';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    withTiming,
} from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface AnimatedCardProps extends ViewProps {
  onPress?: () => void;
  onLongPress?: () => void;
  children: React.ReactNode;
}

export function AnimatedCard({ onPress, onLongPress, children, style, ...props }: AnimatedCardProps) {
  const scale = useSharedValue(1);
  const { theme } = useTheme();

  useEffect(() => {
    return () => {
      scale.value = 1;
    };
  }, []);

  const handlePressIn = () => {
    scale.value = withTiming(0.985, { duration: 100 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 20, stiffness: 400 });
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const cardStyle = {
    backgroundColor: theme.card,
    borderWidth: 1,
    borderColor: theme.cardBorder,
    padding: 16,
    borderRadius: 16,
    marginBottom: 10,
    overflow: 'hidden' as const,
  };

  const handlePress = () => {
    if (onPress) {
      hapticLight();
      onPress();
    }
  };

  return (
    <AnimatedPressable
      onPress={onPress ? handlePress : undefined}
      onLongPress={onLongPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[cardStyle, animatedStyle, style]}
      {...props}
    >
      {children}
    </AnimatedPressable>
  );
}
