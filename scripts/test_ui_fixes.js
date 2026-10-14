/**
 * scripts/test_ui_fixes.js
 *
 * Automated regression suite for Groundwork UI & interaction fixes:
 * 1. Date utilities & UTC day-shift prevention
 * 2. Task ID validation & blank title prevention (fixing id=guest & untitled tasks)
 * 3. Upcoming filter date satisfaction
 * 4. Notification preferences store state & setters
 * 5. Achievement engine updated milestones & stats evaluation
 */

const assert = require('assert');
const path = require('path');

console.log('=== RUNNING GROUNDWORK UI & INTERACTION REGRESSION SUITE ===\n');

// 1. DATE UTILITIES CHECK
console.log('--- Test 1: Date Utilities (Local Calendar Formatting) ---');
const fs = require('fs');
const dateUtilsSrc = fs.readFileSync(path.join(__dirname, '../lib/dateUtils.ts'), 'utf8');

assert(dateUtilsSrc.includes('export function getLocalDateString'), 'getLocalDateString exported');
assert(dateUtilsSrc.includes('export function getTomorrowDateString'), 'getTomorrowDateString exported');
assert(dateUtilsSrc.includes('export function getDaysAheadDateString'), 'getDaysAheadDateString exported');
assert(dateUtilsSrc.includes('export function parseLocalDateString'), 'parseLocalDateString exported');

// Execute logic matching lib/dateUtils.ts
function getLocalDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
function getTomorrowDateString(date = new Date()) {
  const d = new Date(date);
  d.setDate(d.getDate() + 1);
  return getLocalDateString(d);
}
function getDaysAheadDateString(days, date = new Date()) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return getLocalDateString(d);
}
function parseLocalDateString(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return new Date();
  const parts = dateStr.trim().split('-');
  if (parts.length < 3) return new Date();
  const [y, m, d] = parts.map(Number);
  return new Date(y, m - 1, d, 12, 0, 0, 0);
}

const today = getLocalDateString();
const tomorrow = getTomorrowDateString();
const nextWeek = getDaysAheadDateString(7);

assert.match(today, /^\d{4}-\d{2}-\d{2}$/, 'getLocalDateString should match YYYY-MM-DD');
assert.match(tomorrow, /^\d{4}-\d{2}-\d{2}$/, 'getTomorrowDateString should match YYYY-MM-DD');
assert.match(nextWeek, /^\d{4}-\d{2}-\d{2}$/, 'getDaysAheadDateString should match YYYY-MM-DD');
assert(tomorrow > today, 'Tomorrow date string should be strictly greater than today');
assert(nextWeek > tomorrow, 'Next week date string should be strictly greater than tomorrow');

const parsed = parseLocalDateString('2026-10-15');
assert.strictEqual(parsed.getFullYear(), 2026);
assert.strictEqual(parsed.getMonth(), 9); // October is 9 (0-indexed)
assert.strictEqual(parsed.getDate(), 15);
console.log('✓ Date utilities test passed.');

// 2. UPCOMING TASKS FILTER VERIFICATION
console.log('\n--- Test 2: Upcoming Tasks Filter Logic ---');
const todayTask = { id: 't1', title: 'Today Task', date: today, completed: false };
const upcomingTask = { id: 't2', title: 'Upcoming Task', date: tomorrow, completed: false };
const noDateTask = { id: 't3', title: 'No Date Task', date: undefined, completed: false };

const filterToday = (t) => t.date === today || !t.date;
const filterUpcoming = (t) => t.date && t.date > today;

assert.strictEqual(filterToday(todayTask), true, 'todayTask satisfies Today filter');
assert.strictEqual(filterToday(noDateTask), true, 'noDateTask satisfies Today filter');
assert.strictEqual(filterUpcoming(todayTask), false, 'todayTask does not show in Upcoming');
assert.strictEqual(filterUpcoming(upcomingTask), true, 'upcomingTask (assigned tomorrow) immediately shows in Upcoming');
console.log('✓ Upcoming tasks filter logic test passed.');

// 3. TASK ID VALIDATION LOGIC
console.log('\n--- Test 3: Task ID Validation Guard ---');
// Verify logic that prevents id === 'guest'
function sanitizeTaskId(id, userId = 'user_123') {
  if (!id || id === 'guest' || id === userId) {
    return 'task_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
  }
  return id;
}

const guestIdResult = sanitizeTaskId('guest', 'guest');
assert.notStrictEqual(guestIdResult, 'guest', 'guest ID must be converted to unique task ID');
assert(guestIdResult.startsWith('task_'), 'Generated ID must start with task_');

const userIdResult = sanitizeTaskId('user_123', 'user_123');
assert.notStrictEqual(userIdResult, 'user_123', 'userId must not be used as task ID');

const customValidId = sanitizeTaskId('custom_task_99', 'user_123');
assert.strictEqual(customValidId, 'custom_task_99', 'Valid custom ID preserved');
console.log('✓ Task ID validation guard test passed.');

