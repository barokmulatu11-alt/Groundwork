import { AppText as Text } from '@/components/ui/AppText';
import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

export const TaskProgressBar = ({ percentage }: { percentage: number }) => {
  const fillWidth = useSharedValue(0);

  useEffect(() => {
    fillWidth.value = withSpring(percentage, { damping: 20, stiffness: 90 });
  }, [percentage]);

  const animatedStyle = useAnimatedStyle(() => ({
    width: `${fillWidth.value}%`
  }));

  const labelStyle = useAnimatedStyle(() => ({
    left: `${fillWidth.value}%`,
    transform: [{ translateX: -15 }] // Center label over the line
  }));

  return (
    <View style={styles.container}>
      <View style={styles.track}>
        <Animated.View style={[styles.fillContainer, animatedStyle]}>
          <LinearGradient
            colors={['#007AFF', '#00D4FF']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      </View>
      <Animated.View style={[styles.labelContainer, labelStyle]}>
        <Text style={styles.labelText}>{Math.round(percentage)}%</Text>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { height: 24, justifyContent: 'center', marginVertical: 8, paddingHorizontal: 16 },
  track: { height: 6, backgroundColor: 'rgba(0,122,255,0.1)', borderRadius: 3, overflow: 'hidden' },
  fillContainer: { height: '100%', borderRadius: 3, overflow: 'hidden' },
  labelContainer: { position: 'absolute', top: -14 },
  labelText: { fontSize: 10, fontFamily: 'Inter_700Bold', color: '#007AFF' }
});
