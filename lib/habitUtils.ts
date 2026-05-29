import type { Habit } from '@/lib/db';

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

/** Monday-based day index (0 = Mon) matching AddHabitSheet custom days. */
export function getMondayBasedDayIndex(date: Date = new Date()): number {
  const jsDay = date.getDay();
  return jsDay === 0 ? 6 : jsDay - 1;
}

export function isHabitDueOnDate(frequency: string, date: Date = new Date()): boolean {
  const f = (frequency || 'Daily').trim();
  const monBased = getMondayBasedDayIndex(date);

  if (f === 'Daily' || f.toLowerCase() === 'daily') return true;
  if (f === 'Weekdays') return monBased >= 0 && monBased <= 4;
  if (f === 'Weekends') return monBased >= 5;
  if (f.startsWith('Custom:')) {
    const part = f.slice(7);
    if (!part) return true;
    const days = part.split(',').map(s => parseInt(s, 10)).filter(n => !Number.isNaN(n));
    return days.length === 0 || days.includes(monBased);
  }
  return true;
}

/** Consecutive check-in days ending at referenceDate (or yesterday if ref not completed). */
export function calculateHabitStreak(dates: string[], referenceDate?: string): number {
  if (dates.length === 0) return 0;
  const ref = referenceDate ?? new Date().toISOString().split('T')[0];
  const set = new Set(dates);
  let d = new Date(ref + 'T12:00:00');
  if (!set.has(ref)) {
    d.setDate(d.getDate() - 1);
  }
  let streak = 0;
  while (true) {
    const ds = d.toISOString().split('T')[0];
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
    const prev = new Date(unique[i - 1] + 'T12:00:00');
    const cur = new Date(unique[i] + 'T12:00:00');
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
