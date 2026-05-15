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

  const { theme } = useTheme();

  const buttonStyle = [
    styles.base,
    isPrimary && { backgroundColor: theme.accent },
    isSecondary && { backgroundColor: 'transparent', borderWidth: 1, borderColor: theme.accentBorder },
    variant === 'ghost' && { backgroundColor: theme.pillInactive },
    style,
  ];

  const textColor = isPrimary ? '#FFFFFF' : theme.accent;

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
    borderRadius: 100,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ghost: {},
  text: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: '#FFFFFF',
    fontWeight: '600' } });
