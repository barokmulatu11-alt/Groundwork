import type { Habit } from '@/lib/db';
import { getLocalDateString, parseLocalDateString } from '@/lib/dateUtils';

/** Parse habit dates_completed whether stored as JSON string or array. */
export function parseHabitDates(datesCompleted: Habit['dates_completed'] | string[] | undefined): string[] {
  if (!datesCompleted) return [];
  if (Array.isArray(datesCompleted)) return datesCompleted;
  if (typeof datesCompleted !== 'string') return [];
  try {
    const parsed = JSON.parse(datesCompleted);
    return Array.isArray(parsed) ? parsed.filter((d): d is string => typeof d === 'string') : [];
  } catch {
    return [];
  }
}

export function habitCompletedOnDate(habit: Habit, dateStr: string): boolean {
  return parseHabitDates(habit.dates_completed).includes(dateStr);
}

/** Monday-based day index (0 = Mon, 6 = Sun) matching AddHabitSheet and custom days. */
export function getMondayBasedDayIndex(date: Date = new Date()): number {
  const jsDay = date.getDay();
  return jsDay === 0 ? 6 : jsDay - 1;
}

const WEEKDAY_NAMES_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/**
 * Serializes an array of Monday-based weekday indices (0=Mon..6=Sun) into 'Custom:0,1,2'
 */
export function serializeCustomDays(days: number[]): string {
  const sorted = Array.from(new Set(days))
    .filter(d => typeof d === 'number' && !Number.isNaN(d) && d >= 0 && d <= 6)
    .sort((a, b) => a - b);
  return `Custom:${sorted.join(',')}`;
}

/**
 * Parses a frequency string like 'Custom:0,1,2' into Monday-based weekday indices [0, 1, 2]
 */
export function parseCustomDays(frequency: string): number[] {
  if (!frequency || typeof frequency !== 'string') return [];
  const trimmed = frequency.trim();
  if (!trimmed.toLowerCase().startsWith('custom:')) return [];
  const part = trimmed.slice(7).trim();
  if (!part) return [];
  return part
    .split(',')
    .map(s => parseInt(s.trim(), 10))
    .filter(n => !Number.isNaN(n) && n >= 0 && n <= 6)
    .sort((a, b) => a - b);
}

/**
 * Returns whether a habit with a given frequency is scheduled for a specific date.
 * Handles both Date instances and local 'YYYY-MM-DD' date strings.
 */
export function isHabitDueOnDate(frequency: string, date: Date | string = new Date()): boolean {
  const f = (frequency || 'Daily').trim();
  const dateObj = typeof date === 'string' ? parseLocalDateString(date) : date;
  const monBased = getMondayBasedDayIndex(dateObj);

  const lower = f.toLowerCase();
  if (lower === 'daily' || lower === 'every day' || lower === 'everyday') return true;
  if (lower === 'weekdays' || lower === 'weekday') return monBased >= 0 && monBased <= 4;
  if (lower === 'weekends' || lower === 'weekend') return monBased >= 5 && monBased <= 6;
  if (lower.startsWith('custom:')) {
    const days = parseCustomDays(f);
    return days.length === 0 || days.includes(monBased);
  }
  return true;
}

/**
 * Filter habits according to tab view ('Today' | 'All habits' | 'Paused') and reference date.
 * Single consolidated source of truth for habit schedule interpretation.
 */
export function filterHabitsForView(
  habits: Habit[],
  tab: 'Today' | 'All habits' | 'Paused',
  date: Date | string = getLocalDateString()
): Habit[] {
  const safeHabits = (habits || []).filter((h) => !h.deleted_at);

  if (tab === 'Paused') {
    return safeHabits.filter((h) => Boolean(h.is_paused));
  }

  if (tab === 'Today') {
    return safeHabits.filter(
      (h) => !h.is_paused && isHabitDueOnDate(h.frequency, date)
    );
  }

  // 'All habits' includes every active and paused habit
  return safeHabits;
}

/**
 * Generates a concise, user-friendly summary of a habit's frequency schedule.
 */
export function getHabitScheduleSummary(frequency: string): string {
  const f = (frequency || 'Daily').trim();
  const lower = f.toLowerCase();
  if (lower === 'daily') return 'Every day';
  if (lower === 'weekdays') return 'Every weekday';
  if (lower === 'weekends') return 'Every weekend';
  if (lower.startsWith('custom:')) {
    const part = f.slice(7).trim();
    if (!part) return 'Every day';
    const days = part
      .split(',')
      .map(s => parseInt(s.trim(), 10))
      .filter(n => !Number.isNaN(n) && n >= 0 && n <= 6)
      .sort((a, b) => a - b);

    if (days.length === 0 || days.length === 7) return 'Every day';
    if (days.length === 5 && days.every((d, i) => d === i)) return 'Every weekday';
    if (days.length === 2 && days[0] === 5 && days[1] === 6) return 'Every weekend';
    return days.map(d => WEEKDAY_NAMES_SHORT[d]).join(', ');
  }
  return f;
}

/** Consecutive check-in days ending at referenceDate (or yesterday if ref not completed). */
export function calculateHabitStreak(dates: string[], referenceDate?: string): number {
  if (dates.length === 0) return 0;
  const ref = referenceDate ?? getLocalDateString();
  const set = new Set(dates);
  let d = parseLocalDateString(ref);
  if (!set.has(ref)) {
    d.setDate(d.getDate() - 1);
  }
  let streak = 0;
  while (true) {
    const ds = getLocalDateString(d);
    if (set.has(ds)) {
      streak++;
      d.setDate(d.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}

/** Longest run of consecutive calendar days in the completion list. */
export function calculateBestHabitStreak(dates: string[]): number {
  const unique = [...new Set(dates)].sort();
  if (unique.length === 0) return 0;
  let best = 1;
  let current = 1;
  for (let i = 1; i < unique.length; i++) {
    const prev = parseLocalDateString(unique[i - 1]);
    const cur = parseLocalDateString(unique[i]);
    const diffDays = Math.round((cur.getTime() - prev.getTime()) / 86400000);
    if (diffDays === 1) {
      current++;
    } else {
      best = Math.max(best, current);
      current = 1;
    }
  }
  return Math.max(best, current);
}
