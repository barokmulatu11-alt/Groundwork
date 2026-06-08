import { useState, useEffect, useCallback } from 'react';
import { db } from '@/lib/db';
import { useAuthStore } from '@/store/useAuthStore';
import { supabase } from '@/lib/connect/connectSupabase';

export interface ProfileStats {
  totalNotes: number;
  totalTasksCompleted: number;
  totalStudyHours: number;
  revisionSessionsCompleted: number;
  currentStreak: number;
  longestStreak: number;
  activeSubjectsCount: number;
  averageDailyActivityScore: number;
  focusScore: number;
}

const EMPTY_STATS: ProfileStats = {
  totalNotes: 0,
  totalTasksCompleted: 0,
  totalStudyHours: 0,
  revisionSessionsCompleted: 0,
  currentStreak: 0,
  longestStreak: 0,
  activeSubjectsCount: 0,
  averageDailyActivityScore: 0,
  focusScore: 0,
};

// Derive stats from XP log entries (cross-device reliable source)
function deriveStatsFromXpLogs(
  logs: { xp_amount: number; reason: string; created_at: string }[]
): ProfileStats {
  let totalTasksCompleted = 0;
  let totalFocusMinutes = 0;
  let totalNotes = 0;
  let revisionSessionsCompleted = 0;

  for (const log of logs) {
    const r = log.reason.toLowerCase();
    if (r.includes('task completed') || r.includes('daily all tasks')) {
      totalTasksCompleted++;
    } else if (r.includes('focus session')) {
      // Each focus session award = ~25 min average session
      totalFocusMinutes += 25;
      if (r.includes('45')) totalFocusMinutes += 20; // bonus for 45-min sessions
    } else if (r.includes('note created')) {
      totalNotes++;
    } else if (r.includes('revision session') || r.includes('flashcard')) {
      revisionSessionsCompleted++;
    }
  }

  // Derive streak from consecutive days that had ANY XP activity
  const activeDays = [
    ...new Set(
      logs
        .map((l) => l.created_at?.substring(0, 10))
        .filter(Boolean)
    ),
  ].sort();

  let currentStreak = 0;
  let longestStreak = 0;
  let runStreak = 0;

  for (let i = 0; i < activeDays.length; i++) {
    if (i === 0) {
      runStreak = 1;
    } else {
      const prev = new Date(activeDays[i - 1]);
      const curr = new Date(activeDays[i]);
      const diffDays = Math.round(
        (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (diffDays === 1) {
        runStreak++;
      } else {
        runStreak = 1;
      }
    }
    longestStreak = Math.max(longestStreak, runStreak);
  }

  // Current streak: check if the last active day was today or yesterday
  if (activeDays.length > 0) {
    const lastActive = new Date(activeDays[activeDays.length - 1]);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    lastActive.setHours(0, 0, 0, 0);
    const diffDays = Math.round(
      (today.getTime() - lastActive.getTime()) / (1000 * 60 * 60 * 24)
    );
    currentStreak = diffDays <= 1 ? runStreak : 0;
  }

  const totalStudyHours = Math.round((totalFocusMinutes / 60) * 10) / 10;
  const daysCount = Math.max(1, activeDays.length);
  const totalActivity = totalTasksCompleted + totalNotes + revisionSessionsCompleted;
  const averageDailyActivityScore = Math.round((totalActivity / daysCount) * 10) / 10;
  const focusScore = Math.min(
    100,
    Math.round(currentStreak * 4 + totalStudyHours * 3 + totalTasksCompleted * 2)
  );

  return {
    totalNotes,
    totalTasksCompleted,
    totalStudyHours,
    revisionSessionsCompleted,
    currentStreak,
    longestStreak,
    activeSubjectsCount: 0, // can only be derived from local notes table
    averageDailyActivityScore,
    focusScore,
  };
}

export const useProfileStats = (targetUserId?: string) => {
  const { session, isGuest } = useAuthStore();
  const currentUserId = session?.user?.id || (isGuest ? 'guest' : 'guest');
  const userId = targetUserId || currentUserId;

  const [stats, setStats] = useState<ProfileStats>(EMPTY_STATS);
  const [loading, setLoading] = useState(true);

  const calculateStats = useCallback(async () => {
    if (!userId || userId === 'guest') {
      setLoading(false);
      return;
    }

    try {
      // ── 1. Query local SQLite ──────────────────────────────────────────────
      const notesRes = db.getFirstSync<{ count: number }>(
        'SELECT COUNT(*) as count FROM notes WHERE user_id = ? AND deleted_at IS NULL',
        [userId]
      );
      const tasksRes = db.getFirstSync<{ count: number }>(
        'SELECT COUNT(*) as count FROM tasks WHERE user_id = ? AND completed = 1 AND deleted_at IS NULL',
        [userId]
      );
      const focusRes = db.getFirstSync<{ sum: number }>(
        'SELECT SUM(duration_minutes) as sum FROM focus_sessions WHERE user_id = ?',
        [userId]
      );
      const revisionRes = db.getFirstSync<{ count: number }>(
        'SELECT COUNT(*) as count FROM notes WHERE user_id = ? AND last_reviewed_at IS NOT NULL AND deleted_at IS NULL',
        [userId]
      );
      const habitStreakRes = db.getFirstSync<{ max_streak: number; current_max: number }>(
        'SELECT MAX(best_streak) as max_streak, MAX(streak) as current_max FROM habits WHERE user_id = ? AND deleted_at IS NULL',
        [userId]
      );
      const profileStreakRes = db.getFirstSync<{ longest_streak: number }>(
        'SELECT longest_streak FROM connect_profiles WHERE user_id = ?',
        [userId]
      );
      const subjectsRes = db.getFirstSync<{ count: number }>(
        'SELECT COUNT(DISTINCT folder) as count FROM notes WHERE user_id = ? AND deleted_at IS NULL',
        [userId]
      );
      const checkinsRes = db.getFirstSync<{ count: number }>(
        'SELECT COUNT(*) as count FROM habit_checkins WHERE user_id = ?',
        [userId]
      );
      const focusSessRes = db.getFirstSync<{ count: number }>(
        'SELECT COUNT(*) as count FROM focus_sessions WHERE user_id = ?',
        [userId]
      );
      const joinedRes = db.getFirstSync<{ joined_at: string }>(
        'SELECT joined_at FROM connect_profiles WHERE user_id = ?',
        [userId]
      );

      const localNotes = notesRes?.count || 0;
      const localTasks = tasksRes?.count || 0;
      const localFocusMin = focusRes?.sum || 0;
      const localRevision = revisionRes?.count || 0;
      const longestStreak = Math.max(
        profileStreakRes?.longest_streak || 0,
        habitStreakRes?.max_streak || 0
      );
      const currentStreak = habitStreakRes?.current_max || 0;
      const activeSubjectsCount = subjectsRes?.count || 0;

      let daysCount = 1;
      if (joinedRes?.joined_at) {
        const joinDate = new Date(joinedRes.joined_at);
        const today = new Date();
        daysCount = Math.max(
          1,
          Math.ceil((today.getTime() - joinDate.getTime()) / (1000 * 60 * 60 * 24))
        );
      }

      const totalActivity =
        localNotes +
        localTasks +
        (checkinsRes?.count || 0) +
        (focusSessRes?.count || 0);

      const localStats: ProfileStats = {
        totalNotes: localNotes,
        totalTasksCompleted: localTasks,
        totalStudyHours: Math.round((localFocusMin / 60) * 10) / 10,
        revisionSessionsCompleted: localRevision,
        currentStreak,
        longestStreak,
        activeSubjectsCount,
        averageDailyActivityScore: Math.round((totalActivity / daysCount) * 10) / 10,
        focusScore: Math.min(
          100,
          Math.round(currentStreak * 4 + (localFocusMin / 60) * 3 + localTasks * 2)
        ),
      };

      // ── 2. Detect empty local DB (web / fresh device) ─────────────────────
      const localIsEmpty =
        localNotes === 0 && localTasks === 0 && localFocusMin === 0;

      if (localIsEmpty && session?.user?.id) {
        // ── 3. Fall back to Supabase connect_xp_log (always synced) ──────────
        // This is the DEFINITIVE cross-device data source.
        try {
          const { data: xpLogs, error } = await supabase
            .from('connect_xp_log')
            .select('xp_amount, reason, created_at')
            .eq('user_id', userId)
            .order('created_at', { ascending: true });

          if (!error && xpLogs && xpLogs.length > 0) {
            const derived = deriveStatsFromXpLogs(xpLogs);
            setStats(derived);
            setLoading(false);
            return;
          }

          // Absolute last resort: try connect_profiles summary columns
          // (these may or may not exist depending on whether user ran migrations)
          const { data: cp } = await supabase
            .from('connect_profiles')
            .select('xp, tasks_completed_count, longest_streak, focus_hours')
            .eq('user_id', userId)
            .single();

          if (cp) {
            const t = (cp as any).tasks_completed_count || 0;
            const ls = (cp as any).longest_streak || 0;
            const fh = (cp as any).focus_hours || 0;
            if (t > 0 || ls > 0 || fh > 0) {
              setStats({
                ...EMPTY_STATS,
                totalTasksCompleted: t,
                longestStreak: ls,
                totalStudyHours: fh,
                focusScore: Math.min(100, Math.round(ls * 4 + fh * 3 + t * 2)),
              });
              setLoading(false);
              return;
            }
          }
        } catch (cloudErr) {
          console.warn('[useProfileStats] Cloud fallback error:', cloudErr);
        }
      }

      setStats(localStats);
    } catch (e) {
      console.error('[useProfileStats] error:', e);
      setStats(EMPTY_STATS);
    } finally {
      setLoading(false);
    }
  }, [userId, session?.user?.id]);

  useEffect(() => {
    calculateStats();
  }, [calculateStats]);

  return {
    stats,
    loading,
    refresh: calculateStats,
  };
};
