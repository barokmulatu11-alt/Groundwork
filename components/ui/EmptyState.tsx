import { AppText as Text } from '@/components/ui/AppText';
import { AnimatedButton } from '@/components/ui/AnimatedButton';
import { useTheme } from '@/lib/ThemeContext';
import { LucideIcon } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ icon: Icon, title, subtitle, actionLabel, onAction }: EmptyStateProps) {
  const { theme } = useTheme();

  return (
    <Animated.View entering={FadeInUp.duration(400)} style={styles.wrap}>
      <View style={[styles.iconCircle, { backgroundColor: theme.accentLight }]}>
        <Icon size={28} color={theme.accent} />
      </View>
      <Text style={[styles.title, { color: theme.primaryText }]}>{title}</Text>
      {subtitle ? (
        <Text style={[styles.subtitle, { color: theme.secondaryText }]}>{subtitle}</Text>
      ) : null}
      {actionLabel && onAction ? (
        <AnimatedButton title={actionLabel} onPress={onAction} style={{ marginTop: 20, minWidth: 160 }} />
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    textAlign: 'center',
    lineHeight: 20,
  },
});
