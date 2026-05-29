import { db } from '../db';
import { supabase } from './connectSupabase';

// ─── XP Action Values ─────────────────────────────────────────────────────────
export const XP_VALUES = {
  TASK_COMPLETED: 10,
  TASK_COMPLETED_ON_TIME: 15,
  HABIT_CHECKED_IN: 20,
  HABIT_STREAK_7_DAYS: 50,
  HABIT_STREAK_14_DAYS: 100,
  HABIT_STREAK_30_DAYS: 200,
  FOCUS_SESSION_COMPLETED: 25,
  FOCUS_SESSION_45_MIN: 40,
  ACHIEVEMENT_UNLOCKED: 30,
  DAILY_ALL_TASKS_DONE: 50,
  DAILY_ALL_HABITS_DONE: 50,
  NOTE_CREATED: 10,
  REVISION_SESSION_COMPLETED: 15,
  FLASHCARD_REVIEWED: 5,
  STUDY_STREAK_7_DAYS: 75,
};

// ─── Level System (Progression Formula) ───────────────────────────────────────
// Cumulative XP required to reach a specific level (1-indexed)
export const getXPRequiredForLevel = (level: number): number => {
  if (level <= 1) return 0;
  if (level === 2) return 100;
  if (level === 3) return 250;
  if (level === 4) return 500;
  if (level === 5) return 900;
  if (level === 6) return 1500;
  if (level === 7) return 2300;
  if (level === 8) return 3300;
  if (level === 9) return 4500;
  if (level === 10) return 6000;
  
  // Mid levels (11 to 25) scale moderately
  // High levels (26+) scale significantly harder
  let accum = 6000;
  for (let i = 11; i <= level; i++) {
    if (i <= 25) {
      accum += 2000 + (i - 10) * 300; // linear step
    } else {
      accum += 6500 + Math.pow(i - 25, 1.5) * 800; // steep exponential scaling
    }
  }
  return Math.round(accum);
};

export const getLevelFromXP = (xp: number): number => {
  let level = 1;
  while (getXPRequiredForLevel(level + 1) <= xp) {
    level++;
  }
  return level;
};

export const getXPForNextLevel = (currentLevel: number): number => {
  return getXPRequiredForLevel(currentLevel + 1);
};

export const getLevelTitle = (level: number): string => {
  const titles = [
    'Beginner', 'Focused', 'Consistent', 'Productive',
    'Achiever', 'Disciplined', 'Expert', 'Master',
    'Elite', 'Legend'
  ];
  return titles[Math.min(level - 1, titles.length - 1)] || 'Legend';
};

// ─── Event Emitters ───────────────────────────────────────────────────────────
export type ConnectEvent = 
  | { type: 'LEVEL_UP'; level: number; title: string }
  | { type: 'ACHIEVEMENT_UNLOCKED'; achievement: any }
  | { type: 'XP_EARNED'; amount: number; reason: string }
  | { type: 'XP_UPDATED'; xp: number; level: number };

type Listener = (event: ConnectEvent) => void;
const listeners: Listener[] = [];

export const subscribeToConnectEvents = (listener: Listener) => {
  listeners.push(listener);
  return () => {
    const idx = listeners.indexOf(listener);
    if (idx > -1) listeners.splice(idx, 1);
  };
};

export const emitConnectEvent = (event: ConnectEvent) => {
  listeners.forEach(l => l(event));
};

// ─── Category Classifier for Anti-Abuse ──────────────────────────────────────
export const getCategoryFromReason = (reason: string): 'productivity' | 'consistency' | 'social' | 'achievement' => {
  const r = reason.toLowerCase();
  if (r.includes('achievement')) return 'achievement';
  if (r.includes('task') || r.includes('focus') || r.includes('goal')) return 'productivity';
  if (r.includes('habit') || r.includes('streak') || r.includes('consistency') || r.includes('discipline')) return 'consistency';
  if (r.includes('follow') || r.includes('friend') || r.includes('squad') || r.includes('connection')) return 'social';
  return 'productivity';
};

