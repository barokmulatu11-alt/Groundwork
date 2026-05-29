import { useState, useEffect, useCallback } from 'react';
import { db } from '@/lib/db';
import { useAuthStore } from '@/store/useAuthStore';

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

export const useProfileStats = (targetUserId?: string) => {
  const { session, isGuest } = useAuthStore();
  const currentUserId = session?.user?.id || (isGuest ? 'guest' : 'guest');
  const userId = targetUserId || currentUserId;

  const [stats, setStats] = useState<ProfileStats>({
    totalNotes: 0,
    totalTasksCompleted: 0,
    totalStudyHours: 0,
    revisionSessionsCompleted: 0,
    currentStreak: 0,
    longestStreak: 0,
    activeSubjectsCount: 0,
    averageDailyActivityScore: 0,
    focusScore: 0,
  });
  const [loading, setLoading] = useState(true);

  const calculateStats = useCallback(() => {
    if (!userId || userId === 'guest') {
      setLoading(false);
      return;
    }

    try {
      // 1. Total Notes Created
      const notesRes = db.getFirstSync<{ count: number }>(
        'SELECT COUNT(*) as count FROM notes WHERE user_id = ? AND deleted_at IS NULL',
        [userId]
      );
      const totalNotes = notesRes?.count || 0;

      // 2. Total Tasks Completed
      const tasksRes = db.getFirstSync<{ count: number }>(
        'SELECT COUNT(*) as count FROM tasks WHERE user_id = ? AND completed = 1 AND deleted_at IS NULL',
        [userId]
      );
      const totalTasksCompleted = tasksRes?.count || 0;

      // 3. Total Study Hours (note study hours + focus session hours)
      const noteHoursRes = db.getFirstSync<{ sum: number }>(
        'SELECT SUM(study_hours) as sum FROM notes WHERE user_id = ? AND deleted_at IS NULL',
        [userId]
      );
      const focusSessionMinRes = db.getFirstSync<{ sum: number }>(
        'SELECT SUM(duration_minutes) as sum FROM focus_sessions WHERE user_id = ?',
        [userId]
      );
      const noteHours = noteHoursRes?.sum || 0;
      const focusHours = (focusSessionMinRes?.sum || 0) / 60;
      const totalStudyHours = Math.round((noteHours + focusHours) * 10) / 10;

      // 4. Revision Sessions Completed
      const revisionRes = db.getFirstSync<{ count: number }>(
        'SELECT COUNT(*) as count FROM notes WHERE user_id = ? AND last_reviewed_at IS NOT NULL AND deleted_at IS NULL',
        [userId]
      );
      const revisionSessionsCompleted = revisionRes?.count || 0;

      // 5. Streaks (from habits best/current streak, or profile cache)
      const profileStreakRes = db.getFirstSync<{ longest_streak: number }>(
        'SELECT longest_streak FROM connect_profiles WHERE user_id = ?',
        [userId]
      );
      const habitStreakRes = db.getFirstSync<{ max_streak: number; current_max: number }>(
        'SELECT MAX(best_streak) as max_streak, MAX(streak) as current_max FROM habits WHERE user_id = ? AND deleted_at IS NULL',
        [userId]
      );

      const longestStreak = Math.max(
        profileStreakRes?.longest_streak || 0,
        habitStreakRes?.max_streak || 0
      );
      const currentStreak = habitStreakRes?.current_max || 0;

      // 6. Active Subjects Count (Distinct folders)
      const subjectsRes = db.getFirstSync<{ count: number }>(
        'SELECT COUNT(DISTINCT folder) as count FROM notes WHERE user_id = ? AND deleted_at IS NULL',
        [userId]
      );
      const activeSubjectsCount = subjectsRes?.count || 0;

      // 7. Average Daily Activity Score
      // Calculated as sum of events over days since joined
      const joinedRes = db.getFirstSync<{ joined_at: string }>(
        'SELECT joined_at FROM connect_profiles WHERE user_id = ?',
        [userId]
      );
      let daysCount = 1;
      if (joinedRes?.joined_at) {
        const joinDate = new Date(joinedRes.joined_at);
        const today = new Date();
        const diffTime = Math.abs(today.getTime() - joinDate.getTime());
        daysCount = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
      }

      const totalCheckinsRes = db.getFirstSync<{ count: number }>(
        'SELECT COUNT(*) as count FROM habit_checkins WHERE user_id = ?',
        [userId]
      );
      const totalFocusRes = db.getFirstSync<{ count: number }>(
        'SELECT COUNT(*) as count FROM focus_sessions WHERE user_id = ?',
        [userId]
      );

      const totalActivityEvents =
        totalNotes +
        totalTasksCompleted +
        (totalCheckinsRes?.count || 0) +
        (totalFocusRes?.count || 0);

      const averageDailyActivityScore = Math.round((totalActivityEvents / daysCount) * 10) / 10;

      // 8. Focus Score (derived from consistency, tasks completed, and focus minutes)
      const focusMin = focusSessionMinRes?.sum || 0;
      const consistencyWeight = currentStreak * 4;
      const engagementWeight = (focusMin / 60) * 3 + totalTasksCompleted * 2;
      const focusScore = Math.min(100, Math.round(consistencyWeight + engagementWeight)) || 0;

      setStats({
        totalNotes,
        totalTasksCompleted,
        totalStudyHours,
        revisionSessionsCompleted,
        currentStreak,
        longestStreak,
        activeSubjectsCount,
        averageDailyActivityScore,
        focusScore,
      });
    } catch (e) {
      console.error('[useProfileStats] error:', e);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    calculateStats();
  }, [calculateStats]);

  return {
    stats,
    loading,
    refresh: calculateStats,
  };
};
