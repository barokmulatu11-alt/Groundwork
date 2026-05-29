import React, { useState, useRef } from 'react';
import { Pressable, StyleSheet, NativeModules, Animated as RNAnimated, Easing, Platform, PanResponder, Dimensions } from 'react-native';
import { RefreshCw } from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';
import { usePathname } from 'expo-router';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const BUTTON_SIZE = 38;

export function UniversalRefreshButton() {
  const { theme, showAlert } = useTheme();
  const [spinning, setSpinning] = useState(false);
  const spinAnim = useRef(new RNAnimated.Value(0)).current;
  const pathname = usePathname();

  // Initial position: bottom left
  const pan = useRef(new RNAnimated.ValueXY({ 
    x: 24, 
    y: SCREEN_HEIGHT - (Platform.OS === 'ios' ? 140 : 120) 
  })).current;

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 5 || Math.abs(gestureState.dy) > 5;
      },
      onPanResponderGrant: () => {
        pan.extractOffset();
      },
      onPanResponderMove: RNAnimated.event(
        [null, { dx: pan.x, dy: pan.y }],
        { useNativeDriver: false }
      ),
      onPanResponderRelease: () => {
        pan.flattenOffset();
      },
    })
  ).current;

  // Only show on the Home page ('/')
  if (pathname !== '/') return null;

  const handleFullRefresh = async () => {
    if (spinning) return;
    setSpinning(true);
    RNAnimated.loop(
      RNAnimated.timing(spinAnim, {
        toValue: 1,
        duration: 800,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    try {
      const { useStore } = require('@/store/useStore');
      const { useSettingsStore } = require('@/store/useSettingsStore');
      await useStore.getState().syncFromCloud();
      useSettingsStore.getState().loadSettings();

      showAlert({
        title: "App Synced & Refreshed",
        message: "All tasks, habits, and settings have been successfully synchronized. Force reload app bundle?",
        primaryButton: { 
          text: "Reload App", 
          onPress: async () => {
            try {
              const Updates = require('expo-updates');
              await Updates.reloadAsync();
            } catch (err) {
              console.warn('[Refresh] Updates.reloadAsync failed, using DevSettings fallback:', err);
              if (NativeModules.DevSettings && NativeModules.DevSettings.reload) {
                NativeModules.DevSettings.reload();
              }
            }
          } 
        },
        secondaryButton: { text: "Dismiss", onPress: () => {} }
      });
    } catch (e) {
      console.error(e);
    } finally {
      spinAnim.stopAnimation();
      spinAnim.setValue(0);
      setSpinning(false);
    }
  };

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg']
  });

  return (
    <RNAnimated.View
      {...panResponder.panHandlers}
      style={[
        styles.container,
        {
          transform: [...pan.getTranslateTransform()],
          backgroundColor: theme.accent,
        }
      ]}
    >
      <Pressable
        onPress={handleFullRefresh}
        style={styles.button}
      >
        <RNAnimated.View style={{ transform: [{ rotate: spin }] }}>
          <RefreshCw size={18} color="#FFFFFF" />
        </RNAnimated.View>
      </Pressable>
    </RNAnimated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: BUTTON_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999999,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  button: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  }
});
