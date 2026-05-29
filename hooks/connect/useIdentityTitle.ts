import { useState, useEffect, useCallback } from 'react';
import { db } from '@/lib/db';
import { useAuthStore } from '@/store/useAuthStore';

export const useIdentityTitle = (targetUserId?: string) => {
  const { session, isGuest } = useAuthStore();
  const currentUserId = session?.user?.id || (isGuest ? 'guest' : 'guest');
  const userId = targetUserId || currentUserId;

  const [title, setTitle] = useState<string>('Active Learner');

  const calculateTitle = useCallback(() => {
    if (!userId || userId === 'guest') return;

    try {
      // Fetch stats
      const focusRes = db.getFirstSync<{ count: number; night_count: number }>(
        `SELECT COUNT(*) as count, 
                SUM(CASE WHEN CAST(strftime('%H', completed_at) AS INTEGER) >= 21 OR CAST(strftime('%H', completed_at) AS INTEGER) < 4 THEN 1 ELSE 0 END) as night_count
         FROM focus_sessions WHERE user_id = ?`,
        [userId]
      );
      
      const streakRes = db.getFirstSync<{ max_streak: number }>(
        'SELECT MAX(best_streak) as max_streak FROM habits WHERE user_id = ? AND deleted_at IS NULL',
        [userId]
      );

      const notesRes = db.getFirstSync<{ count: number }>(
        'SELECT COUNT(*) as count FROM notes WHERE user_id = ? AND deleted_at IS NULL',
        [userId]
      );

      const profileRes = db.getFirstSync<{ level: number }>(
        'SELECT level FROM connect_profiles WHERE user_id = ?',
        [userId]
      );

      const totalFocus = focusRes?.count || 0;
      const nightFocus = focusRes?.night_count || 0;
      const bestStreak = streakRes?.max_streak || 0;
      const totalNotes = notesRes?.count || 0;
      const level = profileRes?.level || 1;

      // Classifying algorithmically
      if (nightFocus > 0 && nightFocus >= totalFocus * 0.4) {
        setTitle('The Night Scholar');
      } else if (bestStreak >= 10) {
        setTitle('The Consistent Learner');
      } else if (totalFocus >= 15) {
        setTitle('The Deep Focus Mind');
      } else if (level >= 10 || totalNotes >= 30) {
        setTitle('The High Performer');
      } else if (totalNotes > 0 && totalNotes <= 5) {
        setTitle('The Rising Star');
      } else {
        setTitle('Active Learner');
      }
    } catch (e) {
      console.error('[useIdentityTitle] error:', e);
      setTitle('Active Learner');
    }
  }, [userId]);

  useEffect(() => {
    calculateTitle();
  }, [calculateTitle]);

  return { title, refresh: calculateTitle };
};
