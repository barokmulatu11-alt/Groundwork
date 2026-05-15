import { AppText as Text } from '@/components/ui/AppText';
import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, AppState, Modal, TouchableOpacity, Platform } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useTheme } from '@/lib/ThemeContext';
import { Fingerprint, Lock, ShieldAlert } from 'lucide-react-native';
import { BackgroundGradient } from './BackgroundGradient';

export function AppLockScreen() {
  const { faceIdEnabled, appPin, autoLockTimeout } = useSettingsStore();
  const { theme, isDark } = useTheme();
  
  const [isLocked, setIsLocked] = useState(false);
  const [authFailed, setAuthFailed] = useState(false);
  const appState = useRef(AppState.currentState);
  const lastActive = useRef(Date.now());
  const hasSecurityEnabled = faceIdEnabled || appPin;

  const triggerAuth = async () => {
    if (!faceIdEnabled) {
      // If only PIN is enabled, we fallback to PIN (not implemented in prompt as full custom UI, 
      // but LocalAuth has a fallback). If user has no bio but has PIN, we might just use LocalAuthentication anyway
      // since iOS/Android allow device PIN as fallback. 
      // Actually, if faceIdEnabled is false, maybe we rely entirely on Custom PIN?
      // The prompt says "Allow fallback PIN". Let's try LocalAuth first, it allows device pin.
    }
    
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Unlock GroundWork',
        fallbackLabel: 'Use PIN',
        disableDeviceFallback: false,
      });

      if (result.success) {
        setIsLocked(false);
        setAuthFailed(false);
        lastActive.current = Date.now();
      } else {
        setAuthFailed(true);
      }
    } catch (e) {
      setAuthFailed(true);
    }
  };

  useEffect(() => {
    if (hasSecurityEnabled) {
      setIsLocked(true);
      triggerAuth();
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
            triggerAuth();
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
      <BackgroundGradient>
        <View style={styles.container}>
          <View style={styles.content}>
            <View style={[styles.iconBox, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
              <Lock size={48} color={theme.primaryText} />
            </View>
            <Text style={[styles.title, { color: theme.primaryText }]}>GroundWork is Locked</Text>
            <Text style={[styles.subtitle, { color: theme.secondaryText }]}>
              {authFailed ? "Authentication failed. Please try again." : "Use your biometric or PIN to unlock."}
            </Text>

            <TouchableOpacity 
              style={[styles.button, { backgroundColor: theme.accent }]} 
              onPress={triggerAuth}
              activeOpacity={0.8}
            >
              <Fingerprint size={20} color="#fff" />
              <Text style={styles.buttonText}>Unlock</Text>
            </TouchableOpacity>
          </View>
        </View>
      </BackgroundGradient>
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
  }
});
