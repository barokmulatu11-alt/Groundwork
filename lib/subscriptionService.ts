/**
 * SubscriptionService — centralized Pro access control for Groundwork.
 *
 * Every premium feature MUST call isPro() or a limit-check from this file.
 * Never rely solely on UI hiding.
 */

import { neonData as supabase } from '@/lib/neon';
import { useAuthStore } from '@/store/useAuthStore';
import { useStore } from '@/store/useStore';

// ─── Core Productivity Limits: Unconditional Free Access ────────────────────────

export const FREE_LIMITS = {
  TASKS_LIFETIME: Infinity,
  HABITS: Infinity,
  STUDY_SPACES: Infinity,
  SOCIAL_LINKS: Infinity,
} as const;

// ─── Core ──────────────────────────────────────────────────────────────────────

import {
  isExistingPaidUser,
  isRewardUnlocked,
  REWARD_DEFINITIONS,
  RewardId,
} from '@/lib/rewardsService';

/**
 * Returns true if the user has unlocked all premium features (via past purchase or milestones).
 * Preserves access for existing paid users.
 */
export function isPro(): boolean {
  if (isExistingPaidUser()) return true;

  // If all milestone rewards are earned, user has full Pro-level capability
  return REWARD_DEFINITIONS.every((reward) => isRewardUnlocked(reward.id));
}

export type Plan = 'free' | 'pro';

export function getPlan(): Plan {
  return isPro() ? 'pro' : 'free';
}

/** Re-fetches the profile from Supabase to pick up fresh pro_status. */
export async function refreshSubscription(): Promise<void> {
  const { session, setProfile } = useAuthStore.getState();
  if (!session?.user?.id) return;

  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', session.user.id)
    .single();

  if (data) setProfile(data);
}

/** Legacy no-op stubs */
export async function subscribe(_plan: 'pro_1month' | 'pro_1year'): Promise<void> {
  return;
}

export async function restorePurchases(): Promise<void> {
  await refreshSubscription();
}

// ─── Feature gate helpers ───────────────────────────────────────────────────────

export interface GateResult {
  allowed: boolean;
  reason?: string;
  limit?: number;
  current?: number;
  rewardId?: RewardId;
}

/** Core productivity: task creation is completely uncapped and free */
export function canAddTask(): GateResult {
  return { allowed: true };
}

/** Core productivity: habit creation is completely uncapped and free */
export function canAddHabit(): GateResult {
  return { allowed: true };
}

/** Study space creation is free */
export function canAddStudySpace(currentCount?: number): GateResult {
  return { allowed: true };
}

/** Social links are free */
export function canAddSocialLink(currentCount?: number): GateResult {
  return { allowed: true };
}

/** Check whether user unlocked premium themes milestone */
export function canUsePremiumTheme(): GateResult {
  if (isRewardUnlocked('premium_themes')) return { allowed: true };
  return {
    allowed: false,
    reason: 'Unlocked at Milestone: 30 completed tasks & 15 focus sessions.',
    rewardId: 'premium_themes',
  };
}

/** Check whether user unlocked logo variants milestone */
export function canUseLogoVariants(): GateResult {
  if (isRewardUnlocked('premium_themes')) return { allowed: true };
  return {
    allowed: false,
    reason: 'Unlocked at Milestone: 30 completed tasks & 15 focus sessions.',
    rewardId: 'premium_themes',
  };
}

/** Check whether user unlocked note export milestone */
export function canExportNotes(): GateResult {
  if (isRewardUnlocked('note_export')) return { allowed: true };
  return {
    allowed: false,
    reason: 'Unlocked at Milestone: 25 completed tasks.',
    rewardId: 'note_export',
  };
}

/** Check whether user unlocked note security milestone */
export function canLockNotes(): GateResult {
  if (isRewardUnlocked('note_security')) return { allowed: true };
  return {
    allowed: false,
    reason: 'Unlocked at Milestone: 10 completed tasks.',
    rewardId: 'note_security',
  };
}

/** Check whether user unlocked custom focus presets milestone */
export function canUseCustomFocusPreset(): GateResult {
  if (isRewardUnlocked('focus_presets')) return { allowed: true };
  return {
    allowed: false,
    reason: 'Unlocked at Milestone: 5 completed focus sessions.',
    rewardId: 'focus_presets',
  };
}

/** Check whether user unlocked deep revision analytics milestone */
export function canAccessRevisionAnalytics(): GateResult {
  if (isRewardUnlocked('deep_analytics')) return { allowed: true };
  return {
    allowed: false,
    reason: 'Unlocked at Milestone: 10 focus sessions & 10 habit check-in days.',
    rewardId: 'deep_analytics',
  };
}

/** Check whether user unlocked automated cloud vault milestone */
export function canScheduleBackup(): GateResult {
  if (isRewardUnlocked('cloud_vault')) return { allowed: true };
  return {
    allowed: false,
    reason: 'Unlocked at Milestone: 40 completed tasks & 14 habit check-in days.',
    rewardId: 'cloud_vault',
  };
}

// ─── Analytics ─────────────────────────────────────────────────────────────────

export type ProAnalyticsEvent =
  | 'paywall_view'
  | 'upgrade_tap'
  | 'feature_lock_encounter'
  | 'upgrade_success'
  | 'restore_tap';

/**
 * Track Pro-related events for conversion optimisation.
 * Fires-and-forgets — never throws.
 */
export async function trackProEvent(
  event: ProAnalyticsEvent,
  meta?: { feature?: string; source?: string },
): Promise<void> {
  try {
    const { session } = useAuthStore.getState();
    const userId = session?.user?.id ?? 'guest';
    await supabase.from('pro_analytics').insert({
      user_id: userId,
      event,
      feature: meta?.feature ?? null,
      source: meta?.source ?? null,
      created_at: new Date().toISOString(),
    });
  } catch {
    // Analytics must never crash the app
  }
}
