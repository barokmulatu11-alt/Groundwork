import { useState, useEffect, useCallback } from 'react';
import { db } from '@/lib/db';
import { useAuthStore } from '@/store/useAuthStore';
import { supabase } from '@/lib/connect/connectSupabase';

export type PrivacyLevel = 'public' | 'connections' | 'private';

export const usePrivacySettings = () => {
  const { session, isGuest } = useAuthStore();
  const userId = session?.user?.id || (isGuest ? 'guest' : 'guest');

  const [privacyLevel, setPrivacyLevel] = useState<PrivacyLevel>('public');
  const [loading, setLoading] = useState(true);

  const fetchSettings = useCallback(() => {
    if (!userId || userId === 'guest') {
      setLoading(false);
      return;
    }
    try {
      const res = db.getFirstSync<{ privacy_level: string }>(
        'SELECT privacy_level FROM connect_profiles WHERE user_id = ?',
        [userId]
      );
      if (res?.privacy_level) {
        setPrivacyLevel(res.privacy_level as PrivacyLevel);
      }
    } catch (e) {
      console.error('[usePrivacySettings] fetch error:', e);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const updatePrivacyLevel = async (level: PrivacyLevel) => {
    if (!userId || userId === 'guest') return false;
    const now = new Date().toISOString();
    try {
      // 1. Update SQLite
      db.runSync(
        'UPDATE connect_profiles SET privacy_level = ?, updated_at = ? WHERE user_id = ?',
        [level, now, userId]
      );
      setPrivacyLevel(level);

      // 2. Sync to Supabase
      const { error } = await supabase
        .from('connect_profiles')
        .update({ privacy_level: level, updated_at: now })
        .eq('user_id', userId);

      if (error) {
        console.error('[usePrivacySettings] Supabase update error:', error);
        return false;
      }
      return true;
    } catch (e) {
      console.error('[usePrivacySettings] update error:', e);
      return false;
    }
  };

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  return {
    privacyLevel,
    loading,
    updatePrivacyLevel,
    refresh: fetchSettings,
  };
};
