import { AppText as Text } from '@/components/ui/AppText';
import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { useTheme } from '@/lib/ThemeContext';
import { ChevronRight } from 'lucide-react-native';
import Animated, { 
  useAnimatedStyle, 
  useSharedValue, 
  withTiming,
  withSpring
} from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface ActionRowProps {
  Icon: any;
  title: string;
  subtitle?: string;
  onPress: () => void;
  showChevron?: boolean;
  accentColor?: string;
}

export function ActionRow({ Icon, title, subtitle, onPress, showChevron = true, accentColor }: ActionRowProps) {
  const { theme } = useTheme();
  const scale = useSharedValue(1);

  if (!Icon) {
    console.warn(`Icon for ActionRow "${title}" is undefined.`);
    return null;
  }

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }]
  }));

  const handlePressIn = () => {
    // Subtler press animation as requested
    scale.value = withTiming(0.985, { duration: 100 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 20, stiffness: 400 });
  };

  const activeAccent = accentColor || theme.accent;

  return (
    <AnimatedPressable 
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[
        styles.card, 
        { backgroundColor: theme.card, borderColor: theme.cardBorder },
        animatedStyle
      ]}
    >
      <View style={[styles.iconBox, { backgroundColor: 'transparent' }]}>
        <Icon size={20} color={activeAccent} />
      </View>
      <View style={styles.textContainer}>
        <Text style={[styles.title, { color: theme.primaryText }]}>{title}</Text>
        {subtitle && (
          <Text style={[styles.subtitle, { color: theme.secondaryText }]}>{subtitle}</Text>
        )}
      </View>
      {showChevron && <ChevronRight size={18} color={theme.tertiaryText} />}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16, // Standardized 16px rounding
    marginBottom: 10,
    borderWidth: 1,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12, // Standardized 12px icon box rounding
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    flex: 1,
    marginLeft: 14,
  },
  title: {
    fontSize: 15,
    fontFamily: 'Inter_700Bold',
  },
  subtitle: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    marginTop: 2,
    opacity: 0.8,
  },
});
