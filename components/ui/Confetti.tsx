import React, { useEffect, useMemo } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, { 
  useAnimatedStyle, 
  useSharedValue, 
  withTiming, 
  withDelay,
  Easing,
  interpolate,
  withSequence,
  runOnJS
} from 'react-native-reanimated';

const { width, height } = Dimensions.get('window');
const NUM_CONFETTI = 50;
const COLORS = ['#FF3B30', '#FF9500', '#FFCC00', '#34C759', '#007AFF', '#5856D6', '#AF52DE'];

interface ConfettiPieceProps {
  index: number;
  onComplete?: () => void;
}

const ConfettiPiece = ({ index, onComplete }: ConfettiPieceProps) => {
  const translateY = useSharedValue(-20);
  const translateX = useSharedValue(Math.random() * width);
  const rotation = useSharedValue(0);
  const opacity = useSharedValue(1);

  const color = useMemo(() => COLORS[Math.floor(Math.random() * COLORS.length)], []);
  const size = useMemo(() => Math.random() * 8 + 4, []);
  const duration = useMemo(() => Math.random() * 2000 + 1500, []);
  const delay = useMemo(() => Math.random() * 1000, []);

  useEffect(() => {
    translateY.value = withDelay(delay, withTiming(height + 20, { 
      duration, 
      easing: Easing.out(Easing.quad) 
    }, (finished) => {
      if (finished && index === 0 && onComplete) {
        runOnJS(onComplete)();
      }
    }));
    
    translateX.value = withDelay(delay, withTiming(translateX.value + (Math.random() * 100 - 50), { 
      duration, 
      easing: Easing.linear 
    }));

    rotation.value = withDelay(delay, withTiming(Math.random() * 720, { 
      duration, 
      easing: Easing.linear 
    }));
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { translateX: translateX.value },
      { rotate: `${rotation.value}deg` }
    ],
    opacity: interpolate(translateY.value, [height * 0.8, height], [1, 0]),
  }));

  return (
    <Animated.View 
      style={[
        styles.piece, 
        { width: size, height: size, backgroundColor: color }, 
        animatedStyle
      ]} 
    />
  );
};

export const Confetti = ({ onComplete }: { onComplete?: () => void }) => {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {Array.from({ length: NUM_CONFETTI }).map((_, i) => (
        <ConfettiPiece key={i} index={i} onComplete={onComplete} />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  piece: {
    position: 'absolute',
    top: 0,
    left: 0,
    borderRadius: 2,
  }
});
