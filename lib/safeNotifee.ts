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

// ─── Web & Fallback Implementation ──────────────────────────────────────────

const activeWebTimers = new Map<string, any>();

const mockNotifee = {
  requestPermission: async (): Promise<any> => {
    if (Platform.OS === 'web') {
      if (typeof window === 'undefined' || !('Notification' in window)) {
        console.warn('[SafeNotifee Web] Web notifications are unsupported in this browser context.');
        return {
          authorizationStatus: AuthorizationStatus.DENIED,
        };
      }
      try {
        const res = await window.Notification.requestPermission();
        return {
          authorizationStatus:
            res === 'granted' ? AuthorizationStatus.AUTHORIZED : AuthorizationStatus.DENIED,
        };
      } catch (e) {
        console.warn('[SafeNotifee Web] Notification permission request error:', e);
        return {
          authorizationStatus: AuthorizationStatus.DENIED,
        };
      }
    }
    // When native module is absent, do not report fake AUTHORIZED status
    return {
      authorizationStatus: AuthorizationStatus.DENIED,
    };
  },
  registerForegroundService: () => {},
  displayNotification: async (notification: Notification) => {
    if (Platform.OS === 'web') {
      if (typeof window === 'undefined' || !('Notification' in window)) {
        console.warn('[SafeNotifee Web] Cannot display notification: Notification API not supported.');
        return null;
      }
      if (window.Notification.permission !== 'granted') {
        console.warn('[SafeNotifee Web] Cannot display notification: Permission is denied or not granted.');
        return null;
      }

      try {
        // Attempt ServiceWorker showNotification first for better desktop integration
        if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator && navigator.serviceWorker.controller) {
          const reg = await navigator.serviceWorker.ready;
          if (reg && reg.showNotification) {
            await reg.showNotification(notification.title || 'Groundwork', {
              body: notification.body || '',
              icon: '/favicon.ico',
            });
            return 'web-sw-notification-' + Date.now();
          }
        }

        // Fallback to standard Notification constructor
        new window.Notification(notification.title || 'Groundwork', {
          body: notification.body || '',
          icon: '/favicon.ico',
        });
        return 'web-notification-' + Date.now();
      } catch (e) {
        console.warn('[SafeNotifee Web] Notification display failed:', e);
        return null;
      }
    }
    console.log('[SafeNotifee Mock] Display notification:', notification.title, notification.body);
    return 'mock-notification-id';
  },
  createTriggerNotification: async (notification: Notification, trigger: TimestampTrigger) => {
    if (Platform.OS === 'web') {
      if (typeof window === 'undefined' || !('Notification' in window) || window.Notification.permission !== 'granted') {
        console.warn('[SafeNotifee Web] Trigger notification not scheduled: Notifications unsupported or not granted.');
        return null;
      }

      try {
        const triggerTime = (trigger as any)?.timestamp;
        if (triggerTime) {
          const delay = Math.max(0, triggerTime - Date.now());
          const id = notification.id || 'trigger-' + Date.now();
          // BROWSER LIMITATION: Browser setTimeout timers can only execute while the application tab remains open in the browser.
          // True closed-browser reminders require external Web Push servers and Service Worker push events.
          const timerId = window.setTimeout(async () => {
            if (window.Notification.permission === 'granted') {
              if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
                try {
                  const reg = await navigator.serviceWorker.ready;
                  if (reg && reg.showNotification) {
                    await reg.showNotification(notification.title || 'Groundwork', {
                      body: notification.body || '',
                      icon: '/favicon.ico',
                    });
                    return;
                  }
                } catch (_) {}
              }

              new window.Notification(notification.title || 'Groundwork', {
                body: notification.body || '',
                icon: '/favicon.ico',
              });
            }
            activeWebTimers.delete(id);
          }, delay);
          activeWebTimers.set(id, timerId);
          return id;
        }
      } catch (e) {
        console.warn('[SafeNotifee Web] Trigger notification scheduling failed:', e);
        return null;
      }
    }
    console.log('[SafeNotifee Mock] Create trigger notification:', notification.title, trigger);
    return 'mock-trigger-id';
  },
  cancelNotification: async (id: string) => {
    if (activeWebTimers.has(id)) {
      clearTimeout(activeWebTimers.get(id));
      activeWebTimers.delete(id);
    }
    console.log('[SafeNotifee Mock] Cancel notification:', id);
  },
  cancelAllNotifications: async () => {
    activeWebTimers.forEach((timerId) => clearTimeout(timerId));
    activeWebTimers.clear();
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
