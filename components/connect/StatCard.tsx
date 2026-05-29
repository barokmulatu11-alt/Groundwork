import React from 'react';
import { View, StyleSheet } from 'react-native';
import { AppText as Text } from '@/components/ui/AppText';
import { useTheme } from '@/lib/ThemeContext';
import { DesignTokens } from '@/constants/designTokens';
import * as Icons from 'lucide-react-native';

interface Props {
  label: string;
  value: string | number;
  icon: keyof typeof Icons;
  color?: string;
}

export const StatCard: React.FC<Props> = ({ label, value, icon, color }) => {
  const { theme, isDark } = useTheme();
  
  const cardBg = isDark ? DesignTokens.colors.cardBgDark : DesignTokens.colors.cardBgLight;
  const cardBorder = isDark ? DesignTokens.colors.cardBorderDark : DesignTokens.colors.cardBorderLight;
  
  const IconComponent = Icons[icon] as React.ComponentType<any>;
  const activeColor = color || theme.accent;

  return (
    <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
      <View style={[styles.iconBox, { backgroundColor: activeColor + '12' }]}>
        <IconComponent size={18} color={activeColor} strokeWidth={2.5} />
      </View>
      <View style={styles.content}>
        <Text style={[styles.value, { color: theme.primaryText }]}>{value}</Text>
        <Text style={[styles.label, { color: theme.secondaryText }]} numberOfLines={1}>
          {label}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: DesignTokens.borderRadius.md,
    borderWidth: 1,
    padding: 12,
    gap: 12,
    ...DesignTokens.shadows.soft,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: DesignTokens.borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  value: {
    fontSize: 16,
    fontFamily: DesignTokens.fonts.bold,
  },
  label: {
    fontSize: 10,
    fontFamily: DesignTokens.fonts.semiBold,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginTop: 1,
    opacity: 0.8,
  },
});
