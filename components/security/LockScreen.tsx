import { AppText as Text } from '@/components/ui/AppText';
import { BackgroundGradient } from '@/components/BackgroundGradient';
import { useTheme } from '@/lib/ThemeContext';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useAuthStore } from '@/store/useAuthStore';
import * as LocalAuthentication from 'expo-local-authentication';
import { Fingerprint, Lock, Delete } from 'lucide-react-native';
import React, { useEffect, useState, useMemo } from 'react';
import { 
  Dimensions, 
  Pressable, 
  StyleSheet, 
  Vibration, 
  View,
  SafeAreaView
} from 'react-native';
import Animated, { 
  useAnimatedStyle, 
  useSharedValue, 
  withSequence, 
  withTiming,
  FadeIn
} from 'react-native-reanimated';
import { SecurityUtils } from '@/lib/security';

const { width, height } = Dimensions.get('window');
const PIN_LENGTH = 4;

interface LockScreenProps {
  mode: 'unlock' | 'setup' | 'verify' | 'change_step1' | 'change_step2' | 'change_step3';
  onSuccess: (pin?: string) => void;
  onCancel?: () => void;
  titleOverride?: string;
  subtitleOverride?: string;
}

const KeyButton = ({ value, onPress, isDark, theme, size }: { value: string; onPress: (v: string) => void; isDark: boolean; theme: any; size: number }) => {
  const pressed = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      backgroundColor: withTiming(pressed.value ? theme.accent + '30' : theme.accent + '10', { duration: 100 }),
      borderColor: withTiming(pressed.value ? theme.accent : theme.accent + '25', { duration: 100 }),
      transform: [{ scale: withTiming(pressed.value ? 0.95 : 1, { duration: 100 }) }],
    };
  });

  return (
    <View style={[styles.keyContainer, { height: size }]}>
      <Pressable
        onPressIn={() => {
          pressed.value = 1;
          Vibration.vibrate(8);
        }}
        onPressOut={() => {
          pressed.value = 0;
        }}
        onPress={() => onPress(value)}
      >
        <Animated.View style={[styles.key, animatedStyle, { borderRadius: size * 0.25 }]}>
          <Text style={[styles.keyText, { color: theme.accent, fontSize: size * 0.4 }]}>{value}</Text>
        </Animated.View>
      </Pressable>
    </View>
  );
};

