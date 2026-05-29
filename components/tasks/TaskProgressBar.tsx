import { AppText as Text } from '@/components/ui/AppText';
import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { useTheme } from '@/lib/ThemeContext';

export const TaskProgressBar = ({ percentage }: { percentage: number }) => {
  const { theme } = useTheme();
  const fillWidth = useSharedValue(0);

  useEffect(() => {
    fillWidth.value = withSpring(percentage, { damping: 20, stiffness: 90 });
  }, [percentage]);

  const animatedStyle = useAnimatedStyle(() => ({
    width: `${fillWidth.value}%`,
    backgroundColor: theme.accent
  }));

  const labelStyle = useAnimatedStyle(() => ({
    left: `${fillWidth.value}%`,
    transform: [{ translateX: -15 }] // Center label over the line
  }));

  return (
    <View style={styles.container}>
      <View style={[styles.track, { backgroundColor: theme.accent + '20' }]}>
        <Animated.View style={[styles.fillContainer, animatedStyle]} />
      </View>
      <Animated.View style={[styles.labelContainer, labelStyle]}>
        <Text style={[styles.labelText, { color: theme.accent }]}>{Math.round(percentage)}%</Text>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { height: 24, justifyContent: 'center', marginVertical: 8 },
  track: { height: 4, borderRadius: 2, overflow: 'hidden' },
  fillContainer: { height: '100%', borderRadius: 2 },
  labelContainer: { position: 'absolute', top: -14 },
  labelText: { fontSize: 10, fontFamily: 'Inter_800ExtraBold' }
});
