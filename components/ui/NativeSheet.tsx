import { useTheme } from '@/lib/ThemeContext';
import { hapticLight } from '@/lib/haptics';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, KeyboardAvoidingView, Modal, PanResponder, Platform, Pressable, View } from 'react-native';

interface NativeSheetProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  height?: string | number;
}

const SCREEN_HEIGHT = Dimensions.get('window').height;

export function NativeSheet({ visible, onClose, children, height = '50%' }: NativeSheetProps) {
  const { theme, isDark } = useTheme();
  const [showModal, setShowModal] = useState(visible);

  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const panY = useRef(new Animated.Value(0)).current;

  // Ref to the currently running close animation so we can cancel it on re-open
  const activeCloseAnim = useRef<Animated.CompositeAnimation | null>(null);

  // Internal close — runs animation then hides modal
  const runCloseAnimation = (callback?: () => void) => {
    // Stop any previous close animation first
    if (activeCloseAnim.current) {
      activeCloseAnim.current.stop();
      activeCloseAnim.current = null;
    }

    const anim = Animated.timing(slideAnim, {
      toValue: SCREEN_HEIGHT,
      duration: 250,
      useNativeDriver: true,
    });

    activeCloseAnim.current = anim;
    anim.start(({ finished }) => {
      // Only act if this animation actually completed (wasn't stopped by a re-open)
      if (finished) {
        panY.setValue(0);
        setShowModal(false);
        activeCloseAnim.current = null;
        callback?.();
      }
    });
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gs) => gs.dy > 2,
      onPanResponderMove: Animated.event([null, { dy: panY }], { useNativeDriver: false }),
      onPanResponderRelease: (_, gs) => {
        if (gs.dy > 100 || gs.vy > 1.5) {
          // Swipe-to-dismiss
          Animated.sequence([
            Animated.timing(slideAnim, { toValue: SCREEN_HEIGHT, duration: 200, useNativeDriver: true }),
            Animated.timing(panY, { toValue: 0, duration: 0, useNativeDriver: true }),
          ]).start(({ finished }) => {
            if (finished) {
              hapticLight();
              setShowModal(false);
              onClose();
            }
          });
        } else {
          // Snap back
          Animated.timing(panY, { toValue: 0, duration: 300, useNativeDriver: true }).start();
        }
      },
    })
  ).current;

  useEffect(() => {
    if (visible) {
      // ── OPEN ────────────────────────────────────────────────
      // Cancel any in-progress close animation immediately so its
      // callback can never fire setShowModal(false) on us.
      if (activeCloseAnim.current) {
        activeCloseAnim.current.stop();
        activeCloseAnim.current = null;
      }

      panY.setValue(0);
      slideAnim.setValue(SCREEN_HEIGHT);   // reset to bottom before animating up
      setShowModal(true);

      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        bounciness: 4,
        speed: 12,
      }).start();
    } else {
      // ── CLOSE ────────────────────────────────────────────────
      runCloseAnimation();
    }
  }, [visible]);

  if (!showModal && !visible) return null;

  return (
    <Modal
      transparent
      visible={showModal || visible}
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <View style={{ flex: 1, justifyContent: 'flex-end' }}>
          {/* Backdrop — tap to dismiss */}
          <Pressable
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)' }}
            onPress={onClose}
          />

            <Animated.View
            style={{
              height: height as any,
              backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              overflow: 'hidden',
              transform: [
                { translateY: slideAnim },
                {
                  translateY: panY.interpolate({
                    inputRange: [0, SCREEN_HEIGHT],
                    outputRange: [0, SCREEN_HEIGHT],
                    extrapolate: 'clamp',
                  }),
                },
              ],
            }}
          >
            {/* Drag Area */}
            <View 
              {...panResponder.panHandlers}
              style={{
                width: '100%',
                height: 40,
                backgroundColor: 'transparent',
                justifyContent: 'center',
                zIndex: 10,
              }}
            >
              <View
                style={{
                  width: 40,
                  height: 4,
                  backgroundColor: isDark ? '#8E8E93' : '#D1D1D6',
                  borderRadius: 2,
                  alignSelf: 'center',
                }}
              />
            </View>
            {children}
          </Animated.View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}


