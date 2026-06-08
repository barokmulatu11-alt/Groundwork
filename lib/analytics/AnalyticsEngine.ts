/**
 * AnalyticsEngine - Core Analytics Processing for Groundwork Pro
 *
 * This engine processes raw events from AnalyticsTracker and computes
 * all Pro analytics features including productivity analytics, habit heatmaps,
 * focus analytics, revision insights, trends, and reports.
 *
 * All insights are mathematically derived from events - no UI-level calculations.
 */

import { db } from "@/lib/db";
import { isPro } from "@/lib/subscriptionService";
import {
    getDailyAggregates,
    getEventsByDateRange,
    getEventsByType,
    getRealtimeCache
} from "./AnalyticsTracker";

// ─── Types ──────────────────────────────────────────────────────────────────────

export interface ProductivityMetrics {
  tasksCompletedToday: number;
  tasksCompletedThisWeek: number;
  tasksCompletedThisMonth: number;
  completionRate: number; // completed / created
  peakProductivityHours: { hour: number; count: number }[];
  averageTaskCompletionTime: number; // minutes
  productivityTrend: "improving" | "declining" | "stable";
  trendSlope: number;
}

export interface HabitHeatmapData {
  date: string;
  count: number;
  habits: string[];
}

export interface HabitConsistency {
  habitId: string;
  habitTitle: string;
  consistencyScore: number; // 0-100
  completedDays: number;
  totalDays: number;
  currentStreak: number;
  bestStreak: number;
  heatmapData: HabitHeatmapData[];
}

export interface FocusMetrics {
  totalFocusTimeToday: number; // minutes
  totalFocusTimeThisWeek: number; // minutes
  averageSessionLength: number; // minutes
  distractionRate: number; // interrupted / total
  bestFocusHours: { hour: number; minutes: number }[];
  focusScore: number; // 0-100
  sessionsToday: number;
}

export interface RevisionInsight {
  noteId: string;
  noteTitle: string;
  tags: string[];
  lastViewed: string | null;
  viewCount: number;
  revisionGaps: number[]; // days between views
  priorityScore: number;
  isOverdue: boolean;
  suggestedInterval: number; // days
}

export interface TrendData {
  productivity: {
    direction: "improving" | "declining" | "stable";
    slope: number;
    rolling7Day: number;
    rolling14Day: number;
    rolling30Day: number;
  };
  habitConsistency: {
    direction: "improving" | "declining" | "stable";
    slope: number;
    rolling7Day: number;
    rolling14Day: number;
    rolling30Day: number;
  };
  focus: {
    direction: "improving" | "declining" | "stable";
    slope: number;
    rolling7Day: number;
    rolling14Day: number;
    rolling30Day: number;
  };
}

export interface WeeklyReport {
  weekStart: string;
  weekEnd: string;
  tasksCompleted: number;
  habitsConsistency: number;
  totalFocusTime: number;
  xpEarned: number;
  bestDay: { date: string; score: number };
  weakestDay: { date: string; score: number };
  insights: string[];
  generatedAt: string;
}

export interface MonthlyReport {
  month: string;
  year: number;
  totalTasksCompleted: number;
  totalHabitsCompleted: number;
  totalFocusHours: number;
  totalXpEarned: number;
  averageDailyStreak: number;
  bestWeek: { weekStart: string; tasksCompleted: number };
  insights: string[];
  generatedAt: string;
}

// ─── Productivity Analytics ─────────────────────────────────────────────────────

