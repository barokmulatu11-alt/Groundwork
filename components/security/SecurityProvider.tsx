import React, { useEffect, useRef } from 'react';
import { AppState, AppStateStatus, Modal, Platform } from 'react-native';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useAuthStore } from '@/store/useAuthStore';
import { LockScreen } from './LockScreen';

export const SecurityProvider = ({ children }: { children: React.ReactNode }) => {
  if (Platform.OS === 'web') {
    return <>{children}</>;
  }

  const { 
    appPin, 
    faceIdEnabled, 
    autoLockTimeout, 
    isLocked, 
    setLocked, 
    lastActive, 
    setLastActive 
  } = useSettingsStore();
  const { session } = useAuthStore();
  
  const appState = useRef(AppState.currentState);

  const shouldLock = () => {
    if (!appPin && !faceIdEnabled) return false;
    if (!session) return false;
    
    if (autoLockTimeout === 0) return true;
    if (!lastActive) return true;
    
    const now = Date.now();
    const elapsedSeconds = (now - lastActive) / 1000;
    return elapsedSeconds >= autoLockTimeout;
  };

  useEffect(() => {
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [appPin, faceIdEnabled, autoLockTimeout, lastActive, session]);

  const handleAppStateChange = (nextAppState: AppStateStatus) => {
    if (appState.current === 'active' && nextAppState.match(/inactive|background/)) {
      // App went to background, record timestamp
      setLastActive(Date.now());
    }

    if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
      // App came to foreground, check if we should lock
      if (shouldLock()) {
        setLocked(true);
      }
    }

    appState.current = nextAppState;
  };

  // Initial check on mount
  useEffect(() => {
    if (shouldLock()) {
      setLocked(true);
    }
  }, []);

  return (
    <>
      {children}
      <Modal
        visible={isLocked}
        animationType="slide"
        transparent={false}
        presentationStyle="fullScreen"
        statusBarTranslucent
      >
        <LockScreen 
          mode="unlock" 
          onSuccess={() => {
            setLocked(false);
            setLastActive(Date.now());
          }} 
        />
      </Modal>
    </>
  );
};
