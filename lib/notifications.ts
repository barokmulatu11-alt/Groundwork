/**
 * GroundWork Notification System — lib/notifications.ts
 * All notification logic lives here. Nothing notification-related exists in screen components.
 */

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// ─── Handler ──────────────────────────────────────────────────────────────────

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// ─── IDs ──────────────────────────────────────────────────────────────────────

export const NOTIFICATION_IDS = {
  TASK_REMINDER:    'task_reminder',
  MORNING_SUMMARY:  'morning_summary',
  AFTERNOON_CHECKIN:'afternoon_checkin',
  EVENING_STREAK:   'evening_streak',
  FOCUS_COMPLETE:   'focus_complete',
  FORGOT_ABOUT_ME:  'forgot_about_me',
  WEEKLY_REPORT:    'weekly_report',
  DAILY_TIP:        'daily_tip',
} as const;

// ─── Preferences ──────────────────────────────────────────────────────────────

const PREFS_KEY = 'groundwork_notification_prefs';
const QUIET_HOURS_KEY = 'groundwork_quiet_hours';

export interface NotificationPreferences {
  allNotifications:  boolean;
  taskReminders:     boolean;
  morningSummary:    boolean;
  afternoonCheckin:  boolean;
  eveningStreak:     boolean;
  focusComplete:     boolean;
  forgotAboutMe:     boolean;
  weeklyReport:      boolean;
  dailyTips:         boolean;
}

export interface QuietHours {
  enabled: boolean;
  fromHour:   number; // 22
  fromMinute: number; // 0
  toHour:     number; // 7
  toMinute:   number; // 0
}

export const DEFAULT_PREFERENCES: NotificationPreferences = {
  allNotifications:  true,
  taskReminders:     true,
  morningSummary:    true,
  afternoonCheckin:  true,
  eveningStreak:     true,
  focusComplete:     true,
  forgotAboutMe:     true,
  weeklyReport:      true,
  dailyTips:         true,
};

export const DEFAULT_QUIET_HOURS: QuietHours = {
  enabled:    true,
  fromHour:   22,
  fromMinute: 0,
  toHour:     7,
  toMinute:   0,
};