export const getProductivityMetrics = (
  userId: string,
  daysBack: number = 30,
): ProductivityMetrics => {
  const userIsPro = isPro();

  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - daysBack);

  const todayStr = endDate.toISOString().split("T")[0];
  const weekAgoStr = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];
  const monthAgoStr = startDate.toISOString().split("T")[0];

  // ── Primary: read from analytics_events ──────────────────────────────────
  const taskCompletedEvents = getEventsByType(userId, "task_completed", daysBack);
  const taskCreatedEvents = getEventsByType(userId, "task_created", daysBack);

  let tasksCompletedToday = taskCompletedEvents.filter(
    (e) => e.timestamp.substring(0, 10) === todayStr,
  ).length;
  let tasksCompletedThisWeek = taskCompletedEvents.filter(
    (e) => e.timestamp.substring(0, 10) >= weekAgoStr,
  ).length;
  let tasksCompletedThisMonth = taskCompletedEvents.filter(
    (e) => e.timestamp.substring(0, 10) >= monthAgoStr,
  ).length;
  let tasksCreatedThisMonth = taskCreatedEvents.filter(
    (e) => e.timestamp.substring(0, 10) >= monthAgoStr,
  ).length;

  // ── Fallback: read directly from tasks table if events are sparse ─────────
  if (tasksCompletedToday === 0 && tasksCompletedThisWeek === 0) {
    try {
      const todayFromDb = db.getFirstSync<{ count: number }>(
        "SELECT COUNT(*) as count FROM tasks WHERE user_id = ? AND completed = 1 AND date = ? AND deleted_at IS NULL",
        [userId, todayStr],
      );
      tasksCompletedToday = todayFromDb?.count || 0;

      const weekFromDb = db.getFirstSync<{ count: number }>(
        "SELECT COUNT(*) as count FROM tasks WHERE user_id = ? AND completed = 1 AND date >= ? AND deleted_at IS NULL",
        [userId, weekAgoStr],
      );
      tasksCompletedThisWeek = weekFromDb?.count || 0;

      const monthFromDb = db.getFirstSync<{ count: number }>(
        "SELECT COUNT(*) as count FROM tasks WHERE user_id = ? AND completed = 1 AND date >= ? AND deleted_at IS NULL",
        [userId, monthAgoStr],
      );
      tasksCompletedThisMonth = monthFromDb?.count || 0;

      const createdFromDb = db.getFirstSync<{ count: number }>(
        "SELECT COUNT(*) as count FROM tasks WHERE user_id = ? AND date >= ? AND deleted_at IS NULL",
        [userId, monthAgoStr],
      );
      tasksCreatedThisMonth = createdFromDb?.count || 0;
    } catch (e) {
      // silently ignore SQLite errors
    }
  }

  const completionRate =
    tasksCreatedThisMonth > 0
      ? Math.round((tasksCompletedThisMonth / tasksCreatedThisMonth) * 100)
      : tasksCompletedThisMonth > 0 ? 100 : 0;

  // Peak productivity hours (Pro only — needs events)
  let peakProductivityHours: { hour: number; count: number }[] = [];
  if (userIsPro && taskCompletedEvents.length > 0) {
    const hourCounts = new Map<number, number>();
    taskCompletedEvents.forEach((event) => {
      const hour = new Date(event.timestamp).getHours();
      hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1);
    });
    peakProductivityHours = Array.from(hourCounts.entries())
      .map(([hour, count]) => ({ hour, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }

  let averageTaskCompletionTime = 0;
  if (userIsPro) {
    const completionTimes = taskCompletedEvents
      .filter((e) => e.metadata.completedAfterMinutes)
      .map((e) => e.metadata.completedAfterMinutes);
    if (completionTimes.length > 0) {
      averageTaskCompletionTime = Math.round(
        completionTimes.reduce((a, b) => a + b, 0) / completionTimes.length,
      );
    }
  }

  const trend = calculateProductivityTrend(userId, daysBack);

  return {
    tasksCompletedToday,
    tasksCompletedThisWeek,
    tasksCompletedThisMonth,
    completionRate,
    peakProductivityHours,
    averageTaskCompletionTime,
    productivityTrend: trend.direction,
    trendSlope: trend.slope,
  };
};

const calculateProductivityTrend = (
  userId: string,
  daysBack: number,
): { direction: "improving" | "declining" | "stable"; slope: number } => {
  const aggregates = getDailyAggregates(userId, daysBack);

  if (aggregates.length < 7) {
    return { direction: "stable", slope: 0 };
  }

  // Calculate daily productivity scores
  const dailyScores = aggregates
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((agg) => agg.tasksCompleted * 10 + agg.habitsCompleted * 5);

  // Calculate slope using linear regression
  const slope = calculateSlope(dailyScores);

  if (slope > 0.5) return { direction: "improving", slope };
  if (slope < -0.5) return { direction: "declining", slope };
  return { direction: "stable", slope };
};

// ─── Habit Heatmaps ─────────────────────────────────────────────────────────────

export const getHabitHeatmapData = (
  userId: string,
  daysBack: number = 90,
  habitId?: string,
): HabitHeatmapData[] => {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - daysBack);

  const habitEvents = getEventsByDateRange(
    userId,
    startDate.toISOString(),
    endDate.toISOString(),
  ).filter((e) => e.eventType === "habit_completed");

  // Group by date
  const dateMap = new Map<string, { count: number; habits: Set<string> }>();

  // Initialize all dates in range
  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split("T")[0];
    dateMap.set(dateStr, { count: 0, habits: new Set() });
  }

  // Populate with actual data
  habitEvents.forEach((event) => {
    const dateStr = event.timestamp.substring(0, 10);
    const data = dateMap.get(dateStr) || { count: 0, habits: new Set() };
    data.count++;
    if (event.metadata.habitId) {
      data.habits.add(event.metadata.habitId);
    }
    dateMap.set(dateStr, data);
  });

  return Array.from(dateMap.entries())
    .map(([date, data]) => ({
      date,
      count: data.count,
      habits: Array.from(data.habits),
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
};

export const getHabitConsistency = (
  userId: string,
  habitId?: string,
): HabitConsistency[] => {
  const userIsPro = isPro();

  // Get habits from store
  const { useStore } = require("@/store/useStore");
  const habits = useStore.getState().habits || [];

  const targetHabits = habitId
    ? habits.filter((h: any) => h.id === habitId)
    : habits.filter((h: any) => !h.deleted_at);

  return targetHabits.map((habit: any) => {
    const dates = habit.dates_completed
      ? JSON.parse(habit.dates_completed)
      : [];

    const today = new Date();
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const completedDates = dates.filter(
      (d: string) => new Date(d) >= ninetyDaysAgo,
    );

    const completedDays = completedDates.length;
    const totalDays = 90;
    const consistencyScore = Math.round((completedDays / totalDays) * 100);

    // Calculate current streak
    let currentStreak = 0;
    const sortedDates = [...completedDates].sort(
      (a: string, b: string) => new Date(b).getTime() - new Date(a).getTime(),
    );

    for (let i = 0; i < sortedDates.length; i++) {
      const expectedDate = new Date();
      expectedDate.setDate(expectedDate.getDate() - i);
      const expectedDateStr = expectedDate.toISOString().split("T")[0];

      if (sortedDates.includes(expectedDateStr)) {
        currentStreak++;
      } else if (i > 0) {
        break;
      }
    }

    // Generate heatmap data
    let heatmapData: HabitHeatmapData[] = [];
    if (userIsPro) {
      heatmapData = getHabitHeatmapData(userId, 90, habit.id);
    }

    return {
      habitId: habit.id,
      habitTitle: habit.title,
      consistencyScore,
      completedDays,
      totalDays,
      currentStreak,
      bestStreak: habit.best_streak || 0,
      heatmapData,
    };
  });
};

// ─── Focus Analytics ────────────────────────────────────────────────────────────

export const getFocusMetrics = (
  userId: string,
  daysBack: number = 30,
): FocusMetrics => {
  const userIsPro = isPro();

  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - daysBack);

  const todayStr = endDate.toISOString().split("T")[0];
  const weekAgoStr = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  const focusEvents = getEventsByDateRange(
    userId,
    startDate.toISOString(),
    endDate.toISOString(),
  ).filter((e) => e.eventType === "focus_session_ended");

  const interruptedEvents = getEventsByDateRange(
    userId,
    startDate.toISOString(),
    endDate.toISOString(),
  ).filter((e) => e.eventType === "focus_session_interrupted");

  let todaySessions = focusEvents.filter(
    (e) => e.timestamp.substring(0, 10) === todayStr,
  );
  let weekSessions = focusEvents.filter(
    (e) => e.timestamp.substring(0, 10) >= weekAgoStr,
  );

  let totalFocusTimeToday = todaySessions.reduce(
    (sum, e) => sum + (e.metadata.durationMinutes || 0),
    0,
  );
  let totalFocusTimeThisWeek = weekSessions.reduce(
    (sum, e) => sum + (e.metadata.durationMinutes || 0),
    0,
  );
  let sessionsCount = focusEvents.length;

  // ── Fallback: read from focus_sessions table if events are empty ──────────
  if (totalFocusTimeToday === 0 && totalFocusTimeThisWeek === 0) {
    try {
      const todayDb = db.getFirstSync<{ total: number; count: number }>(
        "SELECT SUM(duration_minutes) as total, COUNT(*) as count FROM focus_sessions WHERE user_id = ? AND date = ?",
        [userId, todayStr],
      );
      totalFocusTimeToday = todayDb?.total || 0;

      const weekDb = db.getFirstSync<{ total: number; count: number }>(
        "SELECT SUM(duration_minutes) as total, COUNT(*) as count FROM focus_sessions WHERE user_id = ? AND date >= ?",
        [userId, weekAgoStr],
      );
      totalFocusTimeThisWeek = weekDb?.total || 0;

      const allDb = db.getFirstSync<{ total: number; count: number }>(
        "SELECT SUM(duration_minutes) as total, COUNT(*) as count FROM focus_sessions WHERE user_id = ? AND date >= ?",
        [userId, startDate.toISOString().split("T")[0]],
      );
      sessionsCount = allDb?.count || 0;
    } catch (e) {
      // silently ignore
    }
  }

  const averageSessionLength =
    sessionsCount > 0
      ? Math.round(
          (focusEvents.length > 0
            ? focusEvents.reduce((sum, e) => sum + (e.metadata.durationMinutes || 0), 0)
            : totalFocusTimeThisWeek) / sessionsCount,
        )
      : 0;

  const distractionRate =
    sessionsCount + interruptedEvents.length > 0
      ? Math.round(
          (interruptedEvents.length / (sessionsCount + interruptedEvents.length)) * 100,
        )
      : 0;

  let bestFocusHours: { hour: number; minutes: number }[] = [];
  if (userIsPro && focusEvents.length > 0) {
    const hourMinutes = new Map<number, number>();
    focusEvents.forEach((event) => {
      const hour = new Date(event.timestamp).getHours();
      const minutes = event.metadata.durationMinutes || 0;
      hourMinutes.set(hour, (hourMinutes.get(hour) || 0) + minutes);
    });
    bestFocusHours = Array.from(hourMinutes.entries())
      .map(([hour, minutes]) => ({ hour, minutes }))
      .sort((a, b) => b.minutes - a.minutes)
      .slice(0, 5);
  }

  const focusScore = calculateFocusScore(
    totalFocusTimeThisWeek,
    sessionsCount,
    distractionRate,
  );

  return {
    totalFocusTimeToday,
    totalFocusTimeThisWeek,
    averageSessionLength,
    distractionRate,
    bestFocusHours,
    focusScore,
    sessionsToday: todaySessions.length || (() => {
      try {
        return db.getFirstSync<{ count: number }>(
          "SELECT COUNT(*) as count FROM focus_sessions WHERE user_id = ? AND date = ?",
          [userId, todayStr],
        )?.count || 0;
      } catch { return 0; }
    })(),
  };
};

const calculateFocusScore = (
  weeklyMinutes: number,
  sessionsCount: number,
  distractionRate: number,
): number => {
  // Base score from total focus time (max 50 points)
  const timeScore = Math.min(50, (weeklyMinutes / 300) * 50); // 5 hours = max

  // Session consistency score (max 25 points)
  const sessionScore = Math.min(25, (sessionsCount / 10) * 25); // 10 sessions = max

  // Low distraction score (max 25 points)
  const focusQualityScore = Math.max(0, 25 - distractionRate * 0.5);

  return Math.round(
    Math.min(100, timeScore + sessionScore + focusQualityScore),
  );
};

// ─── Revision Analytics ─────────────────────────────────────────────────────────

export const getRevisionInsights = (
  userId: string,
  daysBack: number = 30,
): RevisionInsight[] => {
  const userIsPro = isPro();
  if (!userIsPro) {
    return []; // Pro-only feature
  }

  // Get notes from store
  const { useStore } = require("@/store/useStore");
  const notes = useStore.getState().notes || [];

  const activeNotes = notes.filter((n: any) => !n.deleted_at);

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - daysBack);

  return activeNotes
    .map((note: any) => {
      // Get view events for this note
      const viewEvents = getEventsByDateRange(
        userId,
        startDate.toISOString(),
        new Date().toISOString(),
      ).filter(
        (e) => e.eventType === "note_viewed" && e.metadata.noteId === note.id,
      );

      const revisionEvents = getEventsByDateRange(
        userId,
        startDate.toISOString(),
        new Date().toISOString(),
      ).filter(
        (e) =>
          e.eventType === "note_revision_session" &&
          e.metadata.noteId === note.id,
      );

      const allEvents = [...viewEvents, ...revisionEvents].sort(
        (a, b) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
      );

      const lastViewed =
        allEvents.length > 0 ? allEvents[allEvents.length - 1].timestamp : null;

      const viewCount = viewEvents.length;

      // Calculate revision gaps
      const revisionGaps: number[] = [];
      for (let i = 1; i < allEvents.length; i++) {
        const gap =
          (new Date(allEvents[i].timestamp).getTime() -
            new Date(allEvents[i - 1].timestamp).getTime()) /
          (1000 * 60 * 60 * 24);
        revisionGaps.push(Math.round(gap));
      }

      // Calculate priority score
      const daysSinceLastView = lastViewed
        ? (Date.now() - new Date(lastViewed).getTime()) / (1000 * 60 * 60 * 24)
        : daysBack;

      const importanceWeight =
        note.priority === "High" ? 1.5 : note.priority === "Critical" ? 2 : 1;
      const priorityScore = Math.round(
        daysSinceLastView * importanceWeight * 10,
      );

      // Determine if overdue (based on spaced repetition intervals)
      const suggestedInterval = calculateSuggestedInterval(viewCount);
      const isOverdue = daysSinceLastView > suggestedInterval;

      return {
        noteId: note.id,
        noteTitle: note.title,
        tags: note.tags || [],
        lastViewed,
        viewCount,
        revisionGaps,
        priorityScore,
        isOverdue,
        suggestedInterval,
      };
    })
    .filter(
      (insight: RevisionInsight) => insight.viewCount > 0 || insight.isOverdue,
    )
    .sort(
      (a: RevisionInsight, b: RevisionInsight) =>
        b.priorityScore - a.priorityScore,
    );
};

