import { AppText as Text } from '@/components/ui/AppText';
import React from 'react';
import { View, StyleSheet, Dimensions, Pressable } from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring, 
  runOnJS, 
  interpolate,
  Extrapolate
} from 'react-native-reanimated';
import { TaskCard } from './TaskCard';
import { Task } from '@/lib/taskDatabase';
import { Check, Trash2 } from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.4;
const ACTION_WIDTH = 80;

interface Props {
  task: Task;
  onComplete: () => void;
  onUpdate: (updates: Partial<Task>) => void;
  onDelete: () => void;
  onDuplicate: () => void;
}

export const SwipeableTaskCard = (props: Props) => {
  const { theme } = useTheme();
  const translateX = useSharedValue(0);

  const panGesture = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .onUpdate((event) => {
      if (props.task.completed) return;
      translateX.value = event.translationX;
    })
    .onEnd(() => {
      if (translateX.value > SWIPE_THRESHOLD) {
        // Complete (Right swipe)
        translateX.value = withSpring(SCREEN_WIDTH, { damping: 15, stiffness: 200 }, (isFinished) => {
          if (isFinished) {
            runOnJS(props.onComplete)();
            translateX.value = 0;
          }
        });
      } else if (translateX.value < -ACTION_WIDTH) {
        // Snapped to delete action
        translateX.value = withSpring(-ACTION_WIDTH);
      } else {
        // Reset
        translateX.value = withSpring(0, { damping: 15, stiffness: 200 });
      }
    });

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }]
  }));

  const rightBgStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [0, SWIPE_THRESHOLD], [0, 1], Extrapolate.CLAMP),
    transform: [{ scale: interpolate(translateX.value, [0, SWIPE_THRESHOLD], [0.5, 1], Extrapolate.CLAMP) }]
  }));

  const rightBgOpacityStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [0, 20], [0, 1], Extrapolate.CLAMP)
  }));

  const leftBgStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [0, -ACTION_WIDTH], [0, 1], Extrapolate.CLAMP)
  }));

  if (props.task.completed) {
    return <TaskCard {...props} onToggleComplete={props.onComplete} />;
  }

  return (
    <View style={styles.container}>
      {/* Right Swipe Background (Complete) */}
      <Animated.View style={[styles.background, styles.rightBackground, { backgroundColor: theme.accent }, rightBgOpacityStyle]}>
        <Animated.View style={[styles.actionIcon, rightBgStyle]}>
          <Check color="white" size={24} />
        </Animated.View>
      </Animated.View>

      {/* Left Swipe Background (Actions) */}
      <Animated.View style={[styles.leftBackground, leftBgStyle]}>
        <Pressable 
          style={[styles.actionBtn, { backgroundColor: theme.accent }]} 
          onPress={() => {
            translateX.value = withSpring(0);
            props.onDelete();
          }}
        >
          <Trash2 color="white" size={20} />
          <Text style={styles.actionText}>Delete</Text>
        </Pressable>
      </Animated.View>

      <GestureDetector gesture={panGesture}>
        <Animated.View style={cardStyle}>
          <TaskCard {...props} onToggleComplete={props.onComplete} />
        </Animated.View>
      </GestureDetector>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { position: 'relative', marginBottom: 8 },
  background: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 20,
    marginBottom: 12,
  },
  rightBackground: {
    justifyContent: 'center',
    paddingLeft: 24,
  },
  leftBackground: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    borderRadius: 20,
    marginBottom: 12,
    overflow: 'hidden',
  },
  actionIcon: { 
    width: 40, 
    height: 40, 
    borderRadius: 20, 
    backgroundColor: 'rgba(255,255,255,0.3)', 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  actionBtn: {
    width: ACTION_WIDTH,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  actionText: {
    color: 'white',
    fontSize: 11,
    fontFamily: 'Inter_700Bold',
  }
});
