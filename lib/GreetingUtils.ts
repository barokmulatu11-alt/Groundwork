const MORNING_GREETINGS = [
  'Rise and grind',
  'Fresh start today',
  'Let\'s make today count',
  'Morning momentum',
];

const AFTERNOON_GREETINGS = [
  'Keep the flow going',
  'Afternoon push time',
  'You\'re on a roll',
  'Stay in the zone',
];

const EVENING_GREETINGS = [
  'Finish strong tonight',
  'Evening focus mode',
  'Wrap up with intention',
  'One more push',
];

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function getRandomGreeting(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return pickRandom(MORNING_GREETINGS);
  if (hour >= 12 && hour < 17) return pickRandom(AFTERNOON_GREETINGS);
  return pickRandom(EVENING_GREETINGS);
}

export function getPersonalizedGreeting(options: {
  displayName?: string | null;
  totalStreak?: number;
  tasksCompletedToday?: number;
  tasksTotalToday?: number;
}): string {
  const { headline, subline } = getPersonalizedGreetingParts(options);
  return subline ? `${headline}\n${subline}` : headline;
}

/** Short headline + optional subline so the home header doesn't truncate. */
export function getPersonalizedGreetingParts(options: {
  displayName?: string | null;
  totalStreak?: number;
  tasksCompletedToday?: number;
  tasksTotalToday?: number;
}): { headline: string; subline?: string } {
  const { displayName, totalStreak = 0, tasksCompletedToday = 0, tasksTotalToday = 0 } = options;
  const base = getRandomGreeting();
  const name = displayName?.trim();
  const headline = name ? `${base}, ${name}` : base;

  if (totalStreak >= 7) {
    return { headline, subline: `${totalStreak} streak days 🔥` };
  }
  if (tasksTotalToday > 0 && tasksCompletedToday === tasksTotalToday) {
    return { headline, subline: 'All tasks done today ✨' };
  }
  if (tasksTotalToday > 0 && tasksCompletedToday > 0) {
    return { headline, subline: `${tasksCompletedToday}/${tasksTotalToday} tasks done` };
  }
  return { headline };
}

export function getWeeklyHabitActivity(habits: { dates_completed?: string | string[] }[]): boolean[] {
  const result: boolean[] = [];
  const today = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split('T')[0];
    const active = habits.some((h) => {
      try {
        const raw = h.dates_completed;
        const dates: string[] = typeof raw === 'string' ? JSON.parse(raw || '[]') : Array.isArray(raw) ? raw : [];
        return dates.includes(key);
      } catch {
        return false;
      }
    });
    result.push(active);
  }
  return result;
}