const calculateSuggestedInterval = (viewCount: number): number => {
  // Spaced repetition intervals
  if (viewCount === 0) return 1;
  if (viewCount === 1) return 1;
  if (viewCount === 2) return 3;
  if (viewCount === 3) return 7;
  if (viewCount === 4) return 14;
  return 30;
};

// ─── Trend Engine ───────────────────────────────────────────────────────────────

export const getTrendAnalysis = (userId: string): TrendData => {
  const userIsPro = isPro();
  if (!userIsPro) {
    return {
      productivity: {
        direction: "stable",
        slope: 0,
        rolling7Day: 0,
        rolling14Day: 0,
        rolling30Day: 0,
      },
      habitConsistency: {
        direction: "stable",
        slope: 0,
        rolling7Day: 0,
        rolling14Day: 0,
        rolling30Day: 0,
      },
      focus: {
        direction: "stable",
        slope: 0,
        rolling7Day: 0,
        rolling14Day: 0,
        rolling30Day: 0,
      },
    };
  }

  const aggregates = getDailyAggregates(userId, 30);
  const sortedAggregates = aggregates.sort((a, b) =>
    a.date.localeCompare(b.date),
  );

  // Productivity trend
  const productivityScores = sortedAggregates.map(
    (a) => a.tasksCompleted * 10 + a.habitsCompleted * 5,
  );

  // Habit consistency trend
  const habitScores = sortedAggregates.map((a) => a.habitsCompleted);

  // Focus trend
  const focusScores = sortedAggregates.map((a) => a.focusMinutes);

  return {
    productivity: calculateTrendMetrics(productivityScores),
    habitConsistency: calculateTrendMetrics(habitScores),
    focus: calculateTrendMetrics(focusScores),
  };
};

