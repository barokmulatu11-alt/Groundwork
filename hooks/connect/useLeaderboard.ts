import { useState, useCallback, useRef } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import {
  LeaderboardScore,
  fetchLocalLeaderboard,
  fetchCloudLeaderboard,
  fetchFriendsLeaderboard,
  fetchFriendsLeaderboardCloud,
  computeWeeklyCompositeScore,
  computeGlobalStudyScore,
  computeSubjectStudyScore,
  getAcademicTier,
  getWeeklyResetCountdown,
  ensureMockCompetitorsExist
} from '@/lib/connect/leaderboardEngine';
import { db } from '@/lib/db';
import { getLevelTitle } from '@/lib/connect/xpSystem';

export type { LeaderboardScore };

export type LeaderboardPeriod = 'weekly' | 'monthly' | 'alltime';
export type LeaderboardScoreType = 'productivity' | 'consistency' | 'social' | 'total';
export type LeaderboardView = 'weekly' | 'global' | 'subjects' | 'connections';

export interface RankedEntry extends LeaderboardScore {
  rank: number;
  levelTitle: string;
  isCurrentUser: boolean;
  displayScore: number;
}

const PAGE_SIZE = 25;

// Cache to prevent rapid recalculations
const _cache = new Map<string, { data: RankedEntry[]; ts: number }>();
const CACHE_TTL = 30_000; // 30 seconds for dynamic stats

const cacheKey = (
  view: LeaderboardView,
  period: LeaderboardPeriod,
  scoreType: LeaderboardScoreType,
  subjectFolder?: string
) => `${view}:${period}:${scoreType}:${subjectFolder || ''}`;

