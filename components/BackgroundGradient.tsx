import { useTheme } from '@/lib/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { StyleSheet, View } from 'react-native';

export function BackgroundGradient({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme();

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[theme.backgroundGradientStart, theme.background, theme.backgroundGradientEnd]}
        locations={[0, 0.45, 1]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      <View pointerEvents="none" style={[styles.blob1, { backgroundColor: theme.blob1 }]} />
      <View pointerEvents="none" style={[styles.blob2, { backgroundColor: theme.blob2 }]} />
      <View style={{ flex: 1 }}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
  },
  blob1: {
    position: 'absolute' as const,
    top: -80,
    right: -80,
    width: 250,
    height: 250,
    borderRadius: 125,
    zIndex: 0,
  },
  blob2: {
    position: 'absolute' as const,
    bottom: 100,
    left: -60,
    width: 180,
    height: 180,
    borderRadius: 90,
    zIndex: 0,
  },
});
