import React from 'react';
import { View, StyleSheet } from 'react-native';
import { AppText as Text } from '@/components/ui/AppText';
import { useTheme } from '@/lib/ThemeContext';

interface Props {
  label: string;
  value: string | number;
}

export const StatChip: React.FC<Props> = ({ label, value }) => {
  const { theme, isDark } = useTheme();
  
  // Sleek minimalist card colors
  const cardBg = isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)';
  const cardBorder = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)';

  return (
    <View style={[styles.chip, { backgroundColor: cardBg, borderColor: cardBorder }]}>
      <Text style={[styles.val, { color: theme.primaryText }]} numberOfLines={1}>
        {value}
      </Text>
      <Text style={[styles.lbl, { color: theme.secondaryText }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  chip: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 6,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  val: {
    fontSize: 14,
    fontFamily: 'Inter_800ExtraBold',
    marginBottom: 1,
  },
  lbl: {
    fontSize: 8,
    fontFamily: 'Inter_700Bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    opacity: 0.7,
  },
});
