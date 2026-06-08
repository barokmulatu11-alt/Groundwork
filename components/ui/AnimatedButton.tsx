import { AppText as Text } from '@/components/ui/AppText';
import React from 'react';
import { Pressable, StyleSheet, ViewProps } from 'react-native';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withSpring
} from 'react-native-reanimated';
import { useTheme } from '@/lib/ThemeContext';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface AnimatedButtonProps extends ViewProps {
  onPress: () => void;
  title: string;
  variant?: 'primary' | 'secondary' | 'ghost';
}

export function AnimatedButton({
  onPress,
  title,
  variant = 'primary',
  style,
  ...props
}: AnimatedButtonProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }] }));

  const handlePressIn = () => {
    scale.value = withSpring(0.98, { damping: 20, stiffness: 400 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 20, stiffness: 400 });
  };

  const isPrimary = variant === 'primary';
  const isSecondary = variant === 'secondary';

  const { theme, isDark } = useTheme();

  const buttonStyle = [
    styles.base,
    isPrimary && { 
      backgroundColor: theme.accent,
      shadowColor: theme.accent,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: isDark ? 0.3 : 0.15,
      shadowRadius: 10,
    },
    isSecondary && { 
      backgroundColor: theme.card, 
      borderWidth: 1, 
      borderColor: theme.cardBorder,
    },
    variant === 'ghost' && { 
      backgroundColor: 'transparent',
    },
    style,
  ];

  const textColor = isPrimary ? '#FFFFFF' : theme.primaryText;

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[buttonStyle, animatedStyle]}
      {...props}
    >
      <Text style={[styles.text, { color: textColor }]}>{title}</Text>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 14, // curver curvature matching profile card
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  ghost: {},
  text: {
    fontSize: 14,
    fontFamily: 'Inter_700Bold',
    fontWeight: '700',
    letterSpacing: -0.1,
  }
});
