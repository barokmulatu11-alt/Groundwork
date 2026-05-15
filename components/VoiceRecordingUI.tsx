import { AppText as Text } from '@/components/ui/AppText';
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Mic, Square, Headphones, MicVocal } from 'lucide-react-native';
import Animated, { 
  useAnimatedStyle, 
  useSharedValue, 
  withRepeat, 
  withTiming, 
  withSequence,
  withDelay,
  Easing
} from 'react-native-reanimated';
import { useTheme } from '@/lib/ThemeContext';

interface VoiceRecordingUIProps {
  onStop: () => void;
  colors: any;
  isDark: boolean;
}

export function VoiceRecordingUI({ onStop, colors, isDark }: VoiceRecordingUIProps) {
  const { theme } = useTheme();
  const [timer, setTimer] = useState(0);
  const pulse = useSharedValue(1);
  const ring1 = useSharedValue(1);
  const ring2 = useSharedValue(1);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimer((prev) => prev + 1);
    }, 1000);

    pulse.value = withRepeat(
      withSequence(
        withTiming(1.1, { duration: 500, easing: Easing.bezier(0.4, 0, 0.2, 1) }),
        withTiming(1, { duration: 500, easing: Easing.bezier(0.4, 0, 0.2, 1) })
      ),
      -1,
      true
    );

    ring1.value = withRepeat(
      withTiming(2, { duration: 2000, easing: Easing.out(Easing.quad) }),
      -1,
      false
    );

    ring2.value = withDelay(1000, withRepeat(
      withTiming(2, { duration: 2000, easing: Easing.out(Easing.quad) }),
      -1,
      false
    ));

    return () => clearInterval(interval);
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const ring1Style = useAnimatedStyle(() => ({
    transform: [{ scale: ring1.value }],
    opacity: 1 - (ring1.value - 1) }));

  const ring2Style = useAnimatedStyle(() => ({
    transform: [{ scale: ring2.value }],
    opacity: 1 - (ring2.value - 1) }));

  const micStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }] }));

  return (
    <View style={[styles.container, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'transparent', borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#E9ECEF' }]}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={[styles.iconTag, { backgroundColor: '#FF3B3010' }]}>
            <Mic size={12} color="#FF3B30" />
          </View>
          <Text style={[styles.titleText, { color: isDark ? '#E9ECEF' : '#212529' }]}>Recording Live...</Text>
        </View>
        <View style={styles.statusDot} />
      </View>

      <View style={styles.body}>
        <View style={styles.micSection}>
          <Animated.View style={[styles.ring, ring1Style, { borderColor: '#FF3B30' }]} />
          <Animated.View style={[styles.ring, ring2Style, { borderColor: '#FF3B30' }]} />
          <Animated.View style={[styles.micCircle, micStyle, { backgroundColor: '#FF3B30' }]}>
            <MicVocal size={22} color="#FFF" />
          </Animated.View>
        </View>

        <View style={styles.infoSection}>
          <Text style={[styles.timerText, { color: isDark ? '#FFF' : '#212529' }]}>{formatTime(timer)}</Text>
        </View>

        <Pressable onPress={onStop} style={[styles.stopBtn, { backgroundColor: theme.accent, }]}>
          <Square size={20} color="#FFF" fill="#FFF" />
          <Text style={styles.stopText}>Stop</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 24,
    borderWidth: 1,
    marginBottom: 16 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20 },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center' },
  iconTag: {
    padding: 6,
    borderRadius: 8,
    marginRight: 10 },
  titleText: {
    fontSize: 13,
    fontFamily: 'Inter_700Bold' },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF3B30' },
  body: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between' },
  micSection: {
    width: 50,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center' },
  micCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10 },
  ring: {
    position: 'absolute',
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1 },
  infoSection: {
    flex: 1,
    marginLeft: 20 },
  timerText: {
    fontSize: 24,
    fontFamily: 'Inter_700Bold',
    letterSpacing: -1 },
  subText: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: -2 },
  stopBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 16,
    gap: 8,
    
    
    
     },
  stopText: {
    color: '#FFF',
    fontSize: 14,
    fontFamily: 'System' }
});
