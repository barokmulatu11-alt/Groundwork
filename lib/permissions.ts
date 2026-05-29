import * as Linking from 'expo-linking';
import { Platform } from 'react-native';

export type PermissionType = 'camera' | 'media' | 'microphone' | 'files';
export type PermissionStatus = 'granted' | 'limited' | 'denied' | 'undetermined';

// Safe permission checkers — wrapped individually so one failure never breaks the others
const safeCheck = async <T>(fn: () => Promise<T>, fallback: T): Promise<T> => {
  try {
    return await fn();
  } catch (e) {
    console.warn('[Permissions] Check failed silently:', e);
    return fallback;
  }
};

export const checkPermissionStatus = async (type: PermissionType): Promise<PermissionStatus> => {
  if (type === 'files') {
    return 'granted'; // Implicit for OS file picker
  }

  return await safeCheck(async (): Promise<PermissionStatus> => {
    if (type === 'camera') {
      const ImagePicker = await import('expo-image-picker');
      const res = await ImagePicker.getCameraPermissionsAsync();
      if (res?.status === 'granted') return 'granted';
      if (res?.status === 'denied' && !res?.canAskAgain) return 'denied';
      if (res?.status === 'denied') return 'undetermined';
      return 'undetermined';
    }
    if (type === 'microphone') {
      const { Audio } = await import('expo-av');
      const res = await Audio.getPermissionsAsync();
      if (res?.status === 'granted') return 'granted';
      if (res?.status === 'denied' && !res?.canAskAgain) return 'denied';
      if (res?.status === 'denied') return 'undetermined';
      return 'undetermined';
    }
    if (type === 'media') {
      const ImagePicker = await import('expo-image-picker');
      const res = await ImagePicker.getMediaLibraryPermissionsAsync();
      if (res?.status === 'granted') return 'granted';
      if ((res?.status as any) === 'limited') return 'limited';
      if (res?.status === 'denied' && !res?.canAskAgain) return 'denied';
      if (res?.status === 'denied') return 'undetermined';
      return 'undetermined';
    }
    return 'undetermined';
  }, 'undetermined');
};

export const requestIntelligentPermission = async (type: PermissionType): Promise<{ granted: boolean; status: PermissionStatus }> => {
  const currentStatus = await checkPermissionStatus(type);
  
  if (currentStatus === 'granted' || currentStatus === 'limited') {
    return { granted: true, status: currentStatus };
  }
  
  if (currentStatus === 'denied') {
    return { granted: false, status: 'denied' };
  }

  return await safeCheck(async () => {
    if (type === 'camera') {
      const ImagePicker = await import('expo-image-picker');
      const res = await ImagePicker.requestCameraPermissionsAsync();
      const granted = res.status === 'granted';
      return { granted, status: granted ? 'granted' : 'denied' };
    }
    if (type === 'microphone') {
      const { Audio } = await import('expo-av');
      const res = await Audio.requestPermissionsAsync();
      const granted = res.status === 'granted';
      return { granted, status: granted ? 'granted' : 'denied' };
    }
    if (type === 'media') {
      const ImagePicker = await import('expo-image-picker');
      const res = await ImagePicker.requestMediaLibraryPermissionsAsync();
      const granted = res.status === 'granted' || (res.status as any) === 'limited';
      return { granted, status: granted ? 'granted' : 'denied' };
    }
    if (type === 'files') {
      return { granted: true, status: 'granted' };
    }
    return { granted: false, status: 'denied' };
  }, { granted: false, status: 'denied' });
};

export const requestCameraPermission = async (): Promise<boolean> => {
  const { granted } = await requestIntelligentPermission('camera');
  return granted;
};

export const requestMicrophonePermission = async (): Promise<boolean> => {
  const { granted } = await requestIntelligentPermission('microphone');
  return granted;
};

export const requestMediaPermission = async (): Promise<boolean> => {
  const { granted } = await requestIntelligentPermission('media');
  return granted;
};

export const checkAllPermissions = async () => {
  const cameraStatus = await checkPermissionStatus('camera');
  const micStatus = await checkPermissionStatus('microphone');
  const mediaStatus = await checkPermissionStatus('media');

  return {
    camera: cameraStatus === 'granted',
    microphone: micStatus === 'granted',
    media: mediaStatus === 'granted' || mediaStatus === 'limited',
    files: true,
  };
};

export const openSettings = () => {
  if (Platform.OS === 'ios') {
    Linking.openURL('app-settings:');
  } else {
    Linking.openSettings();
  }
};