// ─── Central XP Awarding & Anti-Abuse Manager ───────────────────────────────
export const addXP = async (userId: string, amount: number, reason: string) => {
  if (!userId) return;
  const isGuest = userId === 'guest';
  
  try {
    const now = new Date().toISOString();
    const today = now.substring(0, 10);
    const category = getCategoryFromReason(reason);

    // 1. Cooldown Protection
    // Discard identical actions received within 3 seconds to prevent rapid double-taps/exploits
    const lastLog = db.getFirstSync<{ created_at: string }>(
      'SELECT created_at FROM connect_xp_log WHERE user_id = ? AND reason = ? ORDER BY created_at DESC LIMIT 1',
      [userId, reason]
    );
    if (lastLog) {
      const diffMs = Date.now() - new Date(lastLog.created_at).getTime();
      if (diffMs < 3000) {
        console.log('[XP Anti-Abuse] Cooldown active. Discarded repetitive action:', reason);
        return;
      }
    }

    // 2. Anomaly Detection (XP Velocity Spike Control)
    // Capping massive single points spikes
    if (amount > 300) {
      console.warn('[XP Anomaly Detection] Single award exceeded threshold. Capped:', amount);
      amount = 300;
    }
    // Capping cumulative velocity (max 400 XP within any 1 minute interval)
    const recentXp = db.getFirstSync<{ total: number }>(
      "SELECT SUM(xp_amount) as total FROM connect_xp_log WHERE user_id = ? AND datetime(created_at) >= datetime('now', '-1 minute')",
      [userId]
    )?.total || 0;
    if (recentXp + amount > 400) {
      console.warn('[XP Anomaly Detection] High XP velocity detected. Discarding award.');
      return;
    }

    // Retrieve today's category log totals
    const logsToday = db.getAllSync<{ xp_amount: number; reason: string }>(
      "SELECT xp_amount, reason FROM connect_xp_log WHERE user_id = ? AND SUBSTR(created_at, 1, 10) = ?",
      [userId, today]
    );

    // 3. Diminishing Returns for Repeated Daily Actions
    if (reason === 'Task completed') {
      const tasksDoneToday = logsToday.filter(log => log.reason === 'Task completed').length;
      if (tasksDoneToday >= 5) {
        // Diminish points by 50% for completing more than 5 tasks on the same day
        amount = Math.max(1, Math.round(amount * 0.5));
        console.log('[XP Anti-Abuse] Diminishing returns applied. Reduced task XP.');
      }
    }

    // 4. Category-specific Daily Caps
    let categorySum = 0;
    for (const log of logsToday) {
      if (getCategoryFromReason(log.reason) === category) {
        categorySum += log.xp_amount;
      }
    }

    const cap = 
      category === 'productivity' ? 200
      : category === 'consistency' ? 80
      : category === 'social' ? 50
      : 500; // Achievements limit

    if (categorySum >= cap) {
      console.log(`[XP Anti-Abuse] Category cap of ${cap} XP reached today for: ${category}`);
      return;
    }

    if (categorySum + amount > cap) {
      amount = cap - categorySum; // Fit remaining points within cap limit
    }

    if (amount <= 0) return;

    // Retrieve profile details
    let profile = db.getFirstSync<any>('SELECT xp, level FROM connect_profiles WHERE user_id = ?', [userId]);
    if (!profile) {
      // Dynamically initialize profile record in SQLite & Supabase if not exists
      const { useAuthStore } = require('../../store/useAuthStore');
      const authState = useAuthStore.getState();
      const authProfile = authState.profile;
      const session = authState.session;

      const id = Math.random().toString(36).substring(7);
      const username = isGuest
        ? 'Guest'
        : authProfile?.username || session?.user?.user_metadata?.username || session?.user?.email?.split('@')[0] || ('user_' + Math.floor(Math.random()*10000));
      const bio = isGuest ? 'Exploring Groundwork as a guest.' : (authProfile?.bio || 'On a mission to stay productive.');
      const avatarUrl = authProfile?.avatar_url || null;

      db.runSync(
        'INSERT INTO connect_profiles (id, user_id, username, bio, avatar_url, xp, level, productivity_category, joined_at, updated_at) VALUES (?, ?, ?, ?, ?, 0, 1, ?, ?, ?)',
        [id, userId, username, bio, avatarUrl, 'General', now, now]
      );
      
      // Async mirror to Supabase Cloud (signed-in users only)
      if (!isGuest) {
        supabase.from('connect_profiles').upsert({
          id,
          user_id: userId,
          username,
          bio,
          avatar_url: avatarUrl,
          xp: 0,
          level: 1,
          productivity_category: 'General',
          joined_at: now,
          updated_at: now
        }, { onConflict: 'user_id' }).then(({ error }) => {
          if (error) console.error('[addXP] Supabase profile dynamic create error:', error);
        });
      }

      profile = { xp: 0, level: 1 };
    }
    
    const newXp = profile.xp + amount;
    const newLevel = getLevelFromXP(newXp);
    
    db.runSync(
      'UPDATE connect_profiles SET xp = ?, level = ?, updated_at = ? WHERE user_id = ?',
      [newXp, newLevel, now, userId]
    );
    
    const logId = Math.random().toString(36).substring(7);
    db.runSync(
      'INSERT INTO connect_xp_log (id, user_id, xp_amount, reason, created_at) VALUES (?, ?, ?, ?, ?)',
      [logId, userId, amount, reason, now]
    );
    
    if (newLevel > profile.level) {
      emitConnectEvent({ type: 'LEVEL_UP', level: newLevel, title: getLevelTitle(newLevel) });
    }
    
    emitConnectEvent({ type: 'XP_UPDATED', xp: newXp, level: newLevel });
    if (!reason.toLowerCase().includes('achievement')) {
      emitConnectEvent({ type: 'XP_EARNED', amount, reason });
    }
    
    // Asynchronously verify achievements trigger
    if (!reason.toLowerCase().includes('achievement')) {
      import('./achievementEngine').then(({ checkAchievements }) => {
        checkAchievements(userId);
      });
    }

    // Mirror to Supabase Cloud (signed-in users only)
    const fullProfile = db.getFirstSync<any>('SELECT * FROM connect_profiles WHERE user_id = ?', [userId]);
    if (fullProfile && !isGuest) {
      supabase.from('connect_profiles').upsert({
        id: fullProfile.id,
        user_id: userId,
        username: fullProfile.username,
        bio: fullProfile.bio || 'On a mission to stay productive.',
        avatar_url: fullProfile.avatar_url,
        xp: newXp,
        level: newLevel,
        productivity_category: fullProfile.productivity_category || 'General',
        joined_at: fullProfile.joined_at,
        updated_at: now
      }, { onConflict: 'user_id' }).then(({ error }) => {
        if (error) console.error('[addXP] Supabase profile upsert error:', error);
      });
    }
    
    if (!isGuest) {
      supabase.from('connect_xp_log').insert({
        id: logId,
        user_id: userId,
        xp_amount: amount,
        reason,
        created_at: now
      }).then(({ error }) => {
        if (error) console.error('[addXP] Supabase log insert error:', error);
      });
    }

  } catch (e) {
    console.error('[addXP] Error:', e);
  }
};