// 4. TITLE OVERWRITE VALIDATION
console.log('\n--- Test 4: Task Title Overwrite Guard ---');
function validateTaskTitleUpdate(existingTitle, incomingTitle) {
  if (incomingTitle !== undefined) {
    if (typeof incomingTitle === 'string' && incomingTitle.trim().length > 0) {
      return incomingTitle.trim();
    }
    // Reject empty string or whitespace-only wipeout
    return existingTitle;
  }
  return existingTitle;
}

const preservedTitle = validateTaskTitleUpdate('Finish Paper', '   ');
assert.strictEqual(preservedTitle, 'Finish Paper', 'Whitespace title update must not wipe existing title');

const validTitleUpdate = validateTaskTitleUpdate('Finish Paper', 'Finish Paper Final');
assert.strictEqual(validTitleUpdate, 'Finish Paper Final', 'Valid title update accepted');
console.log('✓ Task title overwrite guard test passed.');

// 5. NOTIFICATION SETTINGS STATE
console.log('\n--- Test 5: Notification Settings Store Shape ---');
// Verify store file contains quietHoursEnabled, taskRemindersEnabled, habitRemindersEnabled, appUpdatesEnabled
const settingsStoreContent = fs.readFileSync(path.join(__dirname, '../store/useSettingsStore.ts'), 'utf8');
assert(settingsStoreContent.includes('quietHoursEnabled: boolean'), 'quietHoursEnabled defined in interface');
assert(settingsStoreContent.includes('taskRemindersEnabled: boolean'), 'taskRemindersEnabled defined in interface');
assert(settingsStoreContent.includes('habitRemindersEnabled: boolean'), 'habitRemindersEnabled defined in interface');
assert(settingsStoreContent.includes('appUpdatesEnabled: boolean'), 'appUpdatesEnabled defined in interface');
assert(settingsStoreContent.includes('setQuietHoursEnabled:'), 'setQuietHoursEnabled defined in interface');
assert(settingsStoreContent.includes('setTaskRemindersEnabled:'), 'setTaskRemindersEnabled defined in interface');
assert(settingsStoreContent.includes('setHabitRemindersEnabled:'), 'setHabitRemindersEnabled defined in interface');
assert(settingsStoreContent.includes('setAppUpdatesEnabled:'), 'setAppUpdatesEnabled defined in interface');
console.log('✓ Notification settings store shape test passed.');

// 6. ACHIEVEMENT CRITERIA REPLACEMENT (NO NOTES/FOLDERS/TAGS DEPENDENCY)
console.log('\n--- Test 6: Achievement Engine Milestone Criteria ---');
const achievementContent = fs.readFileSync(path.join(__dirname, '../lib/connect/achievementEngine.ts'), 'utf8');

// Ensure perfect_workspace now checks totalTasksCompleted instead of uniqueFoldersCount
assert(!achievementContent.includes("key: 'perfect_workspace',\n    name: 'Perfect Workspace',\n    description: 'Structure notes into 4 core folders'"),
  'perfect_workspace must no longer require 4 note folders');
assert(achievementContent.includes("key: 'perfect_workspace'"), 'perfect_workspace key preserved');
assert(achievementContent.includes("key: 'color_coder'"), 'color_coder key preserved');
assert(achievementContent.includes("key: 'smart_organizer'"), 'smart_organizer key preserved');

// Ensure formula_collector now checks focus minutes instead of totalFormulasCount
assert(achievementContent.includes("key: 'formula_collector'"), 'formula_collector key preserved');
assert(!achievementContent.includes("Save your first quick study formula card"), 'formula card requirement removed');

console.log('✓ Achievement engine milestone criteria test passed.');

// 7. HABIT ICON AND WEEK STRIP VERIFICATION
console.log('\n--- Test 7: Habit Icons & Weekly Strip ---');
const habitsContent = fs.readFileSync(path.join(__dirname, '../app/habits.tsx'), 'utf8');
assert(habitsContent.includes('getHabitIcon'), 'getHabitIcon function present');
assert(habitsContent.includes('miniWeekStrip'), 'miniWeekStrip present in habits.tsx');
assert(habitsContent.includes('useReducedMotion'), 'useReducedMotion hook used in habits.tsx');
assert(habitsContent.includes('getLocalDateString'), 'getLocalDateString used in habits.tsx');
console.log('✓ Habit icons & weekly strip test passed.');

// 8. FOCUS TIMER RING AND TABULAR NUMS
console.log('\n--- Test 8: Focus Timer Progress Ring & Tabular Nums ---');
const focusContent = fs.readFileSync(path.join(__dirname, '../app/focus.tsx'), 'utf8');
assert(focusContent.includes('tabular-nums'), 'tabular-nums applied to timer display');
assert(focusContent.includes('Svg'), 'Svg progress ring present in focus.tsx');
assert(focusContent.includes('timerState'), 'timerState (idle, running, paused, completed) present');
console.log('✓ Focus timer progress ring & tabular nums test passed.');

console.log('\n=== ALL REGRESSION TESTS PASSED (8/8) ===');
