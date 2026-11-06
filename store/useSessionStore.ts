import { supabase } from "@/lib/supabase";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Device from "expo-device";
import { create } from "zustand";
import { useAuthStore } from "./useAuthStore";

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

const DEVICE_ID_KEY = "groundwork_device_id";

const generateDeviceId = () => {
  return (
    Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15)
  );
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
      // Use active in-memory session user first, with safe fallback to auth API
      let user = session?.user;
      if (!user && typeof supabase?.auth?.getUser === 'function') {
        try {
          const authUserRes = await supabase.auth.getUser();
          user = authUserRes?.data?.user || null;
        } catch (_) {}
      }
      if (!user) {
        throw new Error("No authenticated user found");
      }

      let rawSessions = user.user_metadata?.sessions;
      if (typeof rawSessions === 'string') {
        try {
          rawSessions = JSON.parse(rawSessions);
        } catch (_) {
          rawSessions = [];
        }
      }
      let sessions: UserSession[] = Array.isArray(rawSessions) ? [...rawSessions] : [];

      // If user_metadata does not have sessions, try reading from profiles.settings
      if (sessions.length === 0 && user.id) {
        try {
          const { data: profile } = await supabase
            .from("profiles")
            .select("settings")
            .eq("id", user.id)
            .maybeSingle();
          if (profile?.settings?.sessions) {
            let pSessions = profile.settings.sessions;
            if (typeof pSessions === 'string') {
              try { pSessions = JSON.parse(pSessions); } catch (_) {}
            }
            if (Array.isArray(pSessions)) {
              sessions = [...pSessions];
            }
          }
        } catch (_) {}
      }

      // Check if we were revoked remotely
      const previousSessions = Array.isArray(get().activeSessions) ? get().activeSessions : [];
      if (previousSessions.length > 0 && sessions.length > 0) {
        const amIStillAlive = sessions.some((s) => s && s.id === deviceId);
        if (!amIStillAlive) {
          // Force logout immediately
          useAuthStore.getState().signOut();
          return;
        }
      }

      // Update current session
      const now = new Date().toISOString();
      let locationStr = "Unknown Location";
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000);
        const response = await fetch("https://ipapi.co/json/", {
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        if (response.ok) {
          const data = await response.json();
          if (data && data.city && data.country_name) {
            locationStr = `${data.city}, ${data.country_name}`;
          }
        }
      } catch (e) {
        console.log(
          "[SessionStore] Location fetch skipped (offline or timeout)",
        );
      }

      const currentSessionData: UserSession = {
        id: deviceId,
        device: Device?.modelName || "Unknown Device",
        os: `${Device?.osName || "Unknown OS"} ${Device?.osVersion || ""}`.trim(),
        location: locationStr,
        last_active: now,
        created_at: now,
        suspicious: false,
      };

      const existingIndex = sessions.findIndex((s) => s && s.id === deviceId);
      if (existingIndex >= 0) {
        currentSessionData.created_at = sessions[existingIndex]?.created_at || now; // Preserve original creation date
        sessions[existingIndex] = currentSessionData;
      } else {
        sessions.push(currentSessionData);
      }

      // Flag suspicious logins (e.g. if IP changed drastically, or we have >5 sessions)
      if (sessions.length > 5) {
        sessions = sessions.map((s) => ({
          ...s,
          suspicious:
            Boolean(s &&
            s.id !== deviceId &&
            new Date(s.last_active || 0).getTime() <
              Date.now() - 30 * 24 * 60 * 60 * 1000),
        }));
      }

      // Cleanup expired sessions (older than 30 days)
      const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;
      sessions = sessions.filter((s) => {
        if (!s || !s.id) return false;
        const age = Date.now() - new Date(s.last_active || 0).getTime();
        return age < THIRTY_DAYS || s.id === deviceId;
      });

      // Update backend metadata if changed
      if (typeof supabase?.auth?.updateUser === 'function') {
        await supabase.auth.updateUser({
          data: { sessions },
        });
      }

      const sortedSessions = [...sessions].sort(
        (a, b) =>
          new Date(b?.last_active || 0).getTime() -
          new Date(a?.last_active || 0).getTime(),
      );
      set({ activeSessions: sortedSessions });
    } catch (e: any) {
      console.warn("[SessionStore] Error syncing sessions", e?.message || e);
    } finally {
      set({ isLoadingSessions: false });
    }
  },

  revokeSession: async (sessionId) => {
    const { deviceId, activeSessions } = get();
    if (!deviceId) return;

    const currentSessions = Array.isArray(activeSessions) ? activeSessions : [];
    // Filter it out
    const updatedSessions = currentSessions.filter((s) => s && s.id !== sessionId);

    // Update backend
    if (typeof supabase?.auth?.updateUser === 'function') {
      await supabase.auth.updateUser({
        data: { sessions: updatedSessions },
      });
    }

    set({ activeSessions: updatedSessions });
  },

  revokeAllOtherSessions: async () => {
    const { deviceId, activeSessions } = get();
    if (!deviceId) return;

    try {
      // Supabase native global sign out (logs out other sessions from the server side)
      if (typeof supabase?.auth?.signOut === 'function') {
        await supabase.auth.signOut({ scope: "others" });
      }
    } catch (e) {
      console.warn(
        "Failed to call signOut with scope: others, but continuing manual revoke",
        e,
      );
    }

    const currentSessions = Array.isArray(activeSessions) ? activeSessions : [];
    // Keep only this device
    const updatedSessions = currentSessions.filter((s) => s && s.id === deviceId);

    // Update metadata
    if (typeof supabase?.auth?.updateUser === 'function') {
      await supabase.auth.updateUser({
        data: { sessions: updatedSessions },
      });
    }

    set({ activeSessions: updatedSessions });
  },
}));
