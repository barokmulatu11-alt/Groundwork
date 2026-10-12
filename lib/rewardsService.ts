/**
 * RewardsService — milestone unlocks earned by using Groundwork.
 * Replaces paid subscription paywalls with verifiable usage milestones:
 * - Completed tasks
 * - Genuinely completed focus sessions (must have completion timestamp and valid duration)
 * - Distinct-day habit check-ins
 *
 * Core productivity (tasks, habits, study spaces, social links) remains free.
 * Existing paid users retain full permanent access to all rewards.
 * Unlocks are account-scoped, permanently persisted, and cross-device synchronized;
 * deleting or cleaning up completed records NEVER revokes unlocked rewards.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from '@/store/useAuthStore';
import { useStore } from '@/store/useStore';
import { parseHabitDates } from '@/lib/habitUtils';

export type RewardId =
  | 'focus_presets'
  | 'note_security'
  | 'habit_heatmaps'
  | 'note_export'
  | 'deep_analytics'
  | 'premium_themes'
  | 'cloud_vault';

export interface MilestoneRequirement {
  completedTasks?: number;
  focusSessions?: number;
  habitDays?: number;
}

export interface RewardDefinition {
  id: RewardId;
  title: string;
  category: 'Focus' | 'Security' | 'Habits' | 'Notes' | 'Analytics' | 'Appearance' | 'Sync';
  description: string;
  requirement: MilestoneRequirement;
  requirementLabel: string;
}

export const REWARD_DEFINITIONS: RewardDefinition[] = [
  {
    id: 'focus_presets',
    title: 'Custom Focus Presets',
    category: 'Focus',
    description: 'Configure custom focus intervals, short breaks, and long breaks.',
    requirement: { focusSessions: 5 },
    requirementLabel: 'Complete 5 focus sessions',
  },
  {
    id: 'note_security',
    title: 'Note Security',
    category: 'Security',
    description: 'Protect sensitive notes and study guides with biometric authentication.',
    requirement: { completedTasks: 10 },
    requirementLabel: 'Complete 10 tasks',
  },
  {
    id: 'habit_heatmaps',
    title: 'Habit Consistency Heatmaps',
    category: 'Habits',
    description: '90-day GitHub-style visual consistency heatmaps for every habit.',
    requirement: { habitDays: 5 },
    requirementLabel: 'Check in habits on 5 distinct days',
  },
  {
    id: 'note_export',
    title: 'Note Export (PDF & Markdown)',
    category: 'Notes',
    description: 'Export notebooks and study guides to clean PDF and Markdown files.',
    requirement: { completedTasks: 25 },
    requirementLabel: 'Complete 25 tasks',
  },
  {
    id: 'deep_analytics',
    title: 'Deep Analytics & Reports',
    category: 'Analytics',
    description: 'Weekly summaries, productivity forecasts, and spaced repetition schedules.',
    requirement: { focusSessions: 10, habitDays: 10 },
    requirementLabel: 'Complete 10 focus sessions and 10 habit check-in days',
  },
  {
    id: 'premium_themes',
    title: 'Premium Themes',
    category: 'Appearance',
    description: 'Access the full suite of OLED Obsidian, Midnight, Sunset, and ambient themes.',
    requirement: { completedTasks: 30, focusSessions: 15 },
    requirementLabel: 'Complete 30 tasks and 15 focus sessions',
  },
  {
    id: 'cloud_vault',
    title: 'Automated Cloud Vault',
    category: 'Sync',
    description: 'Automated background cloud synchronization and cloud snapshots.',
    requirement: { completedTasks: 40, habitDays: 14 },
    requirementLabel: 'Complete 40 tasks and 14 habit check-in days',
  },
];

export interface UserProgress {
  completedTasks: number;
  focusSessions: number;
  habitDays: number;
}

// In-memory fast cache per account
const memoryUnlockedCache = new Map<string, Set<RewardId>>();
const memoryHighwaterCache = new Map<string, UserProgress>();
const memoryLegacyPaidCache = new Map<string, boolean>();

// In-flight initialization guard to prevent race conditions
const initPromiseMap = new Map<string, Promise<void>>();
const initializedAccounts = new Set<string>();

/** Check if account rewards have completed initialization from durable storage/cloud */
export function isAccountRewardsInitialized(userId: string): boolean {
  return initializedAccounts.has(userId);
}