export const loadNotificationPreferences = async (): Promise<NotificationPreferences> => {
  try {
    const raw = await AsyncStorage.getItem(PREFS_KEY);
    if (!raw) return DEFAULT_PREFERENCES;
    return { ...DEFAULT_PREFERENCES, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_PREFERENCES;
  }
};

export const saveNotificationPreferences = async (prefs: NotificationPreferences): Promise<void> => {
  try {
    await AsyncStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch (e) {
    console.warn('[Notifs] Failed to save preferences', e);
  }
};

export const loadQuietHours = async (): Promise<QuietHours> => {
  try {
    const raw = await AsyncStorage.getItem(QUIET_HOURS_KEY);
    if (!raw) return DEFAULT_QUIET_HOURS;
    return { ...DEFAULT_QUIET_HOURS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_QUIET_HOURS;
  }
};

export const saveQuietHours = async (qh: QuietHours): Promise<void> => {
  await AsyncStorage.setItem(QUIET_HOURS_KEY, JSON.stringify(qh));
};

// ─── Quiet Hours Guard ────────────────────────────────────────────────────────

/**
 * Returns true if the given hour:minute falls within quiet hours.
 * Handles overnight ranges (e.g. 22:00 → 07:00).
 */
const isInQuietHours = (hour: number, minute: number, qh: QuietHours): boolean => {
  if (!qh.enabled) return false;
  const t = hour * 60 + minute;
  const from = qh.fromHour * 60 + qh.fromMinute;
  const to   = qh.toHour   * 60 + qh.toMinute;
  if (from > to) {
    // overnight range
    return t >= from || t < to;
  }
  return t >= from && t < to;
};

/**
 * Given a desired hour:minute, return the next valid time that is not
 * inside quiet hours. If the time is fine, return it unchanged.
 * Result is { hour, minute }.
 */
const resolveQuietHours = (
  hour: number,
  minute: number,
  qh: QuietHours
): { hour: number; minute: number } => {
  if (!isInQuietHours(hour, minute, qh)) return { hour, minute };
  // Push to end-of-quiet-hours
  return { hour: qh.toHour, minute: qh.toMinute };
};

// ─── Permission Request ───────────────────────────────────────────────────────

export const requestNotificationPermissions = async (): Promise<boolean> => {
  if (!Device.isDevice) {
    console.log('[Notifs] Not a physical device — skipping permission request');
    return false;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('[Notifs] Permission denied');
    return false;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('groundwork', {
      name: 'GroundWork',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#007AFF',
      sound: 'default',
    });
  }

  return true;
};

// Backwards-compatible alias used in existing layout code
export const requestPermissionsAsync = requestNotificationPermissions;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

const safeCancel = async (id: string) => {
  try {
    await Notifications.cancelScheduledNotificationAsync(id);
  } catch {
    // Silently ignore — notification may not exist yet
  }
};

// ─── PART 4: Task Reminders ───────────────────────────────────────────────────

const taskReminderBodies = (name: string, offset: number) => [
  `"${name}" starts in ${offset} minutes. You've got this `,
  `Heads up! "${name}" is coming up in ${offset} minutes`,
  ` Don't forget: "${name}" in ${offset} minutes`,
];

export const scheduleTaskReminder = async (
  taskId: string,
  taskName: string,
  taskTime: Date,
  reminderOffset: number = 15
): Promise<void> => {
  const reminderTime = new Date(taskTime.getTime() - reminderOffset * 60 * 1000);
  if (reminderTime <= new Date()) return;

  const id = `${NOTIFICATION_IDS.TASK_REMINDER}_${taskId}`;
  await safeCancel(id);

  await Notifications.scheduleNotificationAsync({
    identifier: id,
    content: {
      title: ' Task coming up',
      body: pick(taskReminderBodies(taskName, reminderOffset)),
      data: { type: 'task_reminder', taskId },
      sound: 'default',
      color: '#007AFF',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: reminderTime,
      channelId: 'groundwork',
    },
  });
};

export const cancelTaskReminder = async (taskId: string): Promise<void> => {
  await safeCancel(`${NOTIFICATION_IDS.TASK_REMINDER}_${taskId}`);
};

// ─── PART 5: Morning Summary ──────────────────────────────────────────────────

export const scheduleMorningSummary = async (taskCount: number): Promise<void> => {
  await safeCancel(NOTIFICATION_IDS.MORNING_SUMMARY);

  const qh = await loadQuietHours();
  const { hour, minute } = resolveQuietHours(8, 0, qh);

  let body: string;
  if (taskCount === 0) {
    body = "No tasks planned yet. Want to add some? Let's make today count ";
  } else if (taskCount <= 3) {
    body = `You've got ${taskCount} task${taskCount > 1 ? 's' : ''} today. Light day, make it count `;
  } else if (taskCount <= 6) {
    body = `${taskCount} tasks lined up today. Solid plan, let's get moving `;
  } else {
    body = `Big day ahead with ${taskCount} tasks. Stay focused and take it one at a time `;
  }

  await Notifications.scheduleNotificationAsync({
    identifier: NOTIFICATION_IDS.MORNING_SUMMARY,
    content: {
      title: '️ Good morning!',
      body,
      data: { type: 'morning_summary' },
      sound: 'default',
      color: '#007AFF',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
      channelId: 'groundwork',
    },
  });
};

// ─── PART 6: Afternoon Check-in ───────────────────────────────────────────────

const afternoonMessages = [
  { title: ' Focus mode: ON',   body: 'Afternoon slump? Push through. Your future self will thank you.' },
  { title: ' Quick check-in',   body: "How's the day going? Cross off one more task before dinner." },
  { title: ' Stay on track',    body: "You're halfway through the day. Finish strong " },
  { title: ' Fuel up',          body: "Take a 5 minute break, then get back to it. You've got this." },
  { title: ' Task check',       body: "Have you looked at your task list lately? Let's knock something out." },
];

export const scheduleAfternoonCheckin = async (): Promise<void> => {
  await safeCancel(NOTIFICATION_IDS.AFTERNOON_CHECKIN);

  const qh = await loadQuietHours();
  const { hour, minute } = resolveQuietHours(14, 0, qh);
  const msg = pick(afternoonMessages);

  await Notifications.scheduleNotificationAsync({
    identifier: NOTIFICATION_IDS.AFTERNOON_CHECKIN,
    content: {
      title: msg.title,
      body: msg.body,
      data: { type: 'afternoon_checkin' },
      sound: 'default',
      color: '#007AFF',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
      channelId: 'groundwork',
    },
  });
};

// ─── PART 7: Evening Streak Protection ───────────────────────────────────────

export const scheduleEveningStreakProtection = async (currentStreak: number): Promise<void> => {
  await safeCancel(NOTIFICATION_IDS.EVENING_STREAK);
  if (currentStreak === 0) return;

  const qh = await loadQuietHours();
  const { hour, minute } = resolveQuietHours(20, 0, qh);

  let title: string;
  let body: string;

  if (currentStreak >= 30) {
    title = ' Legendary streak alert';
    body  = `${currentStreak} days strong! Don't break it now. Open GroundWork and check in.`;
  } else if (currentStreak >= 14) {
    title = ' Two weeks and counting';
    body  = `${currentStreak} day streak! You're unstoppable. Keep it alive tonight.`;
  } else if (currentStreak >= 7) {
    title = ' One week streak!';
    body  = `${currentStreak} days in a row. You're building something real. Don't stop now.`;
  } else if (currentStreak >= 3) {
    title = ' Streak on the line';
    body  = `${currentStreak} day streak at risk. Open GroundWork and keep it alive!`;
  } else {
    title = ' Keep the streak going';
    body  = `You're on a ${currentStreak} day streak. A quick check-in is all it takes.`;
  }

  await Notifications.scheduleNotificationAsync({
    identifier: NOTIFICATION_IDS.EVENING_STREAK,
    content: {
      title,
      body,
      data: { type: 'evening_streak', streak: currentStreak },
      sound: 'default',
      color: '#FF9500',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
      channelId: 'groundwork',
    },
  });
};

// ─── PART 8: Focus Session Complete ──────────────────────────────────────────

export const scheduleFocusCompleteNotification = async (
  durationMinutes: number,
  taskName?: string
): Promise<void> => {
  await safeCancel(NOTIFICATION_IDS.FOCUS_COMPLETE);

  const completionTime = new Date(Date.now() + durationMinutes * 60 * 1000);
  const messages = [
    {
      title: ' Session complete!',
      body: taskName
        ? `Great work on "${taskName}"! Time for a well-earned break.`
        : 'You crushed that session! Take a quick break.',
    },
    {
      title: ' Focus session done',
      body: `${durationMinutes} minutes of pure focus. That is how it is done `,
    },
    {
      title: ' Session complete!',
      body: 'Another one in the books. Take 5 minutes and then get back to it.',
    },
  ];

  const msg = pick(messages);

  await Notifications.scheduleNotificationAsync({
    identifier: NOTIFICATION_IDS.FOCUS_COMPLETE,
    content: {
      title: msg.title,
      body: msg.body,
      data: { type: 'focus_complete' },
      sound: 'default',
      color: '#34C759',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: completionTime,
      channelId: 'groundwork',
    },
  });
};

export const cancelFocusCompleteNotification = async (): Promise<void> => {
  await safeCancel(NOTIFICATION_IDS.FOCUS_COMPLETE);
};

// ─── PART 9: Forgot About Me ──────────────────────────────────────────────────

const forgotMessages = (streak: number) => [
  { title: ' heyyy you forgot about me',  body: 'Your tasks miss you. Come back and keep the streak alive!' },
  { title: ' It has been a while...',     body: `Your ${streak} day streak is getting cold. Come warm it up.` },
  { title: ' Your streak is freezing',    body: `${streak} days of progress on the line. One check-in is all it takes.` },
  { title: ' GroundWork misses you',      body: 'Your habits and tasks are waiting. Come back and stay consistent.' },
  { title: '️ Streak in danger',          body: `You built a ${streak} day streak. Don't let it disappear now.` },
];

export const scheduleForgotAboutMe = async (currentStreak: number): Promise<void> => {
  await safeCancel(NOTIFICATION_IDS.FORGOT_ABOUT_ME);
  if (currentStreak === 0) return;

  const twoDaysFromNow = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
  const msg = pick(forgotMessages(currentStreak));

  await Notifications.scheduleNotificationAsync({
    identifier: NOTIFICATION_IDS.FORGOT_ABOUT_ME,
    content: {
      title: msg.title,
      body: msg.body,
      data: { type: 'forgot_about_me' },
      sound: 'default',
      color: '#FF3B30',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: twoDaysFromNow,
      channelId: 'groundwork',
    },
  });
};

// ─── PART 10: Weekly Habit Report ─────────────────────────────────────────────

export const scheduleWeeklyHabitReport = async (
  completionRate: number,
  bestStreak: number,
  habitsCompleted: number,
  totalHabits: number
): Promise<void> => {
  await safeCancel(NOTIFICATION_IDS.WEEKLY_REPORT);

  const qh = await loadQuietHours();
  const { hour, minute } = resolveQuietHours(20, 0, qh);

  let title: string;
  let body: string;

  if (completionRate >= 80) {
    title = ' Incredible week!';
    body  = `You completed ${completionRate}% of your habits this week. ${bestStreak} day best streak. You are on fire!`;
  } else if (completionRate >= 50) {
    title = ' Solid week!';
    body  = `${habitsCompleted} of ${totalHabits} habits done this week. ${completionRate}% completion. Keep building!`;
  } else {
    title = ' Weekly check-in';
    body  = `${completionRate}% habit completion this week. Every week is a chance to do better. You've got this.`;
  }

  await Notifications.scheduleNotificationAsync({
    identifier: NOTIFICATION_IDS.WEEKLY_REPORT,
    content: {
      title,
      body,
      data: { type: 'weekly_report' },
      sound: 'default',
      color: '#007AFF',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
      weekday: 1, // Sunday
      hour,
      minute,
      channelId: 'groundwork',
    },
  });
};

// ─── PART 11: Daily Motivational Tip ─────────────────────────────────────────

const dailyTips = [
  { title: ' Study tip',          body: 'Break your study into 25-minute chunks. Your brain retains more with short breaks.' },
  { title: ' Rest reminder',      body: 'Rest is not laziness. It is part of the process. Recharge today.' },
  { title: ' Learning insight',   body: 'Teaching someone else what you learned is the fastest way to remember it.' },
  { title: ' Recovery matters',   body: 'Sleep is when your brain processes everything you learned today. Protect it.' },
  { title: ' Focus tip',          body: 'Single tasking beats multitasking every time. Pick one thing and go deep.' },
  { title: '️ Morning power',      body: 'The first hour of your day sets the tone for everything that follows.' },
  { title: ' Energy management',  body: 'Do your hardest task when your energy is highest. Know your peak hours.' },
  { title: ' Flow state',         body: 'It takes about 23 minutes to reach deep focus after a distraction. Guard your attention.' },
  { title: ' Consistency wins',   body: 'Showing up imperfectly every day beats showing up perfectly once a week.' },
  { title: ' Mental reset',       body: 'Five deep breaths right now. Seriously. Try it. Your focus will thank you.' },
];

export const scheduleDailyTip = async (): Promise<void> => {
  await safeCancel(NOTIFICATION_IDS.DAILY_TIP);

  const qh = await loadQuietHours();
  const randomOffset = Math.floor(Math.random() * 120); // 0–119 minutes in 10am–12pm window
  const rawHour   = 10 + Math.floor(randomOffset / 60);
  const rawMinute = randomOffset % 60;
  const { hour, minute } = resolveQuietHours(rawHour, rawMinute, qh);

  const tip = pick(dailyTips);

  await Notifications.scheduleNotificationAsync({
    identifier: NOTIFICATION_IDS.DAILY_TIP,
    content: {
      title: tip.title,
      body:  tip.body,
      data:  { type: 'daily_tip' },
      sound: 'default',
      color: '#007AFF',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
      channelId: 'groundwork',
    },
  });
};

// ─── PART 12: Notification Tap Handler ───────────────────────────────────────

export const handleNotificationResponse = (
  response: Notifications.NotificationResponse,
  router: any
): void => {
  const data = response.notification.request.content.data as any;
  switch (data?.type) {
    case 'task_reminder':
    case 'morning_summary':
    case 'afternoon_checkin':
      router.push('/tasks');
      break;
    case 'evening_streak':
    case 'weekly_report':
      router.push('/habits');
      break;
    case 'focus_complete':
      router.push('/focus');
      break;
    case 'forgot_about_me':
    case 'daily_tip':
    default:
      router.push('/');
      break;
  }
};

// ─── Cancel All ───────────────────────────────────────────────────────────────

export const cancelAllNotifications = async (): Promise<void> => {
  await Notifications.cancelAllScheduledNotificationsAsync();
};

export const cancelAll = cancelAllNotifications;

// ─── PART 14: Master Initialization ──────────────────────────────────────────

interface WeeklyStats {
  completionRate:   number;
  bestStreak:       number;
  habitsCompleted:  number;
  totalHabits:      number;
}

export const rescheduleAll = async (
  granted: boolean,
  currentStreak: number = 0,
  todayTaskCount: number = 0,
  weeklyStats: WeeklyStats = { completionRate: 0, bestStreak: 0, habitsCompleted: 0, totalHabits: 0 }
): Promise<void> => {
  if (!granted) return;

  const prefs = await loadNotificationPreferences();
  if (!prefs.allNotifications) return;

  const jobs: Promise<void>[] = [];

  if (prefs.morningSummary)   jobs.push(scheduleMorningSummary(todayTaskCount));
  if (prefs.afternoonCheckin) jobs.push(scheduleAfternoonCheckin());
  if (prefs.eveningStreak)    jobs.push(scheduleEveningStreakProtection(currentStreak));
  if (prefs.forgotAboutMe)    jobs.push(scheduleForgotAboutMe(currentStreak));
  if (prefs.weeklyReport) {
    jobs.push(scheduleWeeklyHabitReport(
      weeklyStats.completionRate,
      weeklyStats.bestStreak,
      weeklyStats.habitsCompleted,
      weeklyStats.totalHabits
    ));
  }
  if (prefs.dailyTips) jobs.push(scheduleDailyTip());

  await Promise.allSettled(jobs);
};
