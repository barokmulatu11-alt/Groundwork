/**
 * AnalyticsTracker - Global Event Logging System for Groundwork
 *
 * This is the single source of truth for all user actions.
 * Every significant user interaction emits a structured event
 * that feeds into the analytics pipeline.
 *
 * Architecture:
 * 1. Event Emission - Structured events with userId, timestamp, type, metadata
 * 2. Raw Events Store - Append-only log of all events
 * 3. Event Listeners - Real-time subscribers for immediate reactions
 * 4. Async Processing - Background aggregation for analytics
 */

import { db } from "@/lib/db";
import { neonData as supabase } from "@/lib/neon";
import { useAuthStore } from "@/store/useAuthStore";

// ─── Event Type Definitions ─────────────────────────────────────────────────────

export type EventType =
  // Task Events
  | "task_created"
  | "task_completed"
  | "task_deleted"
  | "task_updated"
  // Habit Events
  | "habit_created"
  | "habit_completed"
  | "habit_streak_extended"
  | "habit_deleted"
  | "habit_updated"
  // Note Events
  | "note_created"
  | "note_updated"
  | "note_deleted"
  | "note_viewed"
  | "note_revision_session"
  // Focus Events
  | "focus_session_started"
  | "focus_session_ended"
  | "focus_session_interrupted"
  // XP Events
  | "xp_earned"
  | "level_up"
  // Auth Events
  | "login"
  | "logout"
  | "signup"
  // App Events
  | "app_opened"
  | "app_closed"
  | "screen_view"
  // Subscription Events
  | "paywall_view"
  | "subscription_started"
  | "subscription_ended";

// ─── Event Structure ────────────────────────────────────────────────────────────

export interface AnalyticsEvent {
  id: string;
  eventType: EventType;
  userId: string;
  timestamp: string;
  timestampMs: number;
  metadata: Record<string, any>;
  processed: boolean;
}

// ─── Event Listeners ────────────────────────────────────────────────────────────

type EventListener = (event: AnalyticsEvent) => void;
const listeners: EventListener[] = [];

export const subscribeToAnalyticsEvents = (listener: EventListener) => {
  listeners.push(listener);
  return () => {
    const idx = listeners.indexOf(listener);
    if (idx > -1) listeners.splice(idx, 1);
  };
};

const emitToListeners = (event: AnalyticsEvent) => {
  listeners.forEach((l) => {
    try {
      l(event);
    } catch (e) {
      console.error("[AnalyticsTracker] Listener error:", e);
    }
  });
};

// ─── Core Event Tracking ────────────────────────────────────────────────────────

/**
 * Get the current user ID for event tracking
 */
const getUserId = (): string => {
  const { session, isGuest } = useAuthStore.getState();
  if (session?.user?.id) return session.user.id;
  if (isGuest) return "guest";
  return "guest";
};

/**
 * Generate a unique event ID
 */
const generateEventId = (): string => {
  return `evt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
};

/**
 * Store event locally in SQLite (append-only)
 */
const storeEventLocal = (event: AnalyticsEvent): void => {
  try {
    db.runSync(
      `INSERT OR REPLACE INTO analytics_events 
       (id, event_type, user_id, timestamp, timestamp_ms, metadata, processed) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        event.id,
        event.eventType,
        event.userId,
        event.timestamp,
        event.timestampMs,
        JSON.stringify(event.metadata),
        event.processed ? 1 : 0,
      ],
    );
  } catch (e) {
    console.error("[AnalyticsTracker] Failed to store event locally:", e);
  }
};

/**
 * Sync event to Supabase (async, fire-and-forget)
 */
const syncEventCloud = (event: AnalyticsEvent): void => {
  const { isGuest } = useAuthStore.getState();
  if (isGuest) return; // Don't sync guest events

  supabase
    .from("analytics_events")
    .insert({
      id: event.id,
      event_type: event.eventType,
      user_id: event.userId,
      timestamp: event.timestamp,
      metadata: event.metadata,
      created_at: event.timestamp,
    })
    .then(({ error }) => {
      if (error) {
        console.warn("[AnalyticsTracker] Cloud sync failed:", error.message);
      }
    });
};