function getStorageKeys(userId: string) {
  return {
    unlockedKey: `groundwork_unlocked_rewards_${userId}`,
    highwaterKey: `groundwork_milestone_highwater_${userId}`,
    celebratedKey: `groundwork_celebrated_rewards_${userId}`,
    legacyPaidKey: `groundwork_legacy_paid_${userId}`,
  };
}

/** Check if the current user has an existing paid entitlement (permanently preserved) */
export function isExistingPaidUser(): boolean {
  const { profile, session } = useAuthStore.getState();
  const userId = session?.user?.id;

  // Guest users never have paid entitlements
  if (!userId || userId === 'guest') {
    return false;
  }

  // Check in-memory cache
  if (memoryLegacyPaidCache.get(userId) === true) {
    return true;
  }

  // Check active profile/session
  const isPaidActive =
    profile?.pro_status === true ||
    session?.user?.user_metadata?.is_pro === true ||
    (profile?.role && profile.role === 'pro');

  if (isPaidActive) {
    memoryLegacyPaidCache.set(userId, true);
    // Asynchronously write permanent entitlement flag
    const { legacyPaidKey } = getStorageKeys(userId);
    AsyncStorage.setItem(legacyPaidKey, 'true').catch(() => {});
    return true;
  }

  return false;
}

// Offline cloud synchronization queue
const pendingCloudSyncUsers = new Set<string>();

export function markRewardSyncPending(userId: string) {
  if (userId && userId !== 'guest') {
    pendingCloudSyncUsers.add(userId);
  }
}

/**
 * Synchronizes account-scoped rewards with the database profiles.settings.
 * - Reads profiles.settings and pro_status
 * - Permanently merges unlocks from local cache and remote
 * - Merges milestone highwater marks
 * - Preserves unrelated settings
 * - Propagates database errors
 */
export async function syncRewardsToCloud(userId: string): Promise<void> {
  if (!userId || userId === 'guest') return;

  const { atomicUpdateProfileSettings } = await import('@/lib/profileSettingsService');

  let userUnlocked = memoryUnlockedCache.get(userId) || new Set<RewardId>();
  let highwater = memoryHighwaterCache.get(userId) || { completedTasks: 0, focusSessions: 0, habitDays: 0 };
  let isPaid = memoryLegacyPaidCache.get(userId) || false;

  const result = await atomicUpdateProfileSettings(userId, (existingSettings, profileRow) => {
    if (profileRow?.pro_status) {
      isPaid = true;
      memoryLegacyPaidCache.set(userId, true);
    }

    const remoteUnlocks: RewardId[] = Array.isArray(existingSettings.unlocked_rewards) ? existingSettings.unlocked_rewards : [];
    remoteUnlocks.forEach((r) => userUnlocked.add(r));

    const remoteHw = existingSettings.milestone_highwater || {};
    highwater = {
      completedTasks: Math.max(highwater.completedTasks, remoteHw.completedTasks || 0),
      focusSessions: Math.max(highwater.focusSessions, remoteHw.focusSessions || 0),
      habitDays: Math.max(highwater.habitDays, remoteHw.habitDays || 0),
    };

    memoryUnlockedCache.set(userId, userUnlocked);
    memoryHighwaterCache.set(userId, highwater);

    const directUpdates: Record<string, any> = {};
    if (isPaid && !profileRow?.pro_status) {
      directUpdates.pro_status = true;
    }

    return {
      directUpdates,
      settingsUpdates: {
        unlocked_rewards: Array.from(userUnlocked),
        milestone_highwater: highwater,
      },
    };
  });

  if (result.settings) {
    pendingCloudSyncUsers.delete(userId);
  }
}

export async function retryPendingRewardSyncs(): Promise<void> {
  if (pendingCloudSyncUsers.size === 0) return;
  const users = Array.from(pendingCloudSyncUsers);
  for (const uid of users) {
    try {
      await syncRewardsToCloud(uid);
    } catch (_) {
      // Still offline, will retry later
    }
  }
}

if (typeof window !== 'undefined' && window.addEventListener) {
  window.addEventListener('online', () => {
    retryPendingRewardSyncs().catch(() => {});
  });
}

