import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { db } from '@/lib/db';
import { getLevelFromXP, getXPForNextLevel, getLevelTitle, subscribeToConnectEvents, ConnectEvent } from '@/lib/connect/xpSystem';

export const useXP = () => {
  const { session, isGuest } = useAuthStore();
  const userId = session?.user?.id || (isGuest ? 'guest' : 'guest');

  const [xp, setXp] = useState(0);
  const [level, setLevel] = useState(1);
  const [lastEvent, setLastEvent] = useState<ConnectEvent | null>(null);

  const loadXp = () => {
    if (!userId) return;
    try {
      const profile = db.getFirstSync<{xp: number; level: number}>('SELECT xp, level FROM connect_profiles WHERE user_id = ?', [userId]);
      if (profile) {
        setXp(profile.xp || 0);
        setLevel(profile.level || 1);
      }
    } catch (e) {
      console.error('[useXP] load error:', e);
    }
  };

  useEffect(() => {
    loadXp();
    const unsubscribe = subscribeToConnectEvents((event) => {
      setLastEvent(event);
      loadXp();
    });
    return unsubscribe;
  }, [userId]);

  const clearLastEvent = () => setLastEvent(null);

  const nextLevelXp = getXPForNextLevel(level);
  const currentLevelMinXp = level === 1 ? 0 : getXPForNextLevel(level - 1);
  const progress = level >= 100 ? 1 : (xp - currentLevelMinXp) / (nextLevelXp - currentLevelMinXp);

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