const calculateTrendMetrics = (dailyValues: number[]) => {
  if (dailyValues.length < 7) {
    return {
      direction: "stable" as const,
      slope: 0,
      rolling7Day: 0,
      rolling14Day: 0,
      rolling30Day: 0,
    };
  }

  const rolling7Day = Math.round(
    dailyValues.slice(-7).reduce((a, b) => a + b, 0) /
      Math.min(7, dailyValues.length),
  );

  const rolling14Day = Math.round(
    dailyValues.slice(-14).reduce((a, b) => a + b, 0) /
      Math.min(14, dailyValues.length),
  );

  const rolling30Day = Math.round(
    dailyValues.reduce((a, b) => a + b, 0) / dailyValues.length,
  );

  const slope = calculateSlope(dailyValues);

  let direction: "improving" | "declining" | "stable" = "stable";
  if (slope > 0.3) direction = "improving";
  else if (slope < -0.3) direction = "declining";

  return { direction, slope, rolling7Day, rolling14Day, rolling30Day };
};

const calculateSlope = (values: number[]): number => {
  if (values.length < 2) return 0;

  const n = values.length;
  const xValues = Array.from({ length: n }, (_, i) => i);

  const sumX = xValues.reduce((a, b) => a + b, 0);
  const sumY = values.reduce((a, b) => a + b, 0);
  const sumXY = xValues.reduce((sum, x, i) => sum + x * values[i], 0);
  const sumX2 = xValues.reduce((sum, x) => sum + x * x, 0);

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  return Math.round(slope * 100) / 100;
};

