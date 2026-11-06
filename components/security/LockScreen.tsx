import { AppText as Text } from '@/components/ui/AppText';
import { BackgroundGradient } from '@/components/BackgroundGradient';
import { useTheme } from '@/lib/ThemeContext';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useAuthStore } from '@/store/useAuthStore';
import * as LocalAuthentication from 'expo-local-authentication';
import { Fingerprint, Lock } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { 
  Dimensions, 
  Pressable, 
  StyleSheet, 
  TouchableOpacity,
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

const { width } = Dimensions.get('window');

interface LockScreenProps {
  mode?: 'unlock' | 'setup' | 'verify' | 'change_step1' | 'change_step2' | 'change_step3';
  onSuccess: (pin?: string) => void;
  onCancel?: () => void;
  titleOverride?: string;
  subtitleOverride?: string;
}

export const LockScreen = ({ mode = 'unlock', onSuccess, onCancel, titleOverride, subtitleOverride }: LockScreenProps) => {
  const { theme } = useTheme();
  const { faceIdEnabled } = useSettingsStore();
  const { signOut } = useAuthStore();
  
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const shake = useSharedValue(0);

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

  const handleBiometrics = async () => {
    if (isAuthenticating) return;
    setIsAuthenticating(true);
    setError(null);
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Unlock Groundwork',
        fallbackLabel: 'Use Device Passcode',
        disableDeviceFallback: false,
      });

      if (result.success) {
        onSuccess();
      } else {
        setError('Authentication required to unlock');
        triggerShake();
      }
    } catch (e) {
      setError('Biometric authentication failed');
      triggerShake();
    } finally {
      setIsAuthenticating(false);
    }
  };

  useEffect(() => {
    handleBiometrics();
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <BackgroundGradient>
        <SafeAreaView style={{ flex: 1 }}>
          <Animated.View entering={FadeIn.duration(400)} style={styles.container}>
            {/* Top Spacer */}
            <View style={{ flex: 1 }} />

            <Animated.View style={[styles.mainContent, animatedShake]}>
              <View style={styles.header}>
                <View style={[styles.iconCircle, { backgroundColor: theme.cardSolid, borderColor: theme.separator, borderWidth: 1 }]}>
                  <Lock size={32} color={theme.accent} />
                </View>
                <Text style={[styles.title, { color: theme.primaryText }]}>
                  {titleOverride || 'Groundwork is locked'}
                </Text>
                <Text style={[styles.subtitle, { color: error ? theme.danger : theme.secondaryText }]}>
                  {error || subtitleOverride || 'Use your fingerprint, Face ID, or device passcode to unlock.'}
                </Text>
              </View>

              <TouchableOpacity
                onPress={handleBiometrics}
                style={[styles.unlockButton, { backgroundColor: theme.accent }]}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel="Unlock Groundwork"
              >
                <Fingerprint size={22} color="#FFFFFF" style={{ marginRight: 8 }} />
                <Text style={styles.unlockButtonText}>
                  {isAuthenticating ? 'Authenticating...' : 'Unlock'}
                </Text>
              </TouchableOpacity>
            </Animated.View>

            {/* Bottom Spacer */}
            <View style={{ flex: 1 }} />

            <View style={styles.footer}>
              <Pressable onPress={onCancel || signOut} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                <Text style={[styles.footerLink, { color: theme.secondaryText }]}>
                  {onCancel ? 'Cancel' : 'Sign Out'}
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
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  title: {
    fontSize: 26,
    fontFamily: 'Inter_800ExtraBold',
    marginBottom: 8,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    paddingHorizontal: 20,
    lineHeight: 22,
  },
  unlockButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 36,
    borderRadius: 14,
    marginTop: 8,
    minWidth: 200,
  },
  unlockButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Inter_700Bold',
  },
  footer: {
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  footerLink: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
  },
});
