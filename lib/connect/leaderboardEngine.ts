import { db } from '../db';
import { supabase } from './connectSupabase';

// ─── Scoring Weights (configurable) ──────────────────────────────────────────
export const SCORE_WEIGHTS = {
  productivity: 0.60,
  consistency: 0.30,
  social: 0.10,
};

// ─── Action Point Values ──────────────────────────────────────────────────────
export const ACTION_POINTS = {
  // Productivity
  TASK_COMPLETED: 10,
  TASK_HIGH_PRIORITY: 18,       // High-priority completed task
  TASK_ON_TIME: 5,              // Bonus for completing before deadline
  FOCUS_SESSION: 20,
  FOCUS_SESSION_45MIN: 35,      // Longer session bonus
  DAILY_ALL_TASKS_DONE: 40,     // Perfect day bonus
  // Consistency (applied as streak multipliers)
  STREAK_DAY_BONUS: 5,          // Per day of active streak, compounded
  // Social
  FOLLOW_USER: 8,
  GAIN_FOLLOWER: 12,
  // Daily cap per category to prevent farming
  DAILY_CAP_PRODUCTIVITY: 200,
  DAILY_CAP_CONSISTENCY: 80,
  DAILY_CAP_SOCIAL: 50,
};

// ─── Score Record ─────────────────────────────────────────────────────────────
export interface LeaderboardScore {
  user_id: string;
  username: string;
  avatar_url: string | null;
  level: number;
  productivity_score: number;
  consistency_score: number;
  social_score: number;
  total_score: number;
  weekly_score: number;
  monthly_score: number;
  streak_count: number;
  last_active: string | null;
  rank_movement: 'up' | 'down' | 'same';
  institution?: string | null;
  academic_tier?: string;
  weekly_details?: {
    studyHours: number;
    notesCreated: number;
    revisionsCount: number;
    taskCompletionRate: number;
    activeDays: number;
  };
}

// ─── Mock Competitors Cleanup ────────────────────────────────────────────────
// Clean up all mock accounts from local database to respect user choice
export const ensureMockCompetitorsExist = () => {
  try {
    db.runSync("DELETE FROM connect_profiles WHERE user_id LIKE 'mock_%'");
  } catch (e) {
    console.error('[leaderboardEngine] failed to clear mock competitors:', e);
  }
};

// ─── Rank Tiers System ────────────────────────────────────────────────────────
export const getAcademicTier = (level: number): string => {
  if (level >= 46) return 'Elite Academic';
  if (level >= 31) return 'Diamond Master';
  if (level >= 21) return 'Platinum Achiever';
  if (level >= 13) return 'Gold Performer';
  if (level >= 6) return 'Silver Scholar';
  return 'Bronze Learner';
};

// ─── Dynamic Reset Countdown ──────────────────────────────────────────────────
export const getWeeklyResetCountdown = (): { days: number; hours: number; minutes: number } => {
  const now = new Date();
  const nextSunday = new Date();
  nextSunday.setDate(now.getDate() + (7 - now.getDay()) % 7);
  nextSunday.setHours(23, 59, 59, 999);
  
  const diffMs = nextSunday.getTime() - now.getTime();
  const totalMin = Math.max(0, Math.floor(diffMs / 60000));
  const days = Math.floor(totalMin / 1440);
  const hours = Math.floor((totalMin % 1440) / 60);
  const minutes = totalMin % 60;
  return { days, hours, minutes };
};