/**
 * Initialize cached account-scoped rewards from persistent storage and cross-device cloud sync.
 * Prevents race conditions by caching the in-flight initialization promise.
 * Permanent unlock merging ensures unlocks from any device are preserved forever.
 */
export async function initializeAccountRewards(userId: string, forceRefresh: boolean = false): Promise<void> {
  if (!forceRefresh && initPromiseMap.has(userId)) {
    return initPromiseMap.get(userId)!;
  }

  const promise = (async () => {
    const { unlockedKey, highwaterKey, legacyPaidKey } = getStorageKeys(userId);

    try {
      const [storedUnlocked, storedHighwater, storedLegacyPaid] = await Promise.all([
        AsyncStorage.getItem(unlockedKey),
        AsyncStorage.getItem(highwaterKey),
        AsyncStorage.getItem(legacyPaidKey),
      ]);

      let userUnlocked = memoryUnlockedCache.get(userId) || new Set<RewardId>();
      if (storedUnlocked) {
        try {
          const parsed: RewardId[] = JSON.parse(storedUnlocked);
          parsed.forEach((id) => userUnlocked.add(id));
        } catch (_) {}
      }

      let highwater: UserProgress = memoryHighwaterCache.get(userId) || {
        completedTasks: 0,
        focusSessions: 0,
        habitDays: 0,
      };

      if (storedHighwater) {
        try {
          const parsed: UserProgress = JSON.parse(storedHighwater);
          highwater = {
            completedTasks: Math.max(highwater.completedTasks, parsed.completedTasks || 0),
            focusSessions: Math.max(highwater.focusSessions, parsed.focusSessions || 0),
            habitDays: Math.max(highwater.habitDays, parsed.habitDays || 0),
          };
        } catch (_) {}
      }

      const activeProfile = useAuthStore.getState().profile;
      let isPaid =
        memoryLegacyPaidCache.get(userId) === true ||
        storedLegacyPaid === 'true' ||
        activeProfile?.pro_status === true ||
        activeProfile?.role === 'pro';

      // ─── Cross-Device Cloud Synchronization & Permanent Merge ───────────────
      if (userId !== 'guest') {
        try {
          await syncRewardsToCloud(userId);
        } catch (syncErr) {
          console.warn('[RewardsService] Cross-device sync error (offline?):', syncErr);
          markRewardSyncPending(userId);
        }
      }

      if (isPaid) {
        memoryLegacyPaidCache.set(userId, true);
        AsyncStorage.setItem(legacyPaidKey, 'true').catch(() => {});
      }

      memoryUnlockedCache.set(userId, userUnlocked);
      memoryHighwaterCache.set(userId, highwater);

      // Save merged local state
      await AsyncStorage.setItem(unlockedKey, JSON.stringify(Array.from(userUnlocked))).catch(() => {});
      await AsyncStorage.setItem(highwaterKey, JSON.stringify(highwater)).catch(() => {});
      
      // Mark initialized successfully
      initializedAccounts.add(userId);
    } catch (e) {
      console.warn('[RewardsService] Failed to load stored rewards:', e);
      initializedAccounts.add(userId);
    } finally {
      initPromiseMap.delete(userId);
    }
  })();

  initPromiseMap.set(userId, promise);
  return promise;
}

/** Ensure rewards for current or specified user are fully initialized */
export async function ensureRewardsInitialized(targetUserId?: string): Promise<void> {
  const userId = targetUserId || useAuthStore.getState().session?.user?.id || 'guest';
  await initializeAccountRewards(userId);
  retryPendingRewardSyncs().catch(() => {});
}

/**
 * Validates genuine focus session completion semantics:
 * - Must have valid completed_at timestamp (excludes undefined, null, empty string, or corrupted literals)
 * - Must have positive duration between 1 and 1439 minutes
 * - Must not be marked as deleted
 * - Must exclude partial, cancelled, aborted, or reset sessions
 */
