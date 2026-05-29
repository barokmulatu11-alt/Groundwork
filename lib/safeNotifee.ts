import { Platform } from 'react-native';
import type {
  Notification,
  TimestampTrigger,
} from 'react-native-notify-kit';

// ─── Enums & Constants matching react-native-notify-kit ─────────────────────────

export enum AuthorizationStatus {
  DENIED = 0,
  AUTHORIZED = 1,
  PROVISIONAL = 2,
}

export enum TriggerType {
  TIMESTAMP = 0,
  INTERVAL = 1,
}

export enum RepeatFrequency {
  HOURLY = 0,
  DAILY = 1,
  WEEKLY = 2,
}

export enum AndroidImportance {
  NONE = 0,
  MIN = 1,
  LOW = 2,
  DEFAULT = 3,
  HIGH = 4,
}

export enum EventType {
  DISMISSED = 0,
  PRESS = 1,
  ACTION_PRESS = 2,
  DELIVERED = 3,
  TRIGGER_NOTIFICATION_CREATED = 4,
  BACKGROUND_RESTRICTION_CHANGED = 5,
  APP_BLOCKED = 6,
  CHANNEL_BLOCKED = 7,
  CHANNEL_GROUP_BLOCKED = 8,
}

let realNotifee: any = null;
let isNativeSupported = false;

if (Platform.OS !== 'web') {
  try {
    // Dynamically require to prevent compile-time/start-time crashing when module is missing
    const packageExports = require('react-native-notify-kit');
    realNotifee = packageExports.default || packageExports;
    isNativeSupported = true;
    console.log('[SafeNotifee] Native module successfully resolved.');
  } catch (e) {
    console.warn(
      '[SafeNotifee] Could not resolve native react-native-notify-kit module. Falling back to mock.',
      e
    );
  }
}

// ─── Mock Implementation ────────────────────────────────────────────────────────

const mockNotifee = {
  requestPermission: async (): Promise<any> => ({
    authorizationStatus: AuthorizationStatus.AUTHORIZED,
  }),
  registerForegroundService: () => {},
  displayNotification: async (notification: Notification) => {
    console.log('[SafeNotifee Mock] Display notification:', notification.title, notification.body);
    return 'mock-notification-id';
  },
  createTriggerNotification: async (notification: Notification, trigger: TimestampTrigger) => {
    console.log('[SafeNotifee Mock] Create trigger notification:', notification.title, trigger);
    return 'mock-trigger-id';
  },
  cancelNotification: async (id: string) => {
    console.log('[SafeNotifee Mock] Cancel notification:', id);
  },
  cancelAllNotifications: async () => {
    console.log('[SafeNotifee Mock] Cancel all notifications');
  },
  deleteChannel: async (id: string) => {
    console.log('[SafeNotifee Mock] Delete channel:', id);
  },
  createChannel: async (channel: any) => {
    console.log('[SafeNotifee Mock] Create channel:', channel.id);
    return 'mock-channel-id';
  },
  getInitialNotification: async (): Promise<any> => {
    return null;
  },
  onForegroundEvent: (callback: (event: any) => void) => {
    return () => {};
  },
  onBackgroundEvent: (callback: (event: any) => void) => {},
};

const safeNotifee = (isNativeSupported ? realNotifee : mockNotifee) as typeof mockNotifee;

export default safeNotifee;