// ─── Reports Generator ──────────────────────────────────────────────────────────

export const generateWeeklyReport = (
  userId: string,
  weekOffset: number = 0,
): WeeklyReport => {
  const userIsPro = isPro();

  const endDate = new Date();
  endDate.setDate(endDate.getDate() + weekOffset * 7);

  const weekStart = new Date(endDate);
  weekStart.setDate(weekStart.getDate() - 6);

  const weekStartStr = weekStart.toISOString().split("T")[0];
  const weekEndStr = endDate.toISOString().split("T")[0];

  // Get daily aggregates for the week
  const aggregates = getDailyAggregates(userId, 7 - weekOffset * 7).filter(
    (a) => a.date >= weekStartStr && a.date <= weekEndStr,
  );

  const tasksCompleted = aggregates.reduce((sum, a) => sum + a.tasksCompleted, 0)
    || (() => {
      try {
        return db.getFirstSync<{ count: number }>(
          "SELECT COUNT(*) as count FROM tasks WHERE user_id = ? AND completed = 1 AND date >= ? AND date <= ? AND deleted_at IS NULL",
          [userId, weekStartStr, weekEndStr],
        )?.count || 0;
      } catch { return 0; }
    })();

  const totalFocusTime = aggregates.reduce((sum, a) => sum + a.focusMinutes, 0)
    || (() => {
      try {
        return db.getFirstSync<{ total: number }>(
          "SELECT SUM(duration_minutes) as total FROM focus_sessions WHERE user_id = ? AND date >= ? AND date <= ?",
          [userId, weekStartStr, weekEndStr],
        )?.total || 0;
      } catch { return 0; }
    })();
  const xpEarned = aggregates.reduce((sum, a) => sum + a.xpEarned, 0);

  // Calculate habits consistency
  const habitDays = aggregates.filter((a) => a.habitsCompleted > 0).length;
  const habitsConsistency = Math.round((habitDays / 7) * 100);

  // Find best and weakest days
  let bestDay = { date: weekStartStr, score: 0 };
  let weakestDay = { date: weekStartStr, score: Infinity };

  aggregates.forEach((agg) => {
    const dayScore =
      agg.tasksCompleted * 10 +
      agg.habitsCompleted * 5 +
      Math.floor(agg.focusMinutes / 5);
    if (dayScore > bestDay.score) {
      bestDay = { date: agg.date, score: dayScore };
    }
    if (dayScore < weakestDay.score) {
      weakestDay = { date: agg.date, score: dayScore };
    }
  });

  if (weakestDay.score === Infinity) {
    weakestDay = { date: weekStartStr, score: 0 };
  }

  // Generate insights (Pro only)
  let insights: string[] = [];
  if (userIsPro) {
    insights = generateWeeklyInsights(
      aggregates,
      tasksCompleted,
      habitsConsistency,
      totalFocusTime,
    );
  }

  return {
    weekStart: weekStartStr,
    weekEnd: weekEndStr,
    tasksCompleted,
    habitsConsistency,
    totalFocusTime,
    xpEarned,
    bestDay,
    weakestDay,
    insights,
    generatedAt: new Date().toISOString(),
  };
};

