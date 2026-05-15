import React from 'react';
import { View, StyleSheet } from 'react-native';
import { AppText as Text } from '@/components/ui/AppText';
import { useTheme } from '@/lib/ThemeContext';

interface BrandLogoProps {
  fontSize?: number;
}

export function BrandLogo({ fontSize = 32 }: BrandLogoProps) {
  const { theme } = useTheme();

  return (
    <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
      <Text style={[styles.text, { color: theme.accent, fontSize }]}>g</Text>
      <Text style={[styles.text, { color: theme.primaryText, fontSize }]}>roundwork</Text>
      <Text style={[styles.text, { color: theme.accent, fontSize }]}>.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  text: {
    fontFamily: 'Inter_800ExtraBold',
    letterSpacing: -0.5,
  },
});