/**
 * Emit an analytics event - the core tracking function
 * This stores the event locally, syncs to cloud, and notifies listeners
 */
export const trackEvent = (
  eventType: EventType,
  metadata: Record<string, any> = {},
): AnalyticsEvent => {
  const userId = getUserId();
  const now = new Date();

  const event: AnalyticsEvent = {
    id: generateEventId(),
    eventType,
    userId,
    timestamp: now.toISOString(),
    timestampMs: now.getTime(),
    metadata,
    processed: false,
  };

  // Store locally (synchronous)
  storeEventLocal(event);

  // Emit to real-time listeners
  emitToListeners(event);

  // Sync to cloud (async)
  syncEventCloud(event);

  // Trigger aggregation pipeline
  scheduleAggregation(event);

  return event;
};

// ─── Aggregation Scheduling ─────────────────────────────────────────────────────

let aggregationTimeout: ReturnType<typeof setTimeout> | null = null;

/**
 * Schedule aggregation processing with debounce
 * Prevents excessive recomputation when multiple events fire rapidly
 */
const scheduleAggregation = (event: AnalyticsEvent): void => {
  if (aggregationTimeout) {
    clearTimeout(aggregationTimeout);
  }

  aggregationTimeout = setTimeout(() => {
    processAggregation(event.userId);
    aggregationTimeout = null;
  }, 2000); // 2 second debounce
};

/**
 * Process aggregation for a user's events
 * Updates daily aggregates and real-time cache
 */
const processAggregation = (userId: string): void => {
  try {
    const today = new Date().toISOString().split("T")[0];

    // Update daily aggregates
    updateDailyAggregates(userId, today);

    // Update real-time cache
    updateRealtimeCache(userId);

    // Mark events as processed
    markEventsProcessed(userId);
  } catch (e) {
    console.error("[AnalyticsTracker] Aggregation error:", e);
  }
};

// ─── Daily Aggregates ───────────────────────────────────────────────────────────

interface DailyAggregate {
  date: string;
  userId: string;
  tasksCreated: number;
  tasksCompleted: number;
  habitsCompleted: number;
  focusMinutes: number;
  notesCreated: number;
  notesViewed: number;
  xpEarned: number;
  streakDays: number;
  focusSessions: number;
}