export const generateMonthlyReport = (
  userId: string,
  monthOffset: number = 0,
): MonthlyReport => {
  const userIsPro = isPro();

  const endDate = new Date();
  endDate.setMonth(endDate.getMonth() + monthOffset);

  const monthStart = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
  const monthStr = endDate.toLocaleString("default", { month: "long" });

  // Get daily aggregates for the month
  const aggregates = getDailyAggregates(userId, 31 - monthOffset * 30).filter(
    (a) => {
      const aggDate = new Date(a.date);
      return (
        aggDate.getFullYear() === monthStart.getFullYear() &&
        aggDate.getMonth() === monthStart.getMonth()
      );
    },
  );

  const totalTasksCompleted = aggregates.reduce(
    (sum, a) => sum + a.tasksCompleted,
    0,
  );
  const totalHabitsCompleted = aggregates.reduce(
    (sum, a) => sum + a.habitsCompleted,
    0,
  );
  const totalFocusHours = Math.round(
    aggregates.reduce((sum, a) => sum + a.focusMinutes, 0) / 60,
  );
  const totalXpEarned = aggregates.reduce((sum, a) => sum + a.xpEarned, 0);

  // Average daily streak
  const streakDays = aggregates.filter((a) => a.streakDays > 0).length;
  const averageDailyStreak =
    aggregates.length > 0
      ? Math.round((streakDays / aggregates.length) * 100) / 100
      : 0;

  // Find best week
  let bestWeek = { weekStart: "", tasksCompleted: 0 };
  // Simple weekly grouping
  for (let i = 0; i < aggregates.length; i += 7) {
    const weekTasks = aggregates
      .slice(i, i + 7)
      .reduce((sum, a) => sum + a.tasksCompleted, 0);
    if (weekTasks > bestWeek.tasksCompleted) {
      bestWeek = { weekStart: aggregates[i].date, tasksCompleted: weekTasks };
    }
  }

  // Generate insights (Pro only)
  let insights: string[] = [];
  if (userIsPro) {
    insights = generateMonthlyInsights(
      aggregates,
      totalTasksCompleted,
      totalHabitsCompleted,
      totalFocusHours,
    );
  }

  return {
    month: monthStr,
    year: endDate.getFullYear(),
    totalTasksCompleted,
    totalHabitsCompleted,
    totalFocusHours,
    totalXpEarned,
    averageDailyStreak,
    bestWeek,
    insights,
    generatedAt: new Date().toISOString(),
  };
};