export function isSessionGenuinelyCompleted(s: any): boolean {
  if (!s || typeof s !== 'object') return false;
  if (s.deleted_at) return false;

  const completedAt = s.completed_at;
  if (
    !completedAt ||
    typeof completedAt !== 'string' ||
    completedAt.trim() === '' ||
    completedAt === 'null' ||
    completedAt === 'undefined' ||
    completedAt === '[]' ||
    completedAt === '{}'
  ) {
    return false;
  }

  const duration = Number(s.duration_minutes);
  if (isNaN(duration) || duration < 1 || duration >= 1440) {
    return false;
  }

  const modeStr = String(s.mode || '').toLowerCase();
  if (
    modeStr.includes('partial') ||
    modeStr.includes('cancel') ||
    modeStr.includes('abort') ||
    modeStr.includes('reset')
  ) {
    return false;
  }

  if (s.cancelled === true || s.is_cancelled === true) {
    return false;
  }

  return true;
}

/**
 * Calculates current user progress across completed tasks, genuine focus sessions,
 * and distinct habit days, merged with historical highwater marks so deleting completed
 * records never lowers the user's earned milestone progress.
 */
export function getMilestoneProgress(): UserProgress {
  const state = useStore.getState();
  const userId = useAuthStore.getState().session?.user?.id || 'guest';

  // Live completed tasks
  const liveCompletedTasks = (state.tasks || []).filter(
    (t) => Boolean(t.completed) && !t.deleted_at
  ).length;

  // Genuine focus sessions: strict completion check
  const liveFocusSessions = (state.focusSessions || []).filter(
    (s) => isSessionGenuinelyCompleted(s)
  ).length;

  // Live distinct habit check-in days
  const distinctHabitDates = new Set<string>();
  (state.habits || []).forEach((habit) => {
    if (habit.deleted_at) return;
    const dates = parseHabitDates(habit.dates_completed);
    dates.forEach((d) => distinctHabitDates.add(d));
  });
  const liveHabitDays = distinctHabitDates.size;

  // Merge with historical highwater marks
  const storedHighwater = memoryHighwaterCache.get(userId) || {
    completedTasks: 0,
    focusSessions: 0,
    habitDays: 0,
  };

  const progress: UserProgress = {
    completedTasks: Math.max(liveCompletedTasks, storedHighwater.completedTasks),
    focusSessions: Math.max(liveFocusSessions, storedHighwater.focusSessions),
    habitDays: Math.max(liveHabitDays, storedHighwater.habitDays),
  };

  // If highwater increased and account initialized, update memory & storage asynchronously
  if (
    progress.completedTasks > storedHighwater.completedTasks ||
    progress.focusSessions > storedHighwater.focusSessions ||
    progress.habitDays > storedHighwater.habitDays
  ) {
    memoryHighwaterCache.set(userId, progress);
    if (initializedAccounts.has(userId)) {
      const { highwaterKey } = getStorageKeys(userId);
      AsyncStorage.setItem(highwaterKey, JSON.stringify(progress)).catch(() => {});
    }
  }

  // Check and persist any newly unlocked rewards permanently if initialized
  if (initializedAccounts.has(userId)) {
    persistUnlocksForProgress(userId, progress);
  }

  return progress;
}

/** Evaluates and permanently records any unlocked rewards for the given progress */
function persistUnlocksForProgress(userId: string, progress: UserProgress): void {
  // CRITICAL: Prevent initialization races from overwriting saved unlocks!
  if (!initializedAccounts.has(userId)) {
    return;
  }

  let userUnlocked = memoryUnlockedCache.get(userId);
  if (!userUnlocked) {
    userUnlocked = new Set<RewardId>();
    memoryUnlockedCache.set(userId, userUnlocked);
  }

  let hasNew = false;
  REWARD_DEFINITIONS.forEach((reward) => {
    if (!userUnlocked!.has(reward.id)) {
      if (isRequirementMet(reward.requirement, progress)) {
        userUnlocked!.add(reward.id);
        hasNew = true;
      }
    }
  });

  if (hasNew) {
    const { unlockedKey } = getStorageKeys(userId);
    AsyncStorage.setItem(unlockedKey, JSON.stringify(Array.from(userUnlocked))).catch(() => {});

    // Sync to cloud if authenticated
    if (userId !== 'guest') {
      syncRewardsToCloud(userId).catch(() => {
        markRewardSyncPending(userId);
      });
      retryPendingRewardSyncs().catch(() => {});
    }
  }
}