const updateDailyAggregates = (userId: string, date: string): void => {
  const todayEvents = db.getAllSync<AnalyticsEvent>(
    `SELECT * FROM analytics_events 
     WHERE user_id = ? AND SUBSTR(timestamp, 1, 10) = ?`,
    [userId, date],
  );

  let tasksCreated = 0;
  let tasksCompleted = 0;
  let habitsCompleted = 0;
  let focusMinutes = 0;
  let notesCreated = 0;
  let notesViewed = 0;
  let xpEarned = 0;
  let focusSessions = 0;

  todayEvents.forEach((rawEvent) => {
    // Metadata is stored as JSON string in SQLite — parse it
    const event = {
      ...rawEvent,
      metadata:
        typeof rawEvent.metadata === "string"
          ? (() => { try { return JSON.parse(rawEvent.metadata); } catch { return {}; } })()
          : (rawEvent.metadata || {}),
    };
    switch (event.eventType) {
      case "task_created":
        tasksCreated++;
        break;
      case "task_completed":
        tasksCompleted++;
        break;
      case "habit_completed":
        habitsCompleted++;
        break;
      case "focus_session_ended":
        focusMinutes += event.metadata.durationMinutes || event.metadata.duration_minutes || 0;
        focusSessions++;
        break;
      case "note_created":
        notesCreated++;
        break;
      case "note_viewed":
        notesViewed++;
        break;
      case "xp_earned":
        xpEarned += event.metadata.amount || 0;
        break;
    }
  });

  // Calculate streak days (consecutive habit completions)
  const streakDays = calculateStreakDays(userId);

  db.runSync(
    `INSERT OR REPLACE INTO analytics_daily_aggregates 
     (date, user_id, tasks_created, tasks_completed, habits_completed, 
      focus_minutes, notes_created, notes_viewed, xp_earned, streak_days, focus_sessions)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      date,
      userId,
      tasksCreated,
      tasksCompleted,
      habitsCompleted,
      focusMinutes,
      notesCreated,
      notesViewed,
      xpEarned,
      streakDays,
      focusSessions,
    ],
  );
};

const calculateStreakDays = (userId: string): number => {
  // Get habit completion events for the last 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const habitEvents = db.getAllSync<{ timestamp: string }>(
    `SELECT timestamp FROM analytics_events 
     WHERE user_id = ? AND event_type = 'habit_completed' 
     AND timestamp >= ?
     ORDER BY timestamp DESC`,
    [userId, thirtyDaysAgo.toISOString()],
  );

  if (habitEvents.length === 0) return 0;

  // Count consecutive days with habit completion
  let streak = 0;
  const today = new Date().toISOString().split("T")[0];
  let currentDate = new Date(today);

  for (let i = 0; i < 365; i++) {
    const dateStr = currentDate.toISOString().split("T")[0];
    const hasCompletion = habitEvents.some(
      (event) => event.timestamp.substring(0, 10) === dateStr,
    );

    if (hasCompletion) {
      streak++;
    } else if (i > 0) {
      break; // Break on first miss (except for today which might be incomplete)
    }

    currentDate.setDate(currentDate.getDate() - 1);
  }

  return streak;
};

// ─── Real-time Cache ────────────────────────────────────────────────────────────

interface RealtimeCache {
  userId: string;
  updatedAt: string;
  weeklyTasksCompleted: number;
  weeklyHabitsCompleted: number;
  weeklyFocusMinutes: number;
  currentStreak: number;
  bestStreak: number;
  productivityScore: number;
}

const updateRealtimeCache = (userId: string): void => {
  const now = new Date();
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  // Get weekly aggregates
  const weeklyData = db.getFirstSync<{
    total_tasks_completed: number;
    total_habits_completed: number;
    total_focus_minutes: number;
  }>(
    `SELECT 
       SUM(tasks_completed) as total_tasks_completed,
       SUM(habits_completed) as total_habits_completed,
       SUM(focus_minutes) as total_focus_minutes
     FROM analytics_daily_aggregates
     WHERE user_id = ? AND date >= ?`,
    [userId, weekAgo.toISOString().split("T")[0]],
  );

  // Get streak info
  const streakDays = calculateStreakDays(userId);
  const bestStreak = getBestStreak(userId);

  // Calculate productivity score (0-100)
  const productivityScore = calculateProductivityScore(userId, weeklyData);

  db.runSync(
    `INSERT OR REPLACE INTO analytics_realtime_cache 
     (user_id, updated_at, weekly_tasks_completed, weekly_habits_completed,
      weekly_focus_minutes, current_streak, best_streak, productivity_score)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      userId,
      now.toISOString(),
      weeklyData?.total_tasks_completed || 0,
      weeklyData?.total_habits_completed || 0,
      weeklyData?.total_focus_minutes || 0,
      streakDays,
      bestStreak,
      productivityScore,
    ],
  );
};

const getBestStreak = (userId: string): number => {
  const allAggregates = db.getAllSync<{ streak_days: number }>(
    `SELECT streak_days FROM analytics_daily_aggregates 
     WHERE user_id = ? ORDER BY streak_days DESC LIMIT 1`,
    [userId],
  );
  return allAggregates.length > 0 ? allAggregates[0].streak_days : 0;
};

const calculateProductivityScore = (
  userId: string,
  weeklyData:
    | {
        total_tasks_completed?: number;
        total_habits_completed?: number;
        total_focus_minutes?: number;
      }
    | undefined,
): number => {
  if (!weeklyData) return 0;

  const tasksScore = Math.min(50, (weeklyData.total_tasks_completed || 0) * 5);
  const habitsScore = Math.min(
    25,
    (weeklyData.total_habits_completed || 0) * 5,
  );
  const focusScore = Math.min(
    25,
    Math.floor((weeklyData.total_focus_minutes || 0) / 30) * 5,
  );

  return Math.min(100, tasksScore + habitsScore + focusScore);
};

