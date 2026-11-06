import { AppText as Text } from '@/components/ui/AppText';
import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, AppState, Modal, TouchableOpacity, Platform, TextInput } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useTheme } from '@/lib/ThemeContext';
import { Fingerprint, Lock, KeyRound } from 'lucide-react-native';
import { BackgroundGradient } from './BackgroundGradient';
import { SecurityUtils } from '@/lib/security';

export function AppLockScreen() {
  const { faceIdEnabled, appPin, autoLockTimeout } = useSettingsStore();
  const { theme, isDark } = useTheme();
  
  const [isLocked, setIsLocked] = useState(false);
  const [authFailed, setAuthFailed] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);
  const [showPinInput, setShowPinInput] = useState(Platform.OS === 'web' || !faceIdEnabled);

  const appState = useRef(AppState.currentState);
  const lastActive = useRef(Date.now());
  const hasSecurityEnabled = faceIdEnabled;

  const triggerAuth = async () => {
    if (Platform.OS === 'web') {
      setShowPinInput(true);
      return;
    }

    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();

      if (!hasHardware || !isEnrolled || !faceIdEnabled) {
        setShowPinInput(true);
        return;
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Unlock GroundWork',
        fallbackLabel: 'Use PIN',
        disableDeviceFallback: false,
      });

      if (result.success) {
        setIsLocked(false);
        setAuthFailed(false);
        setPinInput('');
        lastActive.current = Date.now();
      } else {
        setAuthFailed(true);
        setShowPinInput(true);
      }
    } catch (e) {
      setAuthFailed(true);
      setShowPinInput(true);
    }
  };

  const handleVerifyPin = async () => {
    if (!pinInput.trim()) return;
    const isValid = await SecurityUtils.verifyPin(pinInput.trim());
    if (isValid) {
      setIsLocked(false);
      setAuthFailed(false);
      setPinError(false);
      setPinInput('');
      lastActive.current = Date.now();
    } else {
      setPinError(true);
    }
  };

  useEffect(() => {
    if (hasSecurityEnabled) {
      setIsLocked(true);
      if (Platform.OS === 'web') {
        setShowPinInput(true);
      } else {
        triggerAuth();
      }
    } else {
      setIsLocked(false);
    }
  }, [hasSecurityEnabled]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (appState.current === 'active' && nextAppState.match(/inactive|background/)) {
        lastActive.current = Date.now();
      } else if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        const elapsedSeconds = (Date.now() - lastActive.current) / 1000;
        
        if (hasSecurityEnabled) {
          if (autoLockTimeout === 0 || elapsedSeconds >= autoLockTimeout) {
            setIsLocked(true);
            if (Platform.OS === 'web') {
              setShowPinInput(true);
            } else {
              triggerAuth();
            }
          }
        }
      }
      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [hasSecurityEnabled, autoLockTimeout, faceIdEnabled]);

  if (!isLocked) return null;

  return (
    <Modal visible={isLocked} animationType="fade" transparent={false}>
      <View style={{ flex: 1, backgroundColor: theme.background }}>
        <View style={styles.container}>
          <View style={styles.content}>
            <View style={[styles.iconBox, { backgroundColor: theme.cardSolid, borderColor: theme.separator, borderWidth: 1 }]}>
              <Lock size={48} color={theme.text} />
            </View>
            <Text style={[styles.title, { color: theme.text }]}>Groundwork is Locked</Text>
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
              {pinError
                ? "Incorrect PIN. Please try again."
                : authFailed
                ? "Authentication failed. Enter your PIN to unlock."
                : showPinInput
                ? "Enter your PIN to unlock."
                : "Use your biometric or PIN to unlock."}
            </Text>

            {showPinInput || !faceIdEnabled || Platform.OS === 'web' ? (
              <View style={styles.pinSection}>
                <TextInput
                  style={[
                    styles.pinInput,
                    {
                      color: theme.text,
                      backgroundColor: theme.cardSolid,
                      borderColor: pinError ? theme.danger : theme.separator,
                    },
                  ]}
                  placeholder="Enter PIN"
                  placeholderTextColor={theme.textSecondary}
                  secureTextEntry
                  keyboardType="numeric"
                  value={pinInput}
                  onChangeText={(text) => {
                    setPinInput(text);
                    setPinError(false);
                  }}
                  onSubmitEditing={handleVerifyPin}
                  autoFocus
                />
                <TouchableOpacity
                  style={[styles.button, { backgroundColor: theme.accent, marginTop: 12 }]}
                  onPress={handleVerifyPin}
                  activeOpacity={0.8}
                >
                  <KeyRound size={18} color="#fff" />
                  <Text style={styles.buttonText}>Unlock with PIN</Text>
                </TouchableOpacity>

                {Platform.OS !== 'web' && faceIdEnabled && (
                  <TouchableOpacity
                    style={{ marginTop: 16 }}
                    onPress={triggerAuth}
                  >
                    <Text style={{ color: theme.accent, fontFamily: 'Inter_600SemiBold' }}>
                      Use Biometric
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              <TouchableOpacity 
                style={[styles.button, { backgroundColor: theme.accent }]} 
                onPress={triggerAuth}
                activeOpacity={0.8}
              >
                <Fingerprint size={20} color="#fff" />
                <Text style={styles.buttonText}>Unlock</Text>
              </TouchableOpacity>
            )}
          </View>
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
  content: {
    alignItems: 'center',
    padding: 24,
    width: '100%',
  },
  iconBox: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontFamily: 'Inter_700Bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    marginBottom: 40,
    paddingHorizontal: 20,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 16,
    gap: 12,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
  },
  pinSection: {
    width: '100%',
    maxWidth: 280,
    alignItems: 'center',
  },
  pinInput: {
    width: '100%',
    height: 52,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 16,
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
    textAlign: 'center',
    letterSpacing: 4,
  },
});
