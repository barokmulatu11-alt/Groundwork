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

  if (Platform.OS === 'web') {
    if (type === 'media') return 'granted'; // Browser file dialog
    if (typeof navigator !== 'undefined' && typeof navigator.permissions?.query === 'function') {
      try {
        const queryName = type === 'camera' ? 'camera' : 'microphone';
        const res = await (navigator.permissions as any).query({ name: queryName });
        if (res.state === 'granted') return 'granted';
        if (res.state === 'denied') return 'denied';
        return 'undetermined';
      } catch {
        return 'undetermined';
      }
    }
    return 'undetermined';
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
      if (Platform.OS === 'android' || Platform.OS === 'web') return 'granted';
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

  if (Platform.OS === 'web') {
    if (type === 'files' || type === 'media') {
      return { granted: true, status: 'granted' };
    }
    if (typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia(
          type === 'camera' ? { video: true } : { audio: true }
        );
        stream.getTracks().forEach(t => t.stop());
        return { granted: true, status: 'granted' };
      } catch (err: any) {
        const isDenied = err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError';
        return { granted: false, status: isDenied ? 'denied' : 'undetermined' };
      }
    }
    return { granted: false, status: 'undetermined' };
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
      if (Platform.OS === 'android' || Platform.OS === 'web') {
        return { granted: true, status: 'granted' };
      }
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
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') {
      window.alert(
        'On web browsers, permissions are managed directly by your browser.\n\nClick the padlock or settings icon on the left of your browser address bar (URL) to allow or block Microphone, Camera, or Notifications for this site.'
      );
    }
    return;
  }
  if (Platform.OS === 'ios') {
    Linking.openURL('app-settings:');
  } else {
    Linking.openSettings();
  }
};