// ─── 1. Composite Weekly Study Score (Primary Focus) ─────────────────────────
export const computeWeeklyCompositeScore = (userId: string): {
  score: number;
  studyHours: number;
  notesCreated: number;
  revisionsCount: number;
  taskCompletionRate: number;
  streakCount: number;
  activeDaysCount: number;
} => {
  try {
    const now = new Date();
    const sinceDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const since = sinceDate.toISOString();

    // 1. Study Hours
    const noteHoursRes = db.getFirstSync<{ sum: number }>(
      'SELECT SUM(study_hours) as sum FROM notes WHERE user_id = ? AND deleted_at IS NULL AND updated_at >= ?',
      [userId, since]
    );
    const focusMinRes = db.getFirstSync<{ sum: number }>(
      'SELECT SUM(duration_minutes) as sum FROM focus_sessions WHERE user_id = ? AND created_at >= ?',
      [userId, since]
    );
    const noteHours = noteHoursRes?.sum || 0;
    const focusHours = (focusMinRes?.sum || 0) / 60;
    const studyHours = Math.round((noteHours + focusHours) * 10) / 10;

    // 2. Notes Created
    const notesRes = db.getFirstSync<{ count: number }>(
      'SELECT COUNT(*) as count FROM notes WHERE user_id = ? AND deleted_at IS NULL AND created_at >= ?',
      [userId, since]
    );
    const notesCreated = notesRes?.count || 0;

    // 3. Revisions Completed (Any note reviewed in the last 7 days)
    const revisionRes = db.getFirstSync<{ count: number }>(
      'SELECT COUNT(*) as count FROM notes WHERE user_id = ? AND last_reviewed_at >= ? AND deleted_at IS NULL',
      [userId, since]
    );
    const revisionsCount = revisionRes?.count || 0;

    // 4. Task Completion Rate
    const totalTasksRes = db.getFirstSync<{ count: number }>(
      'SELECT COUNT(*) as count FROM tasks WHERE user_id = ? AND created_at >= ? AND deleted_at IS NULL',
      [userId, since]
    );
    const completedTasksRes = db.getFirstSync<{ count: number }>(
      'SELECT COUNT(*) as count FROM tasks WHERE user_id = ? AND completed_at >= ? AND completed = 1 AND deleted_at IS NULL',
      [userId, since]
    );
    const totalTasks = totalTasksRes?.count || 0;
    const completedTasks = completedTasksRes?.count || 0;
    const taskCompletionRate = totalTasks > 0 ? (completedTasks / totalTasks) : 1.0;

    // 5. Streak Count
    const habitStreakRes = db.getFirstSync<{ current_max: number }>(
      'SELECT MAX(streak) as current_max FROM habits WHERE user_id = ? AND deleted_at IS NULL',
      [userId]
    );
    const streakCount = habitStreakRes?.current_max || 0;

    // 6. Active Days
    let activeDaysCount = 0;
    try {
      const activeDaysRows = db.getAllSync<{ day: string }>(
        `SELECT DISTINCT substr(created_at, 1, 10) as day FROM notes WHERE user_id = ? AND created_at >= ? AND deleted_at IS NULL
         UNION
         SELECT DISTINCT substr(created_at, 1, 10) as day FROM focus_sessions WHERE user_id = ? AND created_at >= ?
         UNION
         SELECT DISTINCT substr(completed_at, 1, 10) as day FROM tasks WHERE user_id = ? AND completed_at >= ? AND completed = 1 AND deleted_at IS NULL`,
        [userId, since, userId, since, userId, since]
      );
      activeDaysCount = activeDaysRows.length;
    } catch (_) {}

    // Scoring weights
    const scoreStudyHours = Math.min(studyHours, 30) * 15; // cap at 30 study hours
    const scoreNotes = Math.min(notesCreated, 15) * 10;     // cap at 15 notes
    const scoreRevisions = Math.min(revisionsCount, 25) * 12; // cap at 25 revisions
    const scoreTasks = taskCompletionRate * 100;
    const scoreStreak = Math.min(streakCount, 21) * 8;       // cap at 21 streak days
    const scoreActiveDays = activeDaysCount * 20;            // max 140

    const score = Math.round(
      scoreStudyHours + scoreNotes + scoreRevisions + scoreTasks + scoreStreak + scoreActiveDays
    );

    return {
      score,
      studyHours,
      notesCreated,
      revisionsCount,
      taskCompletionRate,
      streakCount,
      activeDaysCount
    };
  } catch (e) {
    console.error('[leaderboardEngine] computeWeeklyCompositeScore error:', e);
    return {
      score: 0,
      studyHours: 0,
      notesCreated: 0,
      revisionsCount: 0,
      taskCompletionRate: 1.0,
      streakCount: 0,
      activeDaysCount: 0
    };
  }
};