const generateWeeklyInsights = (
  aggregates: any[],
  tasksCompleted: number,
  habitsConsistency: number,
  focusMinutes: number,
): string[] => {
  const insights: string[] = [];

  if (tasksCompleted >= 21) {
    insights.push(
      "🎯 Outstanding week! You completed 3+ tasks daily on average.",
    );
  } else if (tasksCompleted >= 14) {
    insights.push("✅ Solid productivity! Keep up the momentum.");
  } else if (tasksCompleted > 0) {
    insights.push("💪 Good start! Try to complete one more task tomorrow.");
  }

  if (habitsConsistency >= 85) {
    insights.push(
      "🔥 Incredible habit consistency! You're building strong routines.",
    );
  } else if (habitsConsistency >= 60) {
    insights.push(
      "📈 Great habit progress! Aim for daily check-ins to boost your streak.",
    );
  }

  if (focusMinutes >= 300) {
    insights.push("🧠 Deep work champion! 5+ hours of focused time this week.");
  } else if (focusMinutes >= 120) {
    insights.push(
      "⚡ Solid focus sessions! Consider extending your next session by 5 minutes.",
    );
  }

  if (insights.length === 0) {
    insights.push("🌱 Every journey starts with a single step. Keep going!");
  }

  return insights;
};

const generateMonthlyInsights = (
  aggregates: any[],
  tasksCompleted: number,
  habitsCompleted: number,
  focusHours: number,
): string[] => {
  const insights: string[] = [];

  if (tasksCompleted >= 60) {
    insights.push(
      "🏆 Phenomenal month! 60+ tasks completed shows incredible dedication.",
    );
  } else if (tasksCompleted >= 30) {
    insights.push("⭐ Strong month! You're consistently getting things done.");
  }

  if (habitsCompleted >= 60) {
    insights.push(
      "🎯 Habit master! Daily routines are becoming second nature.",
    );
  }

  if (focusHours >= 40) {
    insights.push("🧠 Focus powerhouse! 40+ hours of deep work this month.");
  } else if (focusHours >= 20) {
    insights.push(
      "⚡ Consistent focus! You're building strong concentration muscles.",
    );
  }

  // Trend-based insights
  const recentWeek = aggregates.slice(-7);
  const previousWeek = aggregates.slice(-14, -7);

  if (recentWeek.length > 0 && previousWeek.length > 0) {
    const recentAvg =
      recentWeek.reduce((s, a) => s + a.tasksCompleted, 0) / recentWeek.length;
    const prevAvg =
      previousWeek.reduce((s, a) => s + a.tasksCompleted, 0) /
      previousWeek.length;

    if (recentAvg > prevAvg * 1.2) {
      insights.push(
        "📈 You're accelerating! This week was 20%+ more productive than last.",
      );
    }
  }

  if (insights.length === 0) {
    insights.push(
      "🌟 Another month of growth! Review your progress and set new goals.",
    );
  }

  return insights;
};

// ─── Data Integrity & Reconciliation ────────────────────────────────────────────