export const useLeaderboard = (
  view: LeaderboardView,
  period: LeaderboardPeriod,
  scoreType: LeaderboardScoreType,
  subjectFolder?: string
) => {
  const { session, isGuest, profile: authProfile } = useAuthStore();
  const currentUserId = session?.user?.id || (isGuest ? 'guest' : 'guest');

  const [entries, setEntries] = useState<RankedEntry[]>([]);
  const [myEntry, setMyEntry] = useState<RankedEntry | null>(null);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const abortRef = useRef(false);

  const ensureMyProfileExists = useCallback(() => {
    if (!currentUserId || currentUserId === 'guest') return;
    try {
      const exists = db.getFirstSync('SELECT id FROM connect_profiles WHERE user_id = ?', [currentUserId]);
      if (!exists) {
        const id = Math.random().toString(36).substring(7);
        const now = new Date().toISOString();
        const username = authProfile?.username || session?.user?.user_metadata?.username || session?.user?.email?.split('@')[0] || ('user_' + Math.floor(Math.random()*10000));
        const bio = authProfile?.bio || 'On a mission to stay productive.';
        const avatarUrl = authProfile?.avatar_url || null;

        db.runSync(
          'INSERT INTO connect_profiles (id, user_id, username, bio, avatar_url, xp, level, productivity_category, joined_at, updated_at, privacy_level) VALUES (?, ?, ?, ?, ?, 0, 1, ?, ?, ?, ?)',
          [id, currentUserId, username, bio, avatarUrl, 'General', now, now, 'public']
        );
      }
    } catch (e) {
      console.warn('[useLeaderboard] failed to ensure profile exists:', e);
    }
  }, [currentUserId, authProfile, session]);

  const buildRanked = (scores: LeaderboardScore[]): RankedEntry[] =>
    scores.map((s, i) => {
      return {
        ...s,
        rank: i + 1,
        levelTitle: getLevelTitle(s.level),
        isCurrentUser: s.user_id === currentUserId,
        displayScore: s.total_score,
      };
    });

  const fetchMyEntry = useCallback((): RankedEntry => {
    const profile = db.getFirstSync<{ username: string; avatar_url: string | null; level: number; xp: number; institution: string | null; privacy_level: string | null }>(
      'SELECT username, avatar_url, level, xp, institution, privacy_level FROM connect_profiles WHERE user_id = ?',
      [currentUserId]
    );

    let totalScore = 0;
    let weeklyDetails: any = undefined;

    if (view === 'weekly' || period === 'weekly') {
      const weeklyVal = computeWeeklyCompositeScore(currentUserId);
      totalScore = weeklyVal.score;
      weeklyDetails = {
        studyHours: weeklyVal.studyHours,
        notesCreated: weeklyVal.notesCreated,
        revisionsCount: weeklyVal.revisionsCount,
        taskCompletionRate: weeklyVal.taskCompletionRate,
        activeDays: weeklyVal.activeDaysCount
      };
    } else if (view === 'subjects' && subjectFolder) {
      totalScore = computeSubjectStudyScore(currentUserId, subjectFolder);
    } else {
      totalScore = computeGlobalStudyScore(currentUserId, profile?.xp || 0);
    }

    const streakRow = db.getFirstSync<{ best_streak: number; current_max: number }>(
      'SELECT MAX(best_streak) as best_streak, MAX(streak) as current_max FROM habits WHERE user_id = ? AND deleted_at IS NULL',
      [currentUserId]
    );

    const level = profile?.level || 1;

    return {
      user_id: currentUserId,
      username: profile?.username || 'You',
      avatar_url: profile?.avatar_url || null,
      level: level,
      levelTitle: getLevelTitle(level),
      productivity_score: Math.round(totalScore * 0.6),
      consistency_score: Math.round(totalScore * 0.3),
      social_score: Math.round(totalScore * 0.1),
      total_score: totalScore,
      weekly_score: (view === 'weekly' || period === 'weekly') ? totalScore : 0,
      monthly_score: period === 'monthly' ? totalScore : 0,
      streak_count: streakRow?.current_max || streakRow?.best_streak || 0,
      last_active: null,
      rank_movement: 'same',
      rank: 1,
      isCurrentUser: true,
      displayScore: totalScore,
      institution: profile?.institution || null,
      academic_tier: getAcademicTier(level),
      weekly_details: weeklyDetails
    };
  }, [currentUserId, view, period, subjectFolder]);

  const fetch = useCallback(async (loadMore = false) => {
    ensureMyProfileExists();
    ensureMockCompetitorsExist();

    const key = cacheKey(view, period, scoreType, subjectFolder);
    const cached = _cache.get(key);

    if (!loadMore && cached && Date.now() - cached.ts < CACHE_TTL) {
      setEntries(cached.data);
      const me = cached.data.find(e => e.isCurrentUser) || fetchMyEntry();
      // Ensure exact rank is computed on complete list
      if (me && !cached.data.find(e => e.isCurrentUser)) {
        me.rank = cached.data.findIndex(e => e.total_score < me!.total_score) + 1;
        if (me.rank <= 0) me.rank = cached.data.length + 1;
      }
      setMyEntry(me);
      setLoading(false);
      return;
    }

    abortRef.current = false;
    if (!loadMore) setLoading(true);
    setError(null);

    try {
      const offset = loadMore ? page * PAGE_SIZE : 0;
      let rawScores: LeaderboardScore[] = [];

      if (view === 'connections') {
        const cloudFriends = await fetchFriendsLeaderboardCloud(
          currentUserId, period, scoreType, subjectFolder
        );
        rawScores = cloudFriends ?? fetchFriendsLeaderboard(
          currentUserId, period, scoreType, subjectFolder
        );
      } else {
        const cloud = await fetchCloudLeaderboard(
          period, scoreType, PAGE_SIZE, offset, subjectFolder, currentUserId
        );
        rawScores = cloud ?? fetchLocalLeaderboard(period, scoreType, PAGE_SIZE, offset, subjectFolder);
      }

      if (abortRef.current) return;

      const ranked = buildRanked(rawScores);

      // Recalculate ranks if current user is inside lists
      let finalEntries = ranked;
      if (loadMore) {
        setEntries(prev => {
          const combined = [...prev, ...ranked.map(r => ({ ...r, rank: prev.length + r.rank }))];
          finalEntries = combined;
          return combined;
        });
        setPage(p => p + 1);
      } else {
        setEntries(ranked);
        setPage(1);
        _cache.set(key, { data: ranked, ts: Date.now() });
      }

      setHasMore(rawScores.length === PAGE_SIZE);

      // Compute user ranking entry
      let me = currentUserId === 'guest' ? null : (finalEntries.find(e => e.isCurrentUser) ?? fetchMyEntry());
      if (me && !finalEntries.find(e => e.isCurrentUser)) {
        const higherIndex = finalEntries.findIndex(e => e.total_score < me!.total_score);
        me.rank = higherIndex >= 0 ? higherIndex + 1 : finalEntries.length + 1;
      }
      setMyEntry(me);
    } catch (e) {
      console.error('[useLeaderboard] error:', e);
      try {
        const local = view === 'connections'
          ? fetchFriendsLeaderboard(currentUserId, period, scoreType, subjectFolder)
          : fetchLocalLeaderboard(period, scoreType, PAGE_SIZE, 0, subjectFolder);
        const ranked = buildRanked(local);
        setEntries(ranked);
        let me = currentUserId === 'guest' ? null : (ranked.find(e => e.isCurrentUser) ?? fetchMyEntry());
        if (me && !ranked.find(e => e.isCurrentUser)) {
          const idx = ranked.findIndex(e => e.total_score < me!.total_score);
          me.rank = idx >= 0 ? idx + 1 : ranked.length + 1;
        }
        setMyEntry(me);
      } catch (_) {
        setError('Could not load leaderboard. Pull to retry.');
      }
    } finally {
      if (!abortRef.current) setLoading(false);
    }
  }, [view, period, scoreType, currentUserId, page, subjectFolder, fetchMyEntry, ensureMyProfileExists]);

  const refresh = useCallback(() => {
    abortRef.current = false;
    const key = cacheKey(view, period, scoreType, subjectFolder);
    _cache.delete(key);
    fetch(false);
  }, [fetch, view, period, scoreType, subjectFolder]);

  const loadMore = useCallback(() => {
    if (!loading && hasMore && view !== 'connections') {
      fetch(true);
    }
  }, [loading, hasMore, fetch, view]);

  return {
    entries,
    topThree: entries.slice(0, 3),
    rest: entries.slice(3),
    myEntry,
    loading,
    hasMore,
    error,
    countdown: getWeeklyResetCountdown(),
    fetch,
    refresh,
    loadMore,
  };
};