/** Checks whether a single requirement threshold is fulfilled */
export function isRequirementMet(
  requirement: MilestoneRequirement,
  progress: UserProgress
): boolean {
  if (
    requirement.completedTasks !== undefined &&
    progress.completedTasks < requirement.completedTasks
  ) {
    return false;
  }
  if (
    requirement.focusSessions !== undefined &&
    progress.focusSessions < requirement.focusSessions
  ) {
    return false;
  }
  if (
    requirement.habitDays !== undefined &&
    progress.habitDays < requirement.habitDays
  ) {
    return false;
  }
  return true;
}

/** Returns the progress percentage (0 - 100) toward a milestone */
export function getMilestoneProgressPercent(
  requirement: MilestoneRequirement,
  progress: UserProgress
): number {
  const fractions: number[] = [];

  if (requirement.completedTasks !== undefined && requirement.completedTasks > 0) {
    fractions.push(
      Math.min(1, progress.completedTasks / requirement.completedTasks)
    );
  }
  if (requirement.focusSessions !== undefined && requirement.focusSessions > 0) {
    fractions.push(
      Math.min(1, progress.focusSessions / requirement.focusSessions)
    );
  }
  if (requirement.habitDays !== undefined && requirement.habitDays > 0) {
    fractions.push(
      Math.min(1, progress.habitDays / requirement.habitDays)
    );
  }

  if (fractions.length === 0) return 100;
  const avg = fractions.reduce((a, b) => a + b, 0) / fractions.length;
  return Math.round(avg * 100);
}

/**
 * Checks if a reward is unlocked (paid user or permanently unlocked via milestones).
 * Once unlocked, deleting completed records never revokes the unlock.
 */
export function isRewardUnlocked(rewardId: RewardId): boolean {
  if (isExistingPaidUser()) {
    return true;
  }

  const userId = useAuthStore.getState().session?.user?.id || 'guest';
  const cachedSet = memoryUnlockedCache.get(userId);
  if (cachedSet && cachedSet.has(rewardId)) {
    return true;
  }

  const reward = REWARD_DEFINITIONS.find((r) => r.id === rewardId);
  if (!reward) return false;

  const progress = getMilestoneProgress();
  const unlocked = isRequirementMet(reward.requirement, progress);
  if (unlocked) {
    if (!cachedSet) {
      if (initializedAccounts.has(userId)) {
        const newSet = new Set<RewardId>([rewardId]);
        memoryUnlockedCache.set(userId, newSet);
        const { unlockedKey } = getStorageKeys(userId);
        AsyncStorage.setItem(unlockedKey, JSON.stringify(Array.from(newSet))).catch(() => {});
      }
    } else {
      cachedSet.add(rewardId);
      if (initializedAccounts.has(userId)) {
        const { unlockedKey } = getStorageKeys(userId);
        AsyncStorage.setItem(unlockedKey, JSON.stringify(Array.from(cachedSet))).catch(() => {});
      }
    }
  }

  return unlocked;
}

/** Asynchronous gate check that ensures account rewards are initialized first */
export async function isRewardUnlockedAsync(rewardId: RewardId): Promise<boolean> {
  const userId = useAuthStore.getState().session?.user?.id || 'guest';
  if (!initializedAccounts.has(userId)) {
    await initializeAccountRewards(userId);
  }
  return isRewardUnlocked(rewardId);
}

/** Mark a reward as celebrated locally so the celebration animation only plays once */
export async function markRewardCelebrated(rewardId: RewardId): Promise<void> {
  try {
    const userId = useAuthStore.getState().session?.user?.id || 'guest';
    const { celebratedKey } = getStorageKeys(userId);
    const existingStr = await AsyncStorage.getItem(celebratedKey);
    const set: string[] = existingStr ? JSON.parse(existingStr) : [];
    if (!set.includes(rewardId)) {
      set.push(rewardId);
      await AsyncStorage.setItem(celebratedKey, JSON.stringify(set));
    }
  } catch (e) {
    console.warn('[RewardsService] Failed to mark reward celebrated:', e);
  }
}

/** Check if a reward was already celebrated */
export async function isRewardCelebrated(rewardId: RewardId): Promise<boolean> {
  try {
    const userId = useAuthStore.getState().session?.user?.id || 'guest';
    const { celebratedKey } = getStorageKeys(userId);
    const existingStr = await AsyncStorage.getItem(celebratedKey);
    if (!existingStr) return false;
    const set: string[] = JSON.parse(existingStr);
    return set.includes(rewardId);
  } catch {
    return false;
  }
}