export const runReconciliation = (
  userId: string,
): { fixed: number; errors: string[] } => {
  const result = { fixed: 0, errors: [] as string[] };

  try {
    // 1. Verify XP ledger matches computed totals
    const xpFromEvents = verifyXpLedger(userId);
    if (xpFromEvents.discrepancy > 0) {
      result.fixed += xpFromEvents.fixed;
      result.errors.push(...xpFromEvents.errors);
    }

    // 2. Verify daily aggregates are complete
    const aggregatesFixed = verifyDailyAggregates(userId);
    result.fixed += aggregatesFixed;

    // 3. Verify realtime cache is current
    const cacheFixed = verifyRealtimeCache(userId);
    result.fixed += cacheFixed;
  } catch (e) {
    result.errors.push(`Reconciliation error: ${(e as Error).message}`);
  }

  return result;
};

const verifyXpLedger = (
  userId: string,
): { discrepancy: number; fixed: number; errors: string[] } => {
  const result = { discrepancy: 0, fixed: 0, errors: [] as string[] };

  // Get XP from events
  const xpEvents = getEventsByType(userId, "xp_earned", 365);
  const xpFromEvents = xpEvents.reduce(
    (sum, e) => sum + (e.metadata.amount || 0),
    0,
  );

  // Get XP from profile
  const profile = db.getFirstSync<{ xp: number }>(
    "SELECT xp FROM connect_profiles WHERE user_id = ?",
    [userId],
  );

  if (profile) {
    const discrepancy = Math.abs(profile.xp - xpFromEvents);
    if (discrepancy > 10) {
      // Allow small tolerance
      result.discrepancy = discrepancy;
      result.errors.push(
        `XP discrepancy: profile=${profile.xp}, events=${xpFromEvents}`,
      );

      // Fix: Recalculate from events
      db.runSync(
        "UPDATE connect_profiles SET xp = ?, updated_at = ? WHERE user_id = ?",
        [xpFromEvents, new Date().toISOString(), userId],
      );
      result.fixed++;
    }
  }

  return result;
};

const verifyDailyAggregates = (userId: string): number => {
  let fixed = 0;

  // Check for missing aggregates in the last 7 days
  for (let i = 0; i < 7; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split("T")[0];

    const agg = db.getFirstSync<{ date: string }>(
      "SELECT date FROM analytics_daily_aggregates WHERE user_id = ? AND date = ?",
      [userId, dateStr],
    );

    if (!agg) {
      // Trigger aggregation for this date
      db.runSync(
        "INSERT OR IGNORE INTO analytics_daily_aggregates (date, user_id) VALUES (?, ?)",
        [dateStr, userId],
      );
      fixed++;
    }
  }

  return fixed;
};

const verifyRealtimeCache = (userId: string): number => {
  const cache = getRealtimeCache(userId);

  if (!cache) {
    // Initialize cache
    db.runSync(
      "INSERT OR IGNORE INTO analytics_realtime_cache (user_id, updated_at) VALUES (?, ?)",
      [userId, new Date().toISOString()],
    );
    return 1;
  }

  // Check if cache is stale (older than 1 hour)
  const cacheAge = Date.now() - new Date(cache.updatedAt).getTime();
  if (cacheAge > 3600000) {
    // Trigger cache update
    db.runSync(
      "UPDATE analytics_realtime_cache SET updated_at = ? WHERE user_id = ?",
      [new Date().toISOString(), userId],
    );
    return 1;
  }

  return 0;
};

// ─── Free vs Pro Data Limiting ──────────────────────────────────────────────────

export const getLimitedProductivityMetrics = (
  userId: string,
): Partial<ProductivityMetrics> => {
  const userIsPro = isPro();

  const fullMetrics = getProductivityMetrics(userId, 7); // Only 7 days for free users

  if (userIsPro) {
    return fullMetrics;
  }

  // Free users get simplified stats only
  return {
    tasksCompletedToday: fullMetrics.tasksCompletedToday,
    tasksCompletedThisWeek: fullMetrics.tasksCompletedThisWeek,
    completionRate: fullMetrics.completionRate,
    // No trends, no peak hours, no average completion time for free users
  };
};

export const getLimitedFocusMetrics = (
  userId: string,
): Partial<FocusMetrics> => {
  const userIsPro = isPro();

  const fullMetrics = getFocusMetrics(userId, 7);

  if (userIsPro) {
    return fullMetrics;
  }

  // Free users get basic stats only
  return {
    totalFocusTimeToday: fullMetrics.totalFocusTimeToday,
    sessionsToday: fullMetrics.sessionsToday,
    // No scores, no trends, no best hours for free users
  };
};
