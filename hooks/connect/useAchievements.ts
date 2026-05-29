import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { db } from '@/lib/db';
import { ACHIEVEMENTS, getUserStats, checkAchievements } from '@/lib/connect/achievementEngine';
import { subscribeToConnectEvents } from '@/lib/connect/xpSystem';

export interface AchievementItem {
  key: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  xpReward: number;
  unlocked: boolean;
  unlockedAt?: string;
  progress: number;
  category: string;
  secret?: boolean;
}

export const useAchievements = () => {
  const { session, isGuest } = useAuthStore();
  const userId = session?.user?.id || (isGuest ? 'guest' : 'guest');

  const [items, setItems] = useState<AchievementItem[]>([]);
  const [unlockedCount, setUnlockedCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const buildItems = (unlockedMap: Map<string, string>, stats: ReturnType<typeof getUserStats>): AchievementItem[] => {
    return ACHIEVEMENTS.map(a => {
      const isUnl = unlockedMap.has(a.key);
      let prog = 0;

      if (isUnl) {
        prog = 100;
      } else {
        // --- Notes Category ---
        if (a.key === 'first_note') prog = (stats.totalNotesCreated / 1) * 100;
        else if (a.key === 'note_taker') prog = (stats.totalNotesCreated / 5) * 100;
        else if (a.key === 'notes_10') prog = (stats.totalNotesCreated / 10) * 100;
        else if (a.key === 'notes_50') prog = (stats.totalNotesCreated / 50) * 100;
        else if (a.key === 'notes_100') prog = (stats.totalNotesCreated / 100) * 100;
        else if (a.key === 'notes_500') prog = (stats.totalNotesCreated / 500) * 100;
        else if (a.key === 'organized_mind') prog = (stats.uniqueFoldersCount / 3) * 100;
        else if (a.key === 'clean_starter') prog = (stats.totalNotesCreated / 1) * 100;
        else if (a.key === 'speed_writer') prog = (stats.totalNotesCreated / 1) * 100;
        else if (a.key === 'multi_note_day') prog = (stats.totalNotesCreated / 3) * 100;
        else if (a.key === 'idea_capture') prog = (stats.totalNotesCreated / 1) * 100;
        else if (a.key === 'lecture_converter') prog = (stats.notesWithAudio / 1) * 100;
        else if (a.key === 'file_importer') prog = (stats.notesWithImages > 0 || stats.notesWithDrawings > 0) ? 100 : 0;

        // --- Study Category ---
        else if (a.key === 'revision_beginner') prog = (stats.mediumRevisionScoreCount / 1) * 100;
        else if (a.key === 'revision_expert') prog = (stats.highRevisionScoreCount / 1) * 100;
        else if (a.key === 'revision_master') prog = (stats.highRevisionScoreCount / 5) * 100;
        else if (a.key === 'first_revision') prog = stats.highestRevisionScore > 0 ? 100 : 0;
        else if (a.key === 'revision_5') prog = (stats.mediumRevisionScoreCount / 5) * 100;
        else if (a.key === 'revision_20') prog = (stats.mediumRevisionScoreCount / 20) * 100;
        else if (a.key === 'active_recall') prog = (stats.activeRecallNotesCount / 1) * 100;
        else if (a.key === 'memory_builder') prog = ((stats.averageRevisionScore >= 50 ? 50 : (stats.averageRevisionScore / 50) * 50) + (stats.totalNotesCreated >= 5 ? 50 : (stats.totalNotesCreated / 5) * 50));
        else if (a.key === 'spaced_rep_starter') prog = stats.highestRevisionScore > 0 ? 100 : 0;
        else if (a.key === 'spaced_rep_master') prog = (stats.highRevisionScoreCount / 3) * 100;
        else if (a.key === 'focus_session_done') prog = (stats.totalFocusSessions / 1) * 100;
        else if (a.key === 'study_marathon') prog = (stats.totalFocusMinutes / 120) * 100;
        else if (a.key === 'deep_work_init') prog = (stats.totalFocusMinutes / 45) * 100;

        // --- Consistency Category ---
        else if (a.key === 'streak_1') prog = (stats.longestStreak / 1) * 100;
        else if (a.key === 'streak_7') prog = (stats.longestStreak / 7) * 100;
        else if (a.key === 'streak_30') prog = (stats.longestStreak / 30) * 100;
        else if (a.key === 'consistency_builder') prog = (stats.longestStreak / 5) * 100;
        else if (a.key === 'habit_formed') prog = (stats.longestStreak / 10) * 100;
        else if (a.key === 'discipline_engine') prog = (stats.longestStreak / 15) * 100;
        else if (a.key === 'daily_checkin') prog = (stats.longestStreak / 1) * 100;
        else if (a.key === 'early_bird') prog = stats.recentEarlyBirdSession ? 100 : 0;
        else if (a.key === 'midnight_worker') prog = stats.recentLateNightSession ? 100 : 0;
        else if (a.key === 'no_missed_day') prog = (stats.longestStreak / 30) * 100;
        else if (a.key === 'comeback_king') prog = (stats.longestStreak / 2) * 100;

        // --- Productivity Category ---
        else if (a.key === 'prod_activated') prog = (stats.totalTasksCompleted / 1) * 100;
        else if (a.key === 'top_priorities') prog = (stats.totalTasksCompleted / 3) * 100;
        else if (a.key === 'perfect_workspace') prog = (stats.uniqueFoldersCount / 4) * 100;
        else if (a.key === 'color_coder') prog = (stats.uniqueTagsCount / 3) * 100;
        else if (a.key === 'smart_organizer') prog = ((stats.uniqueFoldersCount >= 2 ? 50 : (stats.uniqueFoldersCount / 2) * 50) + (stats.uniqueTagsCount >= 2 ? 50 : (stats.uniqueTagsCount / 2) * 50));
        else if (a.key === 'task_crusher') prog = (stats.totalTasksCompleted / 5) * 100;
        else if (a.key === 'deadline_manager') prog = (stats.totalTasksCompleted / 10) * 100;
        else if (a.key === 'assignment_done') prog = (stats.totalTasksCompleted / 20) * 100;
        else if (a.key === 'clean_dashboard') prog = stats.hadPerfectDay ? 100 : 0;
        else if (a.key === 'focus_setup') prog = (stats.totalFocusSessions / 3) * 100;

        // --- Academic Mastery (mapped under 'leaderboard' category in engine) ---
        else if (a.key === 'formula_collector') prog = (stats.totalFormulasCount / 1) * 100;
        else if (a.key === 'formula_master') prog = (stats.totalFormulasCount / 5) * 100;
        else if (a.key === 'subject_specialist') prog = (stats.uniqueFoldersCount / 3) * 100;
        else if (a.key === 'multi_subject') prog = (stats.uniqueFoldersCount / 5) * 100;
        else if (a.key === 'chapter_finisher') prog = (stats.totalNotesCreated / 15) * 100;
        else if (a.key === 'semester_survivor') prog = (stats.totalStudyHours / 24) * 100;
        else if (a.key === 'finals_warrior') prog = (stats.totalFocusMinutes / 300) * 100;
        else if (a.key === 'top_performer') prog = (stats.averageRevisionScore / 75) * 100;
        else if (a.key === 'excellence_achieved') prog = (stats.highRevisionScoreCount / 3) * 100;

        // --- Social / Connect Category ---
        else if (a.key === 'first_connection') prog = (stats.followingCount / 1) * 100;
        else if (a.key === 'network_builder') prog = (stats.followingCount / 5) * 100;
        else if (a.key === 'inner_circle') prog = (stats.followingCount / 10) * 100;
        else if (a.key === 'community_growth') prog = (stats.followersCount / 3) * 100;
        else if (a.key === 'well_connected') prog = (stats.followersCount / 10) * 100;
        else if (a.key === 'community_member') prog = ((stats.level >= 2 ? 50 : (stats.level / 2) * 50) + (stats.hasBio ? 50 : 0));
        else if (a.key === 'profile_completed') prog = ((stats.hasAvatar ? 50 : 0) + (stats.hasBio ? 50 : 0));
        else if (a.key === 'active_contributor') prog = (stats.level / 5) * 100;
        else if (a.key === 'motivator') prog = (stats.followersCount / 1) * 100;
        else if (a.key === 'inspiration_shared') prog = stats.hasBio ? 100 : 0;
        else if (a.key === 'study_partner') prog = (stats.friendshipsCount / 1) * 100;
        else if (a.key === 'group_learner') prog = (stats.friendshipsCount / 3) * 100;
        else if (a.key === 'collaborative_thinker') prog = (stats.followingCount / 3) * 100;
        else if (a.key === 'knowledge_sharer') prog = stats.hasSocialLink ? 100 : 0;
        else if (a.key === 'fully_customized') prog = ((stats.hasAvatar ? 50 : 0) + (stats.hasBio ? 50 : 0));

        // --- Special / Hidden Category ---
        else if (a.key === 'three_am_survivor') prog = stats.recentThreeAmSurvivor ? 100 : 0;
        else if (a.key === 'offline_warrior') prog = (stats.totalNotesCreated / 5) * 100;
        else if (a.key === 'no_distractions') prog = (stats.totalFocusMinutes / 30) * 100;
        else if (a.key === 'the_return') prog = (stats.longestStreak / 2) * 100;
        else if (a.key === 'burnout_recovery_secret') prog = (stats.totalFocusSessions / 5) * 100;
        else if (a.key === 'the_perfectionist') prog = (stats.highestRevisionScore / 100) * 100;
        else if (a.key === 'silent_grinder') prog = (stats.totalFocusSessions / 10) * 100;
        else if (a.key === 'touch_grass') prog = (stats.totalFocusMinutes / 240) * 100;
        else if (a.key === 'one_more_chapter') prog = stats.recentLateNightSession ? 100 : 0;
        else if (a.key === 'locked_in') prog = (stats.totalFocusMinutes / 60) * 100;
        else if (a.key === 'hidden_achievement') prog = ((stats.hadPerfectDay ? 50 : 0) + (stats.longestStreak >= 5 ? 50 : 0));

        // --- Legacy / Special Fields ---
        else if (a.key === 'rising_competitor') prog = (stats.xp / 50) * 100;
        else if (a.key === 'top_100') prog = (stats.xp / 150) * 100;
        else if (a.key === 'top_50') prog = (stats.xp / 300) * 100;
        else if (a.key === 'top_10') prog = (stats.xp / 500) * 100;
        else if (a.key === 'champion') prog = (stats.level / 10) * 100;
        else if (a.key === 'identity_created') prog = stats.hasBio ? 100 : 0;
        else if (a.key === 'social_ready') prog = stats.hasSocialLink ? 100 : 0;
        else if (a.key === 'early_supporter') prog = (stats.level / 3) * 100;
        else if (a.key === 'pioneer') prog = (stats.xp / 1000) * 100;
        else if (a.key === 'founding_member') prog = (stats.level / 1) * 100;

        // --- Pro Category ---
        else if (a.key === 'pro_activated') prog = stats.isPro ? 100 : 0;
        else if (a.key === 'premium_access_granted') prog = stats.isPro ? 100 : 0;
        else if (a.key === 'pro_explorer') prog = stats.isPro ? 100 : 0;
        else if (a.key === 'advanced_focus') prog = stats.isPro ? (stats.totalFocusMinutes / 120) * 100 : 0;
        else if (a.key === 'elite_workflow') prog = stats.isPro ? (stats.totalTasksCompleted / 20) * 100 : 0;
        else if (a.key === 'performance_boost') prog = stats.isPro ? (stats.totalTasksCompleted / 40) * 100 : 0;
        else if (a.key === 'pro_streak_starter') prog = stats.isPro ? (stats.longestStreak / 7) * 100 : 0;
        else if (a.key === 'premium_discipline') prog = stats.isPro ? (stats.longestStreak / 21) * 100 : 0;
        else if (a.key === 'elite_consistency') prog = stats.isPro ? (stats.longestStreak / 45) * 100 : 0;
        else if (a.key === 'feature_master') prog = stats.isPro ? 100 : 0;
        else if (a.key === 'system_optimizer') prog = stats.isPro ? 100 : 0;
        else if (a.key === 'advanced_user') prog = stats.isPro ? 100 : 0;
        else if (a.key === 'loyal_pro_user') prog = stats.isPro ? 100 : 0;
        else if (a.key === 'dedicated_member') prog = stats.isPro ? 100 : 0;
        else if (a.key === 'groundwork_pro_veteran') prog = stats.isPro ? 100 : 0;
      }

      return {
        key: a.key,
        name: a.name,
        description: a.description,
        icon: a.icon,
        color: a.color,
        xpReward: a.xpReward,
        unlocked: isUnl,
        unlockedAt: unlockedMap.get(a.key),
        progress: Math.min(100, Math.max(0, Math.round(prog))),
        category: a.category,
        secret: a.secret,
      };
    });
  };

  const EMPTY_STATS: ReturnType<typeof getUserStats> = {
    totalTasksCompleted: 0,
    longestStreak: 0,
    totalFocusSessions: 0,
    totalFocusMinutes: 0,
    hadPerfectDay: false,
    level: 1,
    followersCount: 0,
    followingCount: 0,
    hasBio: false,
    hasSocialLink: false,
    hasAvatar: false,
    xp: 0,
    isPro: false,

    // Extended Note Metrics
    totalNotesCreated: 0,
    notesWithDrawings: 0,
    notesWithAudio: 0,
    notesWithImages: 0,
    notesWithFlashcards: 0,
    notesWithFormulas: 0,
    uniqueFoldersCount: 0,
    uniqueTagsCount: 0,
    totalStudyHours: 0,
    totalFlashcardsCount: 0,
    totalFormulasCount: 0,

    // Extended Revision Metrics
    highestRevisionScore: 0,
    averageRevisionScore: 0,
    highRevisionScoreCount: 0,
    mediumRevisionScoreCount: 0,
    activeRecallNotesCount: 0,

    // Time-based Metrics
    recentLateNightSession: false,
    recentEarlyBirdSession: false,
    recentThreeAmSurvivor: false,

    // Habit/Social Counts
    habitCheckinsCount: 0,
    friendshipsCount: 0,
  };

  const fetchAchievements = async () => {
    setLoading(true);

    let unlockedMap = new Map<string, string>();
    let stats = EMPTY_STATS;

    // Layered fetching — each step is independently safe
    if (userId && userId !== 'guest') {
      try { await checkAchievements(userId); } catch (_) {}
      try { stats = getUserStats(userId); } catch (_) {}
      try {
        const rows = db.getAllSync<{ achievement_key: string; unlocked_at: string }>(
          'SELECT achievement_key, unlocked_at FROM connect_achievements WHERE user_id = ?',
          [userId]
        );
        rows.forEach(r => unlockedMap.set(r.achievement_key, r.unlocked_at));
      } catch (_) {}
    }

    // Always produce a full list — never empty
    const enriched = buildItems(unlockedMap, stats);
    setItems(enriched);
    setUnlockedCount(enriched.filter(i => i.unlocked).length);
    setLoading(false);
  };

  useEffect(() => {
    fetchAchievements();
    const unsubscribe = subscribeToConnectEvents((event) => {
      if (event.type === 'XP_UPDATED' || event.type === 'LEVEL_UP' || event.type === 'ACHIEVEMENT_UNLOCKED') {
        fetchAchievements();
      }
    });
    return unsubscribe;
  }, [userId]);

  return {
    items,
    unlockedCount,
    totalCount: ACHIEVEMENTS.length,
    loading,
    refresh: fetchAchievements,
  };
};
