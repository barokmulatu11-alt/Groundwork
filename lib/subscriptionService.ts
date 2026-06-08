/**
 * SubscriptionService — centralized Pro access control for Groundwork.
 *
 * Every premium feature MUST call isPro() or a limit-check from this file.
 * Never rely solely on UI hiding.
 */

import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import { useStore } from '@/store/useStore';

// ─── Limits ────────────────────────────────────────────────────────────────────

export const FREE_LIMITS = {
  TASKS_LIFETIME: 100,
  HABITS: 5,
  STUDY_SPACES: 5,
  SOCIAL_LINKS: 3,
} as const;

// ─── Core ──────────────────────────────────────────────────────────────────────

/**
 * Returns true if the current user has an active Pro subscription.
 * This is the single source of truth — always call this, never read
 * profile.pro_status directly in feature-gating logic.
 */
export function isPro(): boolean {
  const { profile, session, isGuest } = useAuthStore.getState();
  if (isGuest) return false;
  if (!session) return false;

  // Backend-authoritative: pro_status set by admin dashboard
  if (profile?.pro_status === true) {
    // If expiry is set, validate it
    if (profile.pro_until) {
      return new Date(profile.pro_until) > new Date();
    }
    return true;
  }

  // Fallback: user metadata (for edge cases right after purchase)
  return session.user?.user_metadata?.is_pro === true;
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

/** Stub: integrate with your payment provider (e.g. RevenueCat, Stripe) here. */
export async function subscribe(_plan: 'pro_1month' | 'pro_1year'): Promise<void> {
  // TODO: trigger payment flow
  throw new Error('Payment provider not yet integrated.');
}

/** Stub: trigger restore purchases flow from payment provider. */
export async function restorePurchases(): Promise<void> {
  await refreshSubscription();
}

// ─── Feature gate helpers ───────────────────────────────────────────────────────

export interface GateResult {
  allowed: boolean;
  reason?: string;
  limit?: number;
  current?: number;
}

/** Check whether the user can create another task (lifetime cap for free users). */
export function canAddTask(): GateResult {
  if (isPro()) return { allowed: true };

  const { tasks } = useStore.getState();
  // Count all tasks ever created (including deleted/completed)
  const lifetime = tasks.length;
  if (lifetime >= FREE_LIMITS.TASKS_LIFETIME) {
    return {
      allowed: false,
      reason: `Free users can create up to ${FREE_LIMITS.TASKS_LIFETIME} tasks in total. Upgrade to Pro for unlimited tasks.`,
      limit: FREE_LIMITS.TASKS_LIFETIME,
      current: lifetime,
    };
  }
  return { allowed: true, current: lifetime, limit: FREE_LIMITS.TASKS_LIFETIME };
}

/** Check whether the user can create another habit. */
export function canAddHabit(): GateResult {
  if (isPro()) return { allowed: true };

  const { habits } = useStore.getState();
  const active = habits.filter(h => !h.deleted_at).length;
  if (active >= FREE_LIMITS.HABITS) {
    return {
      allowed: false,
      reason: `Free users can track up to ${FREE_LIMITS.HABITS} habits. Upgrade to Pro for unlimited habits.`,
      limit: FREE_LIMITS.HABITS,
      current: active,
    };
  }
  return { allowed: true, current: active, limit: FREE_LIMITS.HABITS };
}

/** Check whether the user can create another Study Space (folder). */
export function canAddStudySpace(currentCount: number): GateResult {
  if (isPro()) return { allowed: true };

  if (currentCount >= FREE_LIMITS.STUDY_SPACES) {
    return {
      allowed: false,
      reason: `Free users can create up to ${FREE_LIMITS.STUDY_SPACES} Study Spaces. Upgrade to Pro for unlimited spaces.`,
      limit: FREE_LIMITS.STUDY_SPACES,
      current: currentCount,
    };
  }
  return { allowed: true, current: currentCount, limit: FREE_LIMITS.STUDY_SPACES };
}

/** Check whether the user can add another social link. */
export function canAddSocialLink(currentCount: number): GateResult {
  if (isPro()) return { allowed: true };

  if (currentCount >= FREE_LIMITS.SOCIAL_LINKS) {
    return {
      allowed: false,
      reason: `Free users can add up to ${FREE_LIMITS.SOCIAL_LINKS} social links. Upgrade to Pro for unlimited links.`,
      limit: FREE_LIMITS.SOCIAL_LINKS,
      current: currentCount,
    };
  }
  return { allowed: true, current: currentCount, limit: FREE_LIMITS.SOCIAL_LINKS };
}

/** Check whether the user can use a premium theme. */
export function canUsePremiumTheme(): GateResult {
  if (isPro()) return { allowed: true };
  return {
    allowed: false,
    reason: 'Premium themes are exclusively available to Groundwork Pro members.',
  };
}

/** Check whether the user can export notes. */
export function canExportNotes(): GateResult {
  if (isPro()) return { allowed: true };
  return {
    allowed: false,
    reason: 'Note export (PDF & Markdown) is a Pro feature. Upgrade to unlock.',
  };
}

/** Check whether the user can lock notes with biometrics. */
export function canLockNotes(): GateResult {
  if (isPro()) return { allowed: true };
  return {
    allowed: false,
    reason: 'Note locking with biometrics is a Pro feature. Upgrade to unlock.',
  };
}

/** Check whether the user can use custom focus presets. */
export function canUseCustomFocusPreset(): GateResult {
  if (isPro()) return { allowed: true };
  return {
    allowed: false,
    reason: 'Custom focus presets are available to Pro users. Upgrade to set your own timer rules.',
  };
}

/** Check whether the user can access revision analytics. */
export function canAccessRevisionAnalytics(): GateResult {
  if (isPro()) return { allowed: true };
  return {
    allowed: false,
    reason: 'Revision analytics is a Pro feature. Upgrade to track weak topics and review schedules.',
  };
}

/** Check whether the user can schedule or automate backups. */
export function canScheduleBackup(): GateResult {
  if (isPro()) return { allowed: true };
  return {
    allowed: false,
    reason: 'Scheduled and automatic cloud backup is a Pro feature.',
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
