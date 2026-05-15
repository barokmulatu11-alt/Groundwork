import React from 'react';
import { View, StyleSheet, Modal, Dimensions, Pressable, Platform } from 'react-native';
import Animated, { 
  useAnimatedStyle, 
  useSharedValue, 
  withSpring, 
  withTiming,
} from 'react-native-reanimated';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import { X, Share2, Trash2, Edit3 } from 'lucide-react-native';
import { BlurView } from 'expo-blur';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface ImageViewerProps {
  visible: boolean;
  uri: string;
  onClose: () => void;
  onDelete?: () => void;
  onEdit?: () => void;
  isDark: boolean;
}

export function ImageViewer({ visible, uri, onClose, onDelete, onEdit, isDark }: ImageViewerProps) {
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  const pinchGesture = Gesture.Pinch()
    .onUpdate((e) => {
      scale.value = savedScale.value * e.scale;
    })
    .onEnd(() => {
      if (scale.value < 1) {
        scale.value = withSpring(1);
        savedScale.value = 1;
      } else {
        savedScale.value = scale.value;
      }
    });

  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      translateX.value = savedTranslateX.value + e.translationX;
      translateY.value = savedTranslateY.value + e.translationY;
    })
    .onEnd(() => {
      if (scale.value <= 1.1) {
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
      } else {
        savedTranslateX.value = translateX.value;
        savedTranslateY.value = translateY.value;
      }
    });

  const composed = Gesture.Simultaneous(pinchGesture, panGesture);

  const imageStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value }
    ],
  }));

  if (!uri) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.container}>
        {Platform.OS === 'ios' ? (
          <BlurView intensity={80} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
        ) : (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: isDark ? 'rgba(0,0,0,0.95)' : 'rgba(255,255,255,0.95)' }]} />
        )}
        
        <View style={styles.header}>
          <Pressable onPress={onClose} style={[styles.iconBtn]}>
            <X color={isDark ? '#FFF' : '#000'} size={24} />
          </Pressable>
          <View style={styles.headerRight}>
            {onEdit && (
              <Pressable onPress={onEdit} style={[styles.iconBtn]}>
                <Edit3 color={isDark ? '#FFF' : '#000'} size={22} />
              </Pressable>
            )}
            {onDelete && (
              <Pressable onPress={onDelete} style={[styles.iconBtn]}>
                <Trash2 color="#FF3B30" size={22} />
              </Pressable>
            )}
          </View>
        </View>

        <GestureDetector gesture={composed}>
          <Animated.Image 
            source={{ uri }} 
            style={[styles.image, imageStyle]} 
            resizeMode="contain"
          />
        </GestureDetector>

        <View style={styles.footer}>
          <Pressable style={[styles.actionBtn]}>
            <Share2 color={isDark ? '#FFF' : '#000'} size={20} style={{ marginRight: 8 }} />
            <Animated.Text style={{ color: isDark ? '#FFF' : '#000', fontFamily: 'Inter_600SemiBold' }}>Share</Animated.Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    zIndex: 10,
  },
  headerRight: {
    flexDirection: 'row',
    gap: 16,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(150,150,150,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.7,
  },
  footer: {
    position: 'absolute',
    bottom: 60,
    alignItems: 'center',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 25,
    backgroundColor: 'rgba(150,150,150,0.1)',
  }
});