const markEventsProcessed = (userId: string): void => {
  db.runSync(
    `UPDATE analytics_events SET processed = 1 
     WHERE user_id = ? AND processed = 0`,
    [userId],
  );
};

// ─── Database Initialization ────────────────────────────────────────────────────

export const initAnalyticsTables = (): void => {
  try {
    // Analytics Events Table (append-only log)
    db.execSync(`
      CREATE TABLE IF NOT EXISTS analytics_events (
        id TEXT PRIMARY KEY,
        event_type TEXT NOT NULL,
        user_id TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        timestamp_ms INTEGER NOT NULL,
        metadata TEXT DEFAULT '{}',
        processed INTEGER DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_analytics_events_user_id ON analytics_events(user_id);
      CREATE INDEX IF NOT EXISTS idx_analytics_events_type ON analytics_events(event_type);
      CREATE INDEX IF NOT EXISTS idx_analytics_events_timestamp ON analytics_events(timestamp);
      CREATE INDEX IF NOT EXISTS idx_analytics_events_processed ON analytics_events(processed);
    `);

    // Daily Aggregates Table
    db.execSync(`
      CREATE TABLE IF NOT EXISTS analytics_daily_aggregates (
        date TEXT NOT NULL,
        user_id TEXT NOT NULL,
        tasks_created INTEGER DEFAULT 0,
        tasks_completed INTEGER DEFAULT 0,
        habits_completed INTEGER DEFAULT 0,
        focus_minutes INTEGER DEFAULT 0,
        notes_created INTEGER DEFAULT 0,
        notes_viewed INTEGER DEFAULT 0,
        xp_earned INTEGER DEFAULT 0,
        streak_days INTEGER DEFAULT 0,
        focus_sessions INTEGER DEFAULT 0,
        PRIMARY KEY (date, user_id)
      );
      CREATE INDEX IF NOT EXISTS idx_analytics_daily_user_id ON analytics_daily_aggregates(user_id);
      CREATE INDEX IF NOT EXISTS idx_analytics_daily_date ON analytics_daily_aggregates(date);
    `);

    // Real-time Cache Table
    db.execSync(`
      CREATE TABLE IF NOT EXISTS analytics_realtime_cache (
        user_id TEXT PRIMARY KEY,
        updated_at TEXT NOT NULL,
        weekly_tasks_completed INTEGER DEFAULT 0,
        weekly_habits_completed INTEGER DEFAULT 0,
        weekly_focus_minutes INTEGER DEFAULT 0,
        current_streak INTEGER DEFAULT 0,
        best_streak INTEGER DEFAULT 0,
        productivity_score INTEGER DEFAULT 0
      );
    `);

    console.log("[AnalyticsTracker] Tables initialized successfully");
  } catch (e) {
    console.error("[AnalyticsTracker] Failed to initialize tables:", e);
  }
};

// ─── Convenience Tracking Functions ─────────────────────────────────────────────

export const trackTask = {
  created: (taskId: string, title: string, priority?: string) =>
    trackEvent("task_created", { taskId, title, priority }),
  completed: (taskId: string, title: string, completedAfterMinutes?: number) =>
    trackEvent("task_completed", { taskId, title, completedAfterMinutes }),
  deleted: (taskId: string, title: string) =>
    trackEvent("task_deleted", { taskId, title }),
  updated: (taskId: string, changes: Record<string, any>) =>
    trackEvent("task_updated", { taskId, changes }),
};

export const trackHabit = {
  created: (habitId: string, title: string, frequency?: string) =>
    trackEvent("habit_created", { habitId, title, frequency }),
  completed: (habitId: string, title: string, streak?: number) =>
    trackEvent("habit_completed", { habitId, title, streak }),
  streakExtended: (habitId: string, streak: number) =>
    trackEvent("habit_streak_extended", { habitId, streak }),
  deleted: (habitId: string, title: string) =>
    trackEvent("habit_deleted", { habitId, title }),
  updated: (habitId: string, changes: Record<string, any>) =>
    trackEvent("habit_updated", { habitId, changes }),
};

