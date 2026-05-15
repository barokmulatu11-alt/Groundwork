import * as Linking from 'expo-linking';
import { Platform } from 'react-native';

// Safe permission checkers — wrapped individually so one failure never breaks the others
const safeCheck = async <T>(fn: () => Promise<T>, fallback: T): Promise<T> => {
  try {
    return await fn();
  } catch (e) {
    console.warn('[Permissions] Check failed silently:', e);
    return fallback;
  }
};

export const requestCameraPermission = async (): Promise<boolean> => {
  try {
    const { Camera } = await import('expo-camera');
    const { status } = await Camera.requestCameraPermissionsAsync();
    return status === 'granted';
  } catch (e) {
    console.warn('[Permissions] Camera request failed:', e);
    return false;
  }
};

export const requestMicrophonePermission = async (): Promise<boolean> => {
  try {
    const { Audio } = await import('expo-av');
    const { status } = await Audio.requestPermissionsAsync();
    return status === 'granted';
  } catch (e) {
    console.warn('[Permissions] Microphone request failed:', e);
    return false;
  }
};

export const requestMediaPermission = async (): Promise<boolean> => {
  try {
    const ImagePicker = await import('expo-image-picker');
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    return status === 'granted';
  } catch (e) {
    console.warn('[Permissions] Media request failed:', e);
    return false;
  }
};

export const checkAllPermissions = async () => {
  const cameraStatus = await safeCheck(async () => {
    const { Camera } = await import('expo-camera');
    const result = await Camera.getCameraPermissionsAsync();
    return result?.status === 'granted';
  }, false);

  const micStatus = await safeCheck(async () => {
    const { Audio } = await import('expo-av');
    const result = await Audio.getPermissionsAsync();
    return result?.status === 'granted';
  }, false);

  const mediaStatus = await safeCheck(async () => {
    const MediaLibrary = await import('expo-media-library');
    const result = await MediaLibrary.getPermissionsAsync();
    return result?.status === 'granted' || (result?.status as any) === 'limited';
  }, false);

  return {
    camera: cameraStatus,
    microphone: micStatus,
    media: mediaStatus,
  };
};

export const openSettings = () => {
  if (Platform.OS === 'ios') {
    Linking.openURL('app-settings:');
  } else {
    Linking.openSettings();
  }
};
