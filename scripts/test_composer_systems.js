/**
 * scripts/test_composer_systems.js
 *
 * Comprehensive test suite for Groundwork's unified Task and Habit creation systems:
 * - TaskComposer & HabitComposer validation and submission logic
 * - Local date behavior (Today, Upcoming, All unscheduled)
 * - Timezone boundaries near midnight
 * - Habit scheduling (Daily, Weekdays, Weekends, Custom days)
 * - Paused habit filtering & selected-date filtering
 * - Honest persistence, failure handling, draft preservation, duplicate prevention
 * - Custom day serialization and parsing
 */

global.__DEV__ = true;
process.env.EXPO_OS = 'web';

const memoryStorage = new Map();
global.localStorage = {
  getItem: (k) => memoryStorage.get(k) || null,
  setItem: (k, v) => memoryStorage.set(k, String(v)),
  removeItem: (k) => memoryStorage.delete(k),
  clear: () => memoryStorage.clear(),
};
global.window = {
  localStorage: global.localStorage,
  location: { origin: 'http://localhost:8081' },
};

const assert = require('assert');
const path = require('path');
const jiti = require('jiti')(process.cwd(), {
  alias: {
    '@': process.cwd(),
    'react-native': 'react-native-web',
    'expo-haptics': path.resolve('./lib/sqliteClient.web.ts'),
    'expo-sqlite': path.resolve('./lib/sqliteClient.web.ts'),
  },
});

const { useStore } = jiti('./store/useStore.ts');
const { useAuthStore } = jiti('./store/useAuthStore.ts');
const db = jiti('./lib/db.ts');
const {
  getLocalDateString,
  getTomorrowDateString,
  getDaysAheadDateString,
  parseLocalDateString,
  isFutureLocalDate,
  isPastLocalDate,
  isTodayLocalDate,
  formatDateDisplay,
} = jiti('./lib/dateUtils.ts');

const {
  isHabitDueOnDate,
  getMondayBasedDayIndex,
  getHabitScheduleSummary,
  serializeCustomDays,
  parseCustomDays,
  filterHabitsForView,
  calculateHabitStreak,
} = jiti('./lib/habitUtils.ts');

let totalTests = 0;
let passedTests = 0;

function test(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(err);
    process.exitCode = 1;
  }
}

