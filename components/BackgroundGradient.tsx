import { useTheme } from '@/lib/ThemeContext';
import React from 'react';
import { StyleSheet, View } from 'react-native';

export function BackgroundGradient({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={{ flex: 1 }}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