// ─── 2. Global Long-Term Consistency Score (Secondary) ──────────────────────
export const computeGlobalStudyScore = (userId: string, totalXP: number): number => {
  try {
    const statsRes = db.getFirstSync<{ count: number }>(
      'SELECT COUNT(*) as count FROM notes WHERE user_id = ? AND deleted_at IS NULL',
      [userId]
    );
    const tasksRes = db.getFirstSync<{ count: number }>(
      'SELECT COUNT(*) as count FROM tasks WHERE user_id = ? AND completed = 1 AND deleted_at IS NULL',
      [userId]
    );
    const streakRow = db.getFirstSync<{ best_streak: number }>(
      'SELECT MAX(best_streak) as best_streak FROM habits WHERE user_id = ? AND deleted_at IS NULL',
      [userId]
    );
    const bestStreak = streakRow?.best_streak || 0;
    const notesCount = statsRes?.count || 0;
    const tasksCount = tasksRes?.count || 0;

    return Math.round(totalXP * 0.4 + bestStreak * 25 + notesCount * 12 + tasksCount * 8);
  } catch (e) {
    console.error('[leaderboardEngine] computeGlobalStudyScore error:', e);
    return totalXP;
  }
};

// ─── 3. Subject-Specific Study Score ──────────────────────────────────────────
export const computeSubjectStudyScore = (userId: string, folder: string): number => {
  try {
    const notesRes = db.getFirstSync<{ count: number }>(
      'SELECT COUNT(*) as count FROM notes WHERE user_id = ? AND folder = ? AND deleted_at IS NULL',
      [userId, folder]
    );
    const revisionRes = db.getFirstSync<{ count: number }>(
      'SELECT COUNT(*) as count FROM notes WHERE user_id = ? AND folder = ? AND last_reviewed_at IS NOT NULL AND deleted_at IS NULL',
      [userId, folder]
    );
    const noteHoursRes = db.getFirstSync<{ sum: number }>(
      'SELECT SUM(study_hours) as sum FROM notes WHERE user_id = ? AND folder = ? AND deleted_at IS NULL',
      [userId, folder]
    );

    const notesCount = notesRes?.count || 0;
    const revisionsCount = revisionRes?.count || 0;
    const studyHours = noteHoursRes?.sum || 0;

    return Math.round(notesCount * 25 + revisionsCount * 30 + studyHours * 15);
  } catch (e) {
    console.error('[leaderboardEngine] computeSubjectStudyScore error:', e);
    return 0;
  }
};

// ─── Compute Score for a single user (Legacy helper upgraded) ─────────────────
export const computeUserScore = (
  userId: string,
  period: 'weekly' | 'monthly' | 'alltime'
): { productivity: number; consistency: number; social: number; total: number } => {
  try {
    const weeklyComp = computeWeeklyCompositeScore(userId);
    const productivity = Math.round(weeklyComp.studyHours * 10 + weeklyComp.notesCreated * 12);
    const consistency = Math.round(weeklyComp.streakCount * 15 + weeklyComp.activeDaysCount * 10);
    const social = Math.round(weeklyComp.revisionsCount * 8);
    const total = weeklyComp.score;

    return { productivity, consistency, social, total };
  } catch (e) {
    console.error('[leaderboardEngine] computeUserScore error:', e);
    return { productivity: 0, consistency: 0, social: 0, total: 0 };
  }
};

// (simulatePeerScore removed - mock accounts disabled)

