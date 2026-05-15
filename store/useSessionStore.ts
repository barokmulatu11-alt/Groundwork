import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Device from 'expo-device';
import { useAuthStore } from './useAuthStore';

export interface UserSession {
  id: string; // The unique device_id
  device: string;
  os: string;
  location: string;
  last_active: string;
  created_at: string;
  suspicious?: boolean;
}

interface SessionState {
  deviceId: string | null;
  activeSessions: UserSession[];
  isLoadingSessions: boolean;
  initializeDevice: () => Promise<void>;
  syncSessions: () => Promise<void>;
  revokeSession: (sessionId: string) => Promise<void>;
  revokeAllOtherSessions: () => Promise<void>;
}

const DEVICE_ID_KEY = 'groundwork_device_id';

const generateDeviceId = () => {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

export const useSessionStore = create<SessionState>((set, get) => ({
  deviceId: null,
  activeSessions: [],
  isLoadingSessions: false,

  initializeDevice: async () => {
    let id = await AsyncStorage.getItem(DEVICE_ID_KEY);
    if (!id) {
      id = generateDeviceId();
      await AsyncStorage.setItem(DEVICE_ID_KEY, id);
    }
    set({ deviceId: id });
    await get().syncSessions();
  },

  syncSessions: async () => {
    const { session } = useAuthStore.getState();
    const { deviceId } = get();
    if (!session?.user || !deviceId) return;

    set({ isLoadingSessions: true });

    try {
      // Fetch user metadata
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) throw error;

      let sessions: UserSession[] = user.user_metadata?.sessions || [];

      // Check if we were revoked remotely
      const previousSessions = get().activeSessions;
      if (previousSessions.length > 0) {
        const amIStillAlive = sessions.some(s => s.id === deviceId);
        if (!amIStillAlive) {
          // Force logout immediately
          useAuthStore.getState().signOut();
          return;
        }
      }

      // Update current session
      const now = new Date().toISOString();
      let locationStr = 'Unknown Location';
      try {
        const response = await fetch('https://ipapi.co/json/');
        const data = await response.json();
        if (data && data.city && data.country_name) {
          locationStr = `${data.city}, ${data.country_name}`;
        }
      } catch (e) {
        // Fallback or ignore
      }

      const currentSessionData: UserSession = {
        id: deviceId,
        device: Device.modelName || 'Unknown Device',
        os: `${Device.osName} ${Device.osVersion}`,
        location: locationStr,
        last_active: now,
        created_at: now,
        suspicious: false,
      };

      const existingIndex = sessions.findIndex(s => s.id === deviceId);
      if (existingIndex >= 0) {
        currentSessionData.created_at = sessions[existingIndex].created_at; // Preserve original creation date
        sessions[existingIndex] = currentSessionData;
      } else {
        sessions.push(currentSessionData);
      }

      // Flag suspicious logins (e.g. if IP changed drastically, or we have >5 sessions)
      // For now, let's just mark if there are more than 5 sessions active to warn user
      if (sessions.length > 5) {
        sessions = sessions.map(s => ({ ...s, suspicious: s.id !== deviceId && (new Date(s.last_active).getTime() < Date.now() - 30 * 24 * 60 * 60 * 1000) }));
      }
      
      // Cleanup expired sessions (older than 30 days)
      const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;
      sessions = sessions.filter(s => {
        const age = Date.now() - new Date(s.last_active).getTime();
        return age < THIRTY_DAYS || s.id === deviceId;
      });

      // Update backend metadata if changed
      await supabase.auth.updateUser({
        data: { sessions }
      });

      set({ activeSessions: sessions.sort((a, b) => new Date(b.last_active).getTime() - new Date(a.last_active).getTime()) });
    } catch (e) {
      console.warn('[SessionStore] Error syncing sessions', e);
    } finally {
      set({ isLoadingSessions: false });
    }
  },

  revokeSession: async (sessionId) => {
    const { deviceId, activeSessions } = get();
    if (!deviceId) return;

    // Filter it out
    const updatedSessions = activeSessions.filter(s => s.id !== sessionId);

    // Update backend
    await supabase.auth.updateUser({
      data: { sessions: updatedSessions }
    });

    set({ activeSessions: updatedSessions });
  },

  revokeAllOtherSessions: async () => {
    const { deviceId, activeSessions } = get();
    if (!deviceId) return;

    try {
      // Supabase native global sign out (logs out other sessions from the server side)
      await supabase.auth.signOut({ scope: 'others' });
    } catch (e) {
      console.warn('Failed to call signOut with scope: others, but continuing manual revoke', e);
    }

    // Keep only this device
    const updatedSessions = activeSessions.filter(s => s.id === deviceId);

    // Update metadata
    await supabase.auth.updateUser({
      data: { sessions: updatedSessions }
    });

    set({ activeSessions: updatedSessions });
  }
}));