export const LockScreen = ({ mode, onSuccess, onCancel, titleOverride, subtitleOverride }: LockScreenProps) => {
  const { theme, isDark } = useTheme();
  const { faceIdEnabled, fontSize: fontSizeSetting } = useSettingsStore();
  const { signOut } = useAuthStore();
  
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [isConfirming, setIsConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const shake = useSharedValue(0);

  // Dynamic Sizing based on settings
  const dimensions = useMemo(() => {
    const scale = fontSizeSetting === 'small' ? 0.85 : fontSizeSetting === 'large' ? 1.15 : 1.0;
    const btnSize = 64 * scale;
    const btnGap = 12 * scale;
    const dotSize = 48 * scale;
    return { btnSize, btnGap, dotSize, scale };
  }, [fontSizeSetting]);

  const triggerShake = () => {
    Vibration.vibrate(100);
    shake.value = withSequence(
      withTiming(-10, { duration: 50 }),
      withTiming(10, { duration: 50 }),
      withTiming(-10, { duration: 50 }),
      withTiming(10, { duration: 50 }),
      withTiming(0, { duration: 50 })
    );
  };

  const animatedShake = useAnimatedStyle(() => ({
    transform: [{ translateX: shake.value }]
  }));

  const handleKeyPress = (num: string) => {
    if (pin.length < PIN_LENGTH) {
      setPin(prev => prev + num);
      setError(null);
    }
  };

  const handleBackspace = () => {
    setPin(prev => prev.slice(0, -1));
  };

  useEffect(() => {
    if (pin.length === PIN_LENGTH) {
      setTimeout(handleComplete, 100);
    }
  }, [pin]);

  const handleComplete = async () => {
    if (mode === 'setup' || mode === 'change_step3') {
      if (!isConfirming) {
        setConfirmPin(pin);
        setPin('');
        setIsConfirming(true);
      } else {
        if (pin === confirmPin) {
          onSuccess(pin);
        } else {
          setError('PINs do not match');
          triggerShake();
          setPin('');
        }
      }
    } else if (mode === 'verify' || mode === 'change_step1' || mode === 'unlock') {
      const isValid = await SecurityUtils.verifyPin(pin);
      if (isValid) {
        onSuccess(pin);
      } else {
        setError('Incorrect PIN');
        triggerShake();
        setPin('');
      }
    } else if (mode === 'change_step2') {
      onSuccess(pin);
    }
  };

  const handleBiometrics = async () => {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Unlock Groundwork',
      fallbackLabel: 'Enter PIN',
    });
    if (result.success) {
      onSuccess();
    }
  };

  useEffect(() => {
    if (mode === 'unlock' && faceIdEnabled) {
      handleBiometrics();
    }
  }, []);

  const renderDots = () => {
    return (
      <Animated.View style={[styles.dotsContainer, animatedShake, { gap: dimensions.btnGap * 1.5 }]}>
        {[...Array(PIN_LENGTH)].map((_, i) => (
          <View 
            key={i} 
            style={[
              styles.dot, 
              { 
                width: dimensions.dotSize, 
                height: dimensions.dotSize, 
                borderRadius: dimensions.dotSize * 0.3,
                borderColor: theme.accent + '40',
                borderWidth: 2,
              },
              pin.length > i && { backgroundColor: theme.accent, borderColor: theme.accent }
            ]} 
          />
        ))}
      </Animated.View>
    );
  };

  const renderKeypad = () => {
    const rows = [
      ['1', '2', '3'],
      ['4', '5', '6'],
      ['7', '8', '9'],
      ['biometric', '0', 'backspace']
    ];

    return (
      <View style={styles.keypad}>
        {rows.map((row, rowIndex) => (
          <View key={rowIndex} style={[styles.keyRow, { marginBottom: dimensions.btnGap }]}>
            {row.map((key, colIndex) => {
              if (key === 'biometric') {
                return (
                  <View key={colIndex} style={[styles.keyContainer, { height: dimensions.btnSize }]}>
                    {faceIdEnabled && mode === 'unlock' && (
                      <Pressable style={styles.keyIconOnly} onPress={handleBiometrics}>
                        <Fingerprint size={28 * dimensions.scale} color={theme.accent} />
                      </Pressable>
                    )}
                  </View>
                );
              }
              if (key === 'backspace') {
                return (
                  <View key={colIndex} style={[styles.keyContainer, { height: dimensions.btnSize }]}>
                    <Pressable style={styles.keyIconOnly} onPress={handleBackspace}>
                      <Delete size={28 * dimensions.scale} color={theme.accent} />
                    </Pressable>
                  </View>
                );
              }
              return (
                <KeyButton 
                  key={key} 
                  value={key} 
                  onPress={handleKeyPress} 
                  isDark={isDark} 
                  theme={theme} 
                  size={dimensions.btnSize}
                />
              );
            })}
          </View>
        ))}
      </View>
    );
  };

  const getTitle = () => {
    if (titleOverride) return titleOverride;
    switch (mode) {
      case 'setup': return isConfirming ? 'Confirm your PIN' : 'Create PIN';
      case 'verify': return 'Enter current PIN';
      case 'change_step1': return 'Enter current PIN';
      case 'change_step2': return 'Enter new PIN';
      case 'change_step3': return isConfirming ? 'Confirm new PIN' : 'Enter new PIN';
      case 'unlock': return 'Enter PIN';
      default: return 'Enter PIN';
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <BackgroundGradient>
        <SafeAreaView style={{ flex: 1 }}>
          <Animated.View entering={FadeIn.duration(400)} style={styles.container}>
            {/* Top Spacer */}
            <View style={{ flex: 1.2 }} />

            <View style={styles.mainContent}>
              <View style={styles.header}>
                <View style={[styles.iconCircle, { backgroundColor: theme.accent + '15' }]}>
                  <Lock size={32} color={theme.accent} />
                </View>
                <Text style={[styles.title, { color: theme.primaryText }]}>{getTitle()}</Text>
                <Text style={[styles.subtitle, { color: error ? theme.danger : theme.secondaryText }]}>
                  {error || subtitleOverride || (mode === 'setup' ? 'Set a 4-digit code to protect your data' : 'Please enter your security PIN to continue')}
                </Text>
              </View>

              <View style={styles.dotsWrapper}>
                {renderDots()}
              </View>

              <View style={styles.keypadWrapper}>
                {renderKeypad()}
              </View>
            </View>

            {/* Bottom Spacer */}
            <View style={{ flex: 1 }} />

            <View style={styles.footer}>
              <Pressable onPress={onCancel || signOut}>
                <Text style={[styles.footerLink, { color: theme.secondaryText }]}>
                  {onCancel ? 'Cancel' : 'Switch Account'}
                </Text>
              </Pressable>
            </View>
          </Animated.View>
        </SafeAreaView>
      </BackgroundGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
  },
  mainContent: {
    alignItems: 'center',
    width: '100%',
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 26,
    fontFamily: 'Inter_800ExtraBold',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    fontFamily: 'Inter_500Medium',
    textAlign: 'center',
    opacity: 0.7,
    paddingHorizontal: 30,
    lineHeight: 20,
  },
  dotsWrapper: {
    marginBottom: 32,
  },
  dotsContainer: {
    flexDirection: 'row',
  },
  dot: {
    backgroundColor: 'transparent',
  },
  keypadWrapper: {
    width: '100%',
    maxWidth: 420,
    alignItems: 'center',
  },
  keypad: {
    width: '100%',
  },
  keyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  keyContainer: {
    flex: 1,
    marginHorizontal: 6,
  },
  key: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  keyIconOnly: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyText: {
    fontFamily: 'Inter_700Bold',
  },
  footer: {
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  footerLink: {
    fontSize: 15,
    fontFamily: 'Inter_700Bold',
  }
});