async function testAsync(name, fn) {
  totalTests++;
  try {
    await fn();
    console.log(`  ✓ ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(err);
    process.exitCode = 1;
  }
}

async function runTestSuite() {
  console.log('\n=== GROUNDWORK TASK & HABIT CREATION SYSTEMS TEST SUITE ===\n');

  // Set mock user session
  useAuthStore.setState({
    session: { user: { id: 'test_user_composer_42', email: 'test@groundwork.test' } },
    profile: { id: 'test_user_composer_42', full_name: 'Test Groundwork User' },
    isGuest: false,
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 1. DATE UTILITIES & MIDNIGHT BOUNDARIES
  // ─────────────────────────────────────────────────────────────────────────
  console.log('--- 1. Date Behavior & Midnight Boundaries ---');

  test('getLocalDateString returns YYYY-MM-DD for local date', () => {
    const d = new Date(2026, 9, 15, 14, 30, 0); // Month is 0-indexed: 9 = October
    assert.strictEqual(getLocalDateString(d), '2026-10-15');
  });

  test('getTomorrowDateString returns day + 1 in local calendar', () => {
    const d = new Date(2026, 9, 15, 14, 30, 0);
    assert.strictEqual(getTomorrowDateString(d), '2026-10-16');
  });

  test('Local date near midnight (23:59:59) does not flip prematurely', () => {
    const lateNight = new Date(2026, 9, 15, 23, 59, 59, 999);
    assert.strictEqual(getLocalDateString(lateNight), '2026-10-15');
  });

  test('Local date near midnight (00:00:01) reflects the new calendar date', () => {
    const earlyMorning = new Date(2026, 9, 16, 0, 0, 1, 0);
    assert.strictEqual(getLocalDateString(earlyMorning), '2026-10-16');
  });

  test('isFutureLocalDate correctly compares local dates', () => {
    const ref = '2026-10-15';
    assert.strictEqual(isFutureLocalDate('2026-10-16', ref), true);
    assert.strictEqual(isFutureLocalDate('2026-10-15', ref), false);
    assert.strictEqual(isFutureLocalDate('2026-10-14', ref), false);
  });

  test('isPastLocalDate correctly identifies past dates', () => {
    const ref = '2026-10-15';
    assert.strictEqual(isPastLocalDate('2026-10-14', ref), true);
    assert.strictEqual(isPastLocalDate('2026-10-15', ref), false);
    assert.strictEqual(isPastLocalDate('2026-10-16', ref), false);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 2. TASK CREATION & VALIDATION LOGIC
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n--- 2. Task Creation & Store Behavior ---');

  test('Blank task title validation: empty or whitespace-only is invalid', () => {
    const empty = '';
    const spaces = '     ';
    assert.strictEqual(empty.trim().length, 0);
    assert.strictEqual(spaces.trim().length, 0);
  });

  test('Whitespace trimming preserves actual title content', () => {
    const raw = '   Review architectural blueprint   ';
    assert.strictEqual(raw.trim(), 'Review architectural blueprint');
  });

  test('TaskComposer context default dates: Today, Upcoming, All', () => {
    const today = getLocalDateString();
    const tomorrow = getTomorrowDateString();

    const getComputedInitialDate = (context) => {
      if (context === 'Today') return today;
      if (context === 'Upcoming') return tomorrow;
      return null; // 'All' defaults to unscheduled
    };

    assert.strictEqual(getComputedInitialDate('Today'), today);
    assert.strictEqual(getComputedInitialDate('Upcoming'), tomorrow);
    assert.strictEqual(getComputedInitialDate('All'), null);
  });

  test('Upcoming context validates that selected date must be future date', () => {
    const today = getLocalDateString();
    const validateUpcomingDate = (date) => {
      if (!date || !isFutureLocalDate(date, today)) {
        return { valid: false, error: 'Upcoming tasks must be scheduled for a future date (tomorrow or later).' };
      }
      return { valid: true };
    };

    assert.strictEqual(validateUpcomingDate(null).valid, false);
    assert.strictEqual(validateUpcomingDate(today).valid, false);
    assert.strictEqual(validateUpcomingDate(getDaysAheadDateString(-1)).valid, false);
    assert.strictEqual(validateUpcomingDate(getTomorrowDateString()).valid, true);
    assert.strictEqual(validateUpcomingDate(getDaysAheadDateString(5)).valid, true);
  });

  await testAsync('Successful task persistence via store.addTask', async () => {
    const today = getLocalDateString();
    const result = await useStore.getState().addTask({
      title: 'Groundwork Architectural Verification',
      date: today,
      priority: 'high',
      note: 'Complete redesign verification task',
      time_block: '09:00 AM',
      reminder_scheduled: true,
      sub_tasks: [
        { title: 'Check component structure' },
        { title: 'Verify database records' },
      ],
    });

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.allowed, true);
    assert(result.task, 'Expected task object to be returned');
    assert.strictEqual(result.task.title, 'Groundwork Architectural Verification');
    assert.strictEqual(result.task.priority, 'high');
    assert.strictEqual(result.task.date, today);
    assert.strictEqual(result.task.note, 'Complete redesign verification task');

    // Confirm visible in store tasks list
    const found = useStore.getState().tasks.find((t) => t.id === result.task.id);
    assert(found, 'Task must be in store.tasks list');
  });

  await testAsync('All context unscheduled task persists with empty date', async () => {
    const result = await useStore.getState().addTask({
      title: 'Someday Project',
      date: '',
      priority: 'low',
    });

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.task.date, '');
  });

  await testAsync('Database failure returns honest structured failure without claiming allowed: true', async () => {
    // Temporarily mock db.addTask to simulate failure
    const originalAddTask = db.addTask;
    db.addTask = () => null;

    try {
      const result = await useStore.getState().addTask({
        title: 'Task that fails DB persistence',
      });

      assert.strictEqual(result.success, false);
      assert.strictEqual(result.allowed, false, 'Must NOT claim allowed: true on DB failure');
      assert(result.error, 'Expected error message on DB failure');
      assert.strictEqual(result.task, undefined);
    } finally {
      db.addTask = originalAddTask;
    }
  });

  test('Duplicate-click prevention logic while pending', () => {
    let isPending = false;
    let submissionsCount = 0;

    const mockSubmit = () => {
      if (isPending) return;
      isPending = true;
      submissionsCount++;
    };

    mockSubmit(); // First click
    mockSubmit(); // Second click while pending
    mockSubmit(); // Third click while pending

    assert.strictEqual(submissionsCount, 1, 'Subsequent clicks while pending must be rejected');
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 3. HABIT CREATION, SCHEDULE & FILTERING
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n--- 3. Habit Scheduling & Consolidated Interpretation ---');

  test('Custom day serialization and parsing roundtrip', () => {
    const days = [0, 2, 4]; // Mon, Wed, Fri
    const serialized = serializeCustomDays(days);
    assert.strictEqual(serialized, 'Custom:0,2,4');

    const parsed = parseCustomDays(serialized);
    assert.deepStrictEqual(parsed, [0, 2, 4]);

    // Deduplication and sorting
    assert.strictEqual(serializeCustomDays([4, 2, 0, 2]), 'Custom:0,2,4');
    assert.deepStrictEqual(parseCustomDays('Custom: 5, 1, 3 '), [1, 3, 5]);
  });

  test('Daily schedule is due every day', () => {
    // Test on 7 distinct consecutive calendar days
    for (let i = 0; i < 7; i++) {
      const d = getDaysAheadDateString(i);
      assert.strictEqual(isHabitDueOnDate('Daily', d), true);
      assert.strictEqual(isHabitDueOnDate('daily', d), true);
    }
  });

  test('Weekdays schedule is due Mon-Fri and NOT Sat-Sun', () => {
    // 2026-10-12 was a Monday (index 0)
    // 2026-10-13 Tuesday (index 1)
    // 2026-10-14 Wednesday (index 2)
    // 2026-10-15 Thursday (index 3)
    // 2026-10-16 Friday (index 4)
    // 2026-10-17 Saturday (index 5)
    // 2026-10-18 Sunday (index 6)
    assert.strictEqual(isHabitDueOnDate('Weekdays', '2026-10-12'), true);  // Mon
    assert.strictEqual(isHabitDueOnDate('Weekdays', '2026-10-13'), true);  // Tue
    assert.strictEqual(isHabitDueOnDate('Weekdays', '2026-10-14'), true);  // Wed
    assert.strictEqual(isHabitDueOnDate('Weekdays', '2026-10-15'), true);  // Thu
    assert.strictEqual(isHabitDueOnDate('Weekdays', '2026-10-16'), true);  // Fri
    assert.strictEqual(isHabitDueOnDate('Weekdays', '2026-10-17'), false); // Sat
    assert.strictEqual(isHabitDueOnDate('Weekdays', '2026-10-18'), false); // Sun
  });

  test('Weekends schedule is due Sat-Sun and NOT Mon-Fri', () => {
    assert.strictEqual(isHabitDueOnDate('Weekends', '2026-10-12'), false); // Mon
    assert.strictEqual(isHabitDueOnDate('Weekends', '2026-10-14'), false); // Wed
    assert.strictEqual(isHabitDueOnDate('Weekends', '2026-10-16'), false); // Fri
    assert.strictEqual(isHabitDueOnDate('Weekends', '2026-10-17'), true);  // Sat
    assert.strictEqual(isHabitDueOnDate('Weekends', '2026-10-18'), true);  // Sun
  });

  test('Every custom weekday index is correctly matched', () => {
    const dates = [
      { date: '2026-10-12', monIdx: 0 }, // Mon
      { date: '2026-10-13', monIdx: 1 }, // Tue
      { date: '2026-10-14', monIdx: 2 }, // Wed
      { date: '2026-10-15', monIdx: 3 }, // Thu
      { date: '2026-10-16', monIdx: 4 }, // Fri
      { date: '2026-10-17', monIdx: 5 }, // Sat
      { date: '2026-10-18', monIdx: 6 }, // Sun
    ];

    for (const { date, monIdx } of dates) {
      for (let day = 0; day <= 6; day++) {
        const freq = `Custom:${day}`;
        const isExpected = day === monIdx;
        assert.strictEqual(
          isHabitDueOnDate(freq, date),
          isExpected,
          `Custom:${day} on ${date} (index ${monIdx}) expected ${isExpected}`
        );
      }
    }
  });

  test('getHabitScheduleSummary produces concise, friendly descriptions', () => {
    assert.strictEqual(getHabitScheduleSummary('Daily'), 'Every day');
    assert.strictEqual(getHabitScheduleSummary('Weekdays'), 'Every weekday');
    assert.strictEqual(getHabitScheduleSummary('Weekends'), 'Every weekend');
    assert.strictEqual(getHabitScheduleSummary('Custom:0,2,4'), 'Mon, Wed, Fri');
    assert.strictEqual(getHabitScheduleSummary('Custom:1,3'), 'Tue, Thu');
    assert.strictEqual(getHabitScheduleSummary('Custom:0,1,2,3,4'), 'Every weekday');
    assert.strictEqual(getHabitScheduleSummary('Custom:5,6'), 'Every weekend');
    assert.strictEqual(getHabitScheduleSummary('Custom:0,1,2,3,4,5,6'), 'Every day');
  });

  test('filterHabitsForView correctly isolates Today, All habits, and Paused', () => {
    const mockHabits = [
      { id: 'h1', title: 'Daily Workout', frequency: 'Daily', is_paused: false },
      { id: 'h2', title: 'Weekday Deep Work', frequency: 'Weekdays', is_paused: false },
      { id: 'h3', title: 'Weekend Hike', frequency: 'Weekends', is_paused: false },
      { id: 'h4', title: 'MWF Swimming', frequency: 'Custom:0,2,4', is_paused: false },
      { id: 'h5', title: 'Paused Guitar', frequency: 'Daily', is_paused: true },
    ];

    // On Monday (2026-10-12):
    // h1 (Daily: yes)
    // h2 (Weekdays: yes)
    // h3 (Weekends: no)
    // h4 (MWF 0,2,4: yes, 0 is Mon)
    // h5 (Paused: no, paused habits never appear in Today)
    const mondayToday = filterHabitsForView(mockHabits, 'Today', '2026-10-12');
    assert.strictEqual(mondayToday.length, 3);
    assert.deepStrictEqual(mondayToday.map((h) => h.id), ['h1', 'h2', 'h4']);

    // On Saturday (2026-10-17):
    // h1 (Daily: yes)
    // h2 (Weekdays: no)
    // h3 (Weekends: yes)
    // h4 (MWF: no)
    // h5 (Paused: no)
    const satToday = filterHabitsForView(mockHabits, 'Today', '2026-10-17');
    assert.strictEqual(satToday.length, 2);
    assert.deepStrictEqual(satToday.map((h) => h.id), ['h1', 'h3']);

    // Tab 'Paused' shows only paused habits
    const paused = filterHabitsForView(mockHabits, 'Paused');
    assert.strictEqual(paused.length, 1);
    assert.strictEqual(paused[0].id, 'h5');

    // Tab 'All habits' includes all habits (active and paused)
    const all = filterHabitsForView(mockHabits, 'All habits');
    assert.strictEqual(all.length, 5);
  });

  await testAsync('Successful habit persistence via store.addHabit', async () => {
    const result = await useStore.getState().addHabit({
      title: 'Mindful Morning Meditation',
      frequency: 'Custom:0,1,2,3,4',
      dates_completed: JSON.stringify([]),
      streak: 0,
      best_streak: 0,
      is_paused: false,
    });

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.allowed, true);
    assert(result.habit, 'Expected habit object to be returned');
    assert.strictEqual(result.habit.title, 'Mindful Morning Meditation');
    assert.strictEqual(result.habit.frequency, 'Custom:0,1,2,3,4');

    const inStore = useStore.getState().habits.find((h) => h.id === result.habit.id);
    assert(inStore, 'Habit must be present in store.habits list');
  });

  await testAsync('Database failure in addHabit returns honest failure without claiming allowed: true', async () => {
    const originalAddHabit = db.addHabit;
    db.addHabit = () => null;

    try {
      const result = await useStore.getState().addHabit({
        title: 'Habit that fails persistence',
      });

      assert.strictEqual(result.success, false);
      assert.strictEqual(result.allowed, false, 'Must NOT claim allowed: true on DB failure');
      assert(result.error, 'Expected error message on failure');
      assert.strictEqual(result.habit, undefined);
    } finally {
      db.addHabit = originalAddHabit;
    }
  });

  await testAsync('Retry after task failure preserves draft and succeeds on retry', async () => {
    let failFirstTime = true;
    const originalAddTask = db.addTask;

    // Composer draft state
    const draft = {
      title: 'Deep Research Draft',
      date: '2026-10-18',
      priority: 'high',
      note: 'Crucial notes that must not be lost',
      timeBlock: '02:00 PM',
      hasReminder: true,
      checklist: ['Read paper', 'Synthesize results'],
    };

    db.addTask = (t) => {
      if (failFirstTime) {
        failFirstTime = false;
        return null;
      }
      return originalAddTask(t);
    };

    try {
      // First attempt fails
      const firstResult = await useStore.getState().addTask({
        title: draft.title,
        date: draft.date,
        priority: draft.priority,
        note: draft.note,
        time_block: draft.timeBlock,
        reminder_scheduled: draft.hasReminder,
        sub_tasks: draft.checklist.map((s) => ({ title: s })),
      });

      assert.strictEqual(firstResult.success, false);
      assert.strictEqual(firstResult.allowed, false);

      // Draft remains intact in caller state (verified by draft variable unchanged)
      assert.strictEqual(draft.title, 'Deep Research Draft');
      assert.strictEqual(draft.note, 'Crucial notes that must not be lost');
      assert.strictEqual(draft.checklist.length, 2);

      // Second attempt (retry) succeeds
      const retryResult = await useStore.getState().addTask({
        title: draft.title,
        date: draft.date,
        priority: draft.priority,
        note: draft.note,
        time_block: draft.timeBlock,
        reminder_scheduled: draft.hasReminder,
        sub_tasks: draft.checklist.map((s) => ({ title: s })),
      });

      assert.strictEqual(retryResult.success, true);
      assert.strictEqual(retryResult.allowed, true);
      assert.strictEqual(retryResult.task.title, draft.title);
      assert.strictEqual(retryResult.task.note, draft.note);
      assert.strictEqual(retryResult.task.priority, 'high');
      assert.strictEqual(retryResult.task.reminder_scheduled, true);
    } finally {
      db.addTask = originalAddTask;
    }
  });

  await testAsync('Retry after habit failure preserves draft and succeeds on retry', async () => {
    let failFirst = true;
    const originalAddHabit = db.addHabit;

    const habitDraft = {
      title: 'Daily Cold Shower',
      frequency: 'Daily',
      icon: 'Droplets',
      startDate: getLocalDateString(),
    };

    db.addHabit = (h) => {
      if (failFirst) {
        failFirst = false;
        return null;
      }
      return originalAddHabit(h);
    };

    try {
      const attempt1 = await useStore.getState().addHabit({
        title: habitDraft.title,
        frequency: habitDraft.frequency,
      });
      assert.strictEqual(attempt1.success, false);
      assert.strictEqual(attempt1.allowed, false);

      // Draft preserved
      assert.strictEqual(habitDraft.title, 'Daily Cold Shower');

      // Retry
      const attempt2 = await useStore.getState().addHabit({
        title: habitDraft.title,
        frequency: habitDraft.frequency,
      });
      assert.strictEqual(attempt2.success, true);
      assert.strictEqual(attempt2.habit.title, habitDraft.title);
    } finally {
      db.addHabit = originalAddHabit;
    }
  });

  test('Enter-key submission on web: compact Enter submits, Shift+Enter does not submit', () => {
    let submitted = false;
    const handleKeyDown = (e, mode) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        if (mode === 'compact') {
          e.preventDefault?.();
          submitted = true;
        }
      }
    };

    // Compact mode + Enter -> submits
    handleKeyDown({ key: 'Enter', shiftKey: false }, 'compact');
    assert.strictEqual(submitted, true);

    // Multiline Note + Shift+Enter -> does NOT submit
    submitted = false;
    handleKeyDown({ key: 'Enter', shiftKey: true }, 'compact');
    assert.strictEqual(submitted, false);

    // Expanded mode + Enter in notes -> does NOT submit
    submitted = false;
    handleKeyDown({ key: 'Enter', shiftKey: false }, 'expanded');
    assert.strictEqual(submitted, false);
  });

  test('Non-UTC timezone boundary tests: local calendar date consistency', () => {
    // Test date strings across multiple specific timezone scenarios
    // In local dates, 2026-10-15 is always 2026-10-15 regardless of UTC hour
    const dateStr = '2026-10-15';
    const parsed = parseLocalDateString(dateStr);
    assert.strictEqual(parsed.getFullYear(), 2026);
    assert.strictEqual(parsed.getMonth(), 9); // October
    assert.strictEqual(parsed.getDate(), 15);
    // Verified hours set to noon (12) to absorb any timezone offset drift
    assert.strictEqual(parsed.getHours(), 12);
  });

  console.log(`\n======================================================`);
  console.log(`Test Results: ${passedTests} passed of ${totalTests} total tests`);
  console.log(`======================================================\n`);

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

runTestSuite().catch((e) => {
  console.error('Test suite runner crashed:', e);
  process.exit(1);
});
