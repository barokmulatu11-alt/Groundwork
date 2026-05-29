import { AppText as Text } from '@/components/ui/AppText';
import { useTheme } from '@/lib/ThemeContext';
import * as SplashScreen from 'expo-splash-screen';
import React, { useCallback, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
    withDelay,
    withSpring,
    withTiming
} from 'react-native-reanimated';

interface AnimatedSplashScreenProps {
  onFinish: () => void;
}

export function AnimatedSplashScreen({ onFinish }: AnimatedSplashScreenProps) {
  const { theme } = useTheme();
  
  const gOpacity = useSharedValue(1);
  const gScale = useSharedValue(1.0);
  
  const wordOpacity = useSharedValue(0);
  const authorOpacity = useSharedValue(0);
  const blobOpacity = useSharedValue(0);
  const totalOpacity = useSharedValue(1);

  useEffect(() => {
    // Step 1: Initial "g" appears (already visible at 1)
    gScale.value = withSpring(1.0, { damping: 12, stiffness: 100 });

    // Step 2: Large "g" fades out completely before word appears (800ms)
    gOpacity.value = withDelay(800, withTiming(0, { duration: 400 }));

    // Step 3: Full word fades in after "g" is gone (1250ms)
    wordOpacity.value = withDelay(1250, withTiming(1, { duration: 500 }));

    // Step 4: "Barok M." fades in (1800ms)
    authorOpacity.value = withDelay(1800, withTiming(1, { duration: 400 }));

    // Step 5: Blue blobs fade in (2300ms)
    blobOpacity.value = withDelay(2300, withTiming(1, { duration: 500 }));

    // Step 6: Whole splash fades out, then navigate (3200ms)
    totalOpacity.value = withDelay(3200, withTiming(0, { duration: 400 }, (finished) => {
      if (finished) {
        runOnJS(onFinish)();
      }
    }));
  }, []);

  const gStyle = useAnimatedStyle(() => ({
    opacity: gOpacity.value,
    transform: [{ scale: gScale.value }],
    position: 'absolute',
    alignSelf: 'center',
    zIndex: gOpacity.value > 0 ? 2 : 0 }));

  const onLayoutRootView = useCallback(async () => {
    try {
      await SplashScreen.hideAsync();
    } catch (e) {
      console.warn(e);
    }
  }, []);

  const centerContentStyle = useAnimatedStyle(() => ({
    opacity: wordOpacity.value,
    alignItems: 'center',
    position: 'absolute',
    alignSelf: 'center',
    zIndex: wordOpacity.value > 0 ? 1 : 0 }));

  const authorStyle = useAnimatedStyle(() => ({
    opacity: authorOpacity.value,
    marginTop: 10 }));

  const blobStyle = useAnimatedStyle(() => ({
    opacity: blobOpacity.value }));

  const containerStyle = useAnimatedStyle(() => ({
    opacity: totalOpacity.value }));

  const staticContainerStyle: any = {
    flex: 1,
    backgroundColor: theme.background,
    justifyContent: 'center',
    alignItems: 'center' };

  return (
    <Animated.View style={[staticContainerStyle, containerStyle]} onLayout={onLayoutRootView}>
      {/* Decorative Blobs */}
      <Animated.View style={[styles.topBlob, blobStyle]} />
      <Animated.View style={[styles.bottomBlob, blobStyle]} />

      {/* Initial "g" */}
      <Animated.Text style={[styles.largeG, gStyle]}>
        {/* g removed */}
      </Animated.Text>

      {/* Full Word and Branding */}
      <Animated.View style={centerContentStyle}>
        <View style={styles.wordRow}>
          <Text style={[styles.wordBlue, { color: theme.accent }]}>g</Text>
          <Text 
            style={[styles.wordDark, { color: theme.primaryText }]} 
            numberOfLines={1} 
            adjustsFontSizeToFit
          >roundwork</Text>
          <Text style={[styles.wordBlue, { color: theme.accent }]}>.</Text>
        </View>
        <Animated.View style={[styles.brandingRow, authorStyle]}>
          <Text style={[styles.author, { color: theme.secondaryText }]}>Barok M.</Text>
        </Animated.View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  topBlob: {
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(0,122,255,0.06)',
    position: 'absolute',
    top: -60,
    right: -60 },
  bottomBlob: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(0,122,255,0.04)',
    position: 'absolute',
    bottom: 120,
    left: -50 },
  largeG: {
    fontSize: 110,
    fontFamily: 'Inter_800ExtraBold',
    color: '#007AFF',
    letterSpacing: -2 },
  wordRow: {
    flexDirection: 'row',
    alignSelf: 'center',
    alignItems: 'baseline',
    justifyContent: 'center',
    width: '100%' },
  wordBlue: {
    fontSize: 46,
    fontFamily: 'Inter_800ExtraBold',
    letterSpacing: -1.5 },
  wordDark: {
    fontSize: 46,
    fontFamily: 'Inter_800ExtraBold',
    letterSpacing: -1.5 },
  brandingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%' },
  author: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'System' } });