// ─── Fetch local leaderboard (SQLite) ────────────────────────────────────────
export const fetchLocalLeaderboard = (
  period: 'weekly' | 'monthly' | 'alltime',
  scoreType: 'productivity' | 'consistency' | 'social' | 'total',
  limit = 50,
  offset = 0,
  subjectFolder?: string
): LeaderboardScore[] => {
  try {
    ensureMockCompetitorsExist();

    const profiles = db.getAllSync<{
      user_id: string; username: string; avatar_url: string | null; xp: number; level: number; institution: string | null; privacy_level: string | null; longest_streak: number | null;
    }>(
      `SELECT user_id, username, avatar_url, xp, level, institution, privacy_level, longest_streak 
       FROM connect_profiles 
       WHERE privacy_level != 'private' AND user_id != 'guest' 
       ORDER BY xp DESC`
    );

    const scored: LeaderboardScore[] = profiles.map(p => {
      let totalScore = 0;
      let streak = p.longest_streak || 0;
      let movement: 'up' | 'down' | 'same' = 'same';
      let weeklyDetails: any = undefined;

      // Determine appropriate score calculation depending on cycle period/type
      if (period === 'weekly') {
        const weeklyVal = computeWeeklyCompositeScore(p.user_id);
        totalScore = weeklyVal.score;
        streak = weeklyVal.streakCount;
        weeklyDetails = {
          studyHours: weeklyVal.studyHours,
          notesCreated: weeklyVal.notesCreated,
          revisionsCount: weeklyVal.revisionsCount,
          taskCompletionRate: weeklyVal.taskCompletionRate,
          activeDays: weeklyVal.activeDaysCount
        };
      } else if (subjectFolder) {
        totalScore = computeSubjectStudyScore(p.user_id, subjectFolder);
      } else {
        // Global / Long term consistency score
        totalScore = computeGlobalStudyScore(p.user_id, p.xp);
      }

      return {
        user_id: p.user_id,
        username: p.username || 'User',
        avatar_url: p.avatar_url || null,
        level: p.level || 1,
        productivity_score: Math.round(totalScore * SCORE_WEIGHTS.productivity),
        consistency_score: Math.round(totalScore * SCORE_WEIGHTS.consistency),
        social_score: Math.round(totalScore * SCORE_WEIGHTS.social),
        total_score: totalScore,
        weekly_score: period === 'weekly' ? totalScore : 0,
        monthly_score: period === 'monthly' ? totalScore : 0,
        streak_count: streak,
        last_active: null,
        rank_movement: movement,
        institution: p.institution || null,
        academic_tier: getAcademicTier(p.level),
        weekly_details: weeklyDetails
      };
    });

    // Sort descending
    scored.sort((a, b) => b.total_score - a.total_score);

    return scored.slice(offset, offset + limit);
  } catch (e) {
    console.error('[leaderboardEngine] fetchLocalLeaderboard error:', e);
    return [];
  }
};

function mapCloudProfileToScore(
  p: {
    user_id: string;
    username: string | null;
    avatar_url: string | null;
    xp: number | null;
    level: number | null;
    institution: string | null;
    longest_streak: number | null;
  },
  period: 'weekly' | 'monthly' | 'alltime',
  subjectFolder?: string,
  currentUserId?: string
): LeaderboardScore {
  const xp = Math.max(0, p.xp ?? 0);
  let totalScore = xp;

  if (currentUserId && p.user_id === currentUserId) {
    if (period === 'weekly') {
      totalScore = computeWeeklyCompositeScore(p.user_id).score;
    } else if (subjectFolder) {
      const local = computeSubjectStudyScore(p.user_id, subjectFolder);
      totalScore = local > 0 ? local : Math.round(xp * 0.15);
    } else {
      totalScore = computeGlobalStudyScore(p.user_id, xp);
    }
  } else if (subjectFolder) {
    const local = computeSubjectStudyScore(p.user_id, subjectFolder);
    totalScore = local > 0 ? local : Math.round(xp * 0.15);
  }

  return {
    user_id: p.user_id,
    username: p.username || 'User',
    avatar_url: p.avatar_url || null,
    level: p.level || 1,
    productivity_score: Math.round(totalScore * SCORE_WEIGHTS.productivity),
    consistency_score: Math.round(totalScore * SCORE_WEIGHTS.consistency),
    social_score: Math.round(totalScore * SCORE_WEIGHTS.social),
    total_score: totalScore,
    weekly_score: period === 'weekly' ? totalScore : 0,
    monthly_score: period === 'monthly' ? totalScore : 0,
    streak_count: p.longest_streak || 0,
    last_active: null,
    rank_movement: 'same',
    institution: p.institution || null,
    academic_tier: getAcademicTier(p.level || 1),
  };
}

