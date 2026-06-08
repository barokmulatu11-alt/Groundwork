import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { db } from '@/lib/db';
import {
  getLevelFromXP,
  getXPForNextLevel,
  getLevelTitle,
  subscribeToConnectEvents,
  ConnectEvent,
} from '@/lib/connect/xpSystem';
import { supabase } from '@/lib/connect/connectSupabase';

export const useXP = () => {
  const { session, isGuest } = useAuthStore();
  const userId = session?.user?.id || (isGuest ? 'guest' : 'guest');

  const [xp, setXp] = useState(0);
  const [level, setLevel] = useState(1);
  const [lastEvent, setLastEvent] = useState<ConnectEvent | null>(null);

  const applyXp = useCallback((rawXp: number) => {
    const computedLevel = getLevelFromXP(rawXp);
    setXp(rawXp);
    setLevel(computedLevel);
  }, []);

  const loadXp = useCallback(async () => {
    if (!userId || userId === 'guest') return;
    try {
      // ── 1. Try local SQLite ──────────────────────────────────────────────
      const localRow = db.getFirstSync<{ xp: number; level: number }>(
        'SELECT xp, level FROM connect_profiles WHERE user_id = ?',
        [userId]
      );

      if (localRow) {
        const storedXp = localRow.xp || 0;
        applyXp(storedXp);
        // Silently repair corrupted stored level
        const correct = getLevelFromXP(storedXp);
        if (localRow.level !== correct) {
          try {
            db.runSync(
              'UPDATE connect_profiles SET level = ? WHERE user_id = ?',
              [correct, userId]
            );
          } catch (_) {}
        }
        return;
      }

      // ── 2. Local is empty (web/fresh device) — fall back to Supabase ────
      if (session?.user?.id) {
        const { data, error } = await supabase
          .from('connect_profiles')
          .select('xp')
          .eq('user_id', userId)
          .single();
        if (!error && data) {
          applyXp(data.xp || 0);
        }
      }
    } catch (e) {
      console.error('[useXP] load error:', e);
    }
  }, [userId, session?.user?.id, applyXp]);

  useEffect(() => {
    loadXp();

    const unsubscribe = subscribeToConnectEvents((event) => {
      setLastEvent(event);
      if (event.type === 'XP_UPDATED') {
        // Apply directly from event — fastest possible UI update
        applyXp(event.xp);
      } else {
        loadXp();
      }
    });

    return unsubscribe;
  }, [userId, loadXp, applyXp]);

  const clearLastEvent = () => setLastEvent(null);

  const nextLevelXp = getXPForNextLevel(level);
  const currentLevelMinXp = level === 1 ? 0 : getXPForNextLevel(level - 1);
  const progress =
    level >= 100 ? 1 : (xp - currentLevelMinXp) / (nextLevelXp - currentLevelMinXp);

  return {
    xp,
    level,
    levelTitle: getLevelTitle(level),
    nextLevelTitle: getLevelTitle(level + 1),
    nextLevelXp,
    progress: Math.max(0, Math.min(1, progress)),
    lastEvent,
    clearLastEvent,
    refresh: loadXp,
  };
};