export const trackNote = {
  created: (noteId: string, title: string, tags?: string[]) =>
    trackEvent("note_created", { noteId, title, tags }),
  updated: (noteId: string, title: string, changes?: Record<string, any>) =>
    trackEvent("note_updated", { noteId, title, changes }),
  deleted: (noteId: string, title: string) =>
    trackEvent("note_deleted", { noteId, title }),
  viewed: (noteId: string, title: string, tags?: string[]) =>
    trackEvent("note_viewed", { noteId, title, tags }),
  revisionSession: (noteId: string, durationMinutes: number, tags?: string[]) =>
    trackEvent("note_revision_session", { noteId, durationMinutes, tags }),
};

export const trackFocus = {
  started: (
    sessionId: string,
    durationMinutes: number,
    mode?: string,
    taskId?: string,
  ) =>
    trackEvent("focus_session_started", {
      sessionId,
      durationMinutes,
      mode,
      taskId,
    }),
  ended: (
    sessionId: string,
    durationMinutes: number,
    completed: boolean,
    mode?: string,
  ) =>
    trackEvent("focus_session_ended", {
      sessionId,
      durationMinutes,
      completed,
      mode,
    }),
  interrupted: (sessionId: string, durationMinutes: number, reason?: string) =>
    trackEvent("focus_session_interrupted", {
      sessionId,
      durationMinutes,
      reason,
    }),
};

export const trackAuth = {
  login: (method: string) => trackEvent("login", { method }),
  logout: () => trackEvent("logout", {}),
  signup: (method: string) => trackEvent("signup", { method }),
};

export const trackApp = {
  opened: (source?: string) => trackEvent("app_opened", { source }),
  closed: () => trackEvent("app_closed", {}),
  screenView: (screenName: string) => trackEvent("screen_view", { screenName }),
};

export const trackSubscription = {
  paywallView: (source: string) => trackEvent("paywall_view", { source }),
  started: (plan: string) => trackEvent("subscription_started", { plan }),
  ended: (plan: string) => trackEvent("subscription_ended", { plan }),
};

// ─── Query Helpers ──────────────────────────────────────────────────────────────

export const getEventsByType = (
  userId: string,
  eventType: EventType,
  daysBack: number = 30,
): AnalyticsEvent[] => {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - daysBack);

  return db
    .getAllSync<AnalyticsEvent>(
      `SELECT * FROM analytics_events 
     WHERE user_id = ? AND event_type = ? AND timestamp >= ?
     ORDER BY timestamp DESC`,
      [userId, eventType, startDate.toISOString()],
    )
    .map((event) => ({
      ...event,
      metadata:
        typeof event.metadata === "string"
          ? JSON.parse(event.metadata)
          : event.metadata,
    }));
};

export const getEventsByDateRange = (
  userId: string,
  startDate: string,
  endDate: string,
): AnalyticsEvent[] => {
  return db
    .getAllSync<AnalyticsEvent>(
      `SELECT * FROM analytics_events 
     WHERE user_id = ? AND timestamp >= ? AND timestamp <= ?
     ORDER BY timestamp DESC`,
      [userId, startDate, endDate],
    )
    .map((event) => ({
      ...event,
      metadata:
        typeof event.metadata === "string"
          ? JSON.parse(event.metadata)
          : event.metadata,
    }));
};

export const getDailyAggregates = (
  userId: string,
  daysBack: number = 30,
): DailyAggregate[] => {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - daysBack);

  return db.getAllSync<DailyAggregate>(
    `SELECT * FROM analytics_daily_aggregates 
     WHERE user_id = ? AND date >= ?
     ORDER BY date DESC`,
    [userId, startDate.toISOString().split("T")[0]],
  );
};

export const getRealtimeCache = (userId: string): RealtimeCache | null => {
  return db.getFirstSync<RealtimeCache>(
    `SELECT * FROM analytics_realtime_cache WHERE user_id = ?`,
    [userId],
  );
};
