import { AppText as Text } from '@/components/ui/AppText';
import { useSettingsStore } from '@/store/useSettingsStore';
import { Crown, Lock } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, View } from 'react-native';

interface ProBadgeProps {
  /** 'pro' shows a crown + "PRO" label; 'locked' shows a lock icon only */
  variant?: 'pro' | 'locked' | 'icon-only';
  size?: 'sm' | 'md';
}

export function ProBadge({ variant = 'pro', size = 'sm' }: ProBadgeProps) {
  const { accentColor } = useSettingsStore();
  const iconSize = size === 'sm' ? 10 : 13;
  const fontSize = size === 'sm' ? 9 : 11;

  if (variant === 'locked') {
    return (
      <View style={[styles.badge, { backgroundColor: 'rgba(120,120,128,0.18)' }]}>
        <Lock size={iconSize} color="#8E8E93" />
      </View>
    );
  }

  if (variant === 'icon-only') {
    return (
      <View style={[styles.badge, { backgroundColor: accentColor + '22' }]}>
        <Crown size={iconSize} color={accentColor} />
      </View>
    );
  }

  return (
    <View style={[styles.badge, { backgroundColor: accentColor + '22' }]}>
      <Crown size={iconSize} color={accentColor} />
      <Text style={[styles.label, { color: accentColor, fontSize }]}>PRO</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  label: {
    fontFamily: 'Inter_800ExtraBold',
    letterSpacing: 0.5,
  },
});