// ─── Fetch Supabase leaderboard (cloud) — all public users ───────────────────
export const fetchCloudLeaderboard = async (
  period: 'weekly' | 'monthly' | 'alltime',
  scoreType: 'productivity' | 'consistency' | 'social' | 'total',
  limit = 50,
  offset = 0,
  subjectFolder?: string,
  currentUserId?: string
): Promise<LeaderboardScore[] | null> => {
  try {
    const { data, error } = await supabase
      .from('connect_profiles')
      .select('user_id, username, avatar_url, xp, level, institution, privacy_level, longest_streak')
      .neq('privacy_level', 'private')
      .neq('user_id', 'guest')
      .order('xp', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error || !data) {
      console.warn('[leaderboardEngine] cloud global fetch failed:', error?.message);
      return null;
    }

    const scored = data.map(p => mapCloudProfileToScore(p, period, subjectFolder, currentUserId));
    scored.sort((a, b) => b.total_score - a.total_score);
    return scored;
  } catch (e) {
    console.warn('[leaderboardEngine] cloud global fetch error:', e);
    return null;
  }
};

// ─── Fetch Friends leaderboard (connections only) ─────────────────────────────
export const fetchFriendsLeaderboardCloud = async (
  currentUserId: string,
  period: 'weekly' | 'monthly' | 'alltime',
  scoreType: 'productivity' | 'consistency' | 'social' | 'total',
  subjectFolder?: string
): Promise<LeaderboardScore[] | null> => {
  if (!currentUserId || currentUserId === 'guest') return [];

  try {
    const { data: friendships, error: fErr } = await supabase
      .from('connect_friendships')
      .select('user_id1, user_id2')
      .or(`user_id1.eq.${currentUserId},user_id2.eq.${currentUserId}`);

    if (fErr) {
      console.warn('[leaderboardEngine] cloud friendships fetch failed:', fErr.message);
      return null;
    }

    const friendIds = new Set<string>([currentUserId]);
    (friendships || []).forEach(row => {
      const other = row.user_id1 === currentUserId ? row.user_id2 : row.user_id1;
      if (other && other !== 'guest') friendIds.add(other);
    });

    const ids = Array.from(friendIds);
    const { data, error } = await supabase
      .from('connect_profiles')
      .select('user_id, username, avatar_url, xp, level, institution, privacy_level, longest_streak')
      .in('user_id', ids);

    if (error || !data) return null;

    const scored = data.map(p => mapCloudProfileToScore(p, period, subjectFolder, currentUserId));
    scored.sort((a, b) => b.total_score - a.total_score);
    return scored;
  } catch (e) {
    console.warn('[leaderboardEngine] cloud friends fetch error:', e);
    return null;
  }
};

export const fetchFriendsLeaderboard = (
  currentUserId: string,
  period: 'weekly' | 'monthly' | 'alltime',
  scoreType: 'productivity' | 'consistency' | 'social' | 'total',
  subjectFolder?: string
): LeaderboardScore[] => {
  try {
    ensureMockCompetitorsExist();

    const friendRows = db.getAllSync<{ friend_id: string }>(
      `SELECT CASE WHEN user_id1 = ? THEN user_id2 ELSE user_id1 END as friend_id 
       FROM connect_friendships WHERE user_id1 = ? OR user_id2 = ?`,
      [currentUserId, currentUserId, currentUserId]
    );
    const ids = [currentUserId, ...friendRows.map(r => r.friend_id)].filter(id => id && id !== 'guest');
    if (ids.length === 0) return [];

    const placeholders = ids.map(() => '?').join(',');
    const profiles = db.getAllSync<{
      user_id: string; username: string; avatar_url: string | null; xp: number; level: number; institution: string | null; privacy_level: string | null; longest_streak: number | null;
    }>(
      `SELECT user_id, username, avatar_url, xp, level, institution, privacy_level, longest_streak 
       FROM connect_profiles 
       WHERE user_id IN (${placeholders})`,
      ids
    );

    const scored: LeaderboardScore[] = profiles.map(p =>
      mapCloudProfileToScore(p, period, subjectFolder, currentUserId)
    );

    scored.sort((a, b) => b.total_score - a.total_score);
    return scored;
  } catch (e) {
    console.error('[leaderboardEngine] fetchFriendsLeaderboard error:', e);
    return [];
  }
};
