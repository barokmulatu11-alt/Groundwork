import { supabase } from '@/lib/supabase';

export interface SettingsMergeOptions {
  directUpdates?: Record<string, any>;
  settingsUpdates?: Record<string, any>;
  addRewards?: string[];
  highwater?: { completedTasks?: number; focusSessions?: number; habitDays?: number };
}

const MAX_RETRIES = 5;

/**
 * Atomically updates a user's profiles.settings and top-level profile fields using
 * Optimistic Concurrency Control (OCC) with version checking (_v) and automatic retries.
 *
 * Protects:
 * - The very first concurrent update starting from {} (_v is missing or 0)
 * - Subsequent concurrent updates (_v = 1, 2, 3...)
 * - Simultaneous updates from different stores (e.g. settings store vs rewards service)
 */
export async function atomicUpdateProfileSettings(
  userId: string,
  updater: (
    currentSettings: Record<string, any>,
    currentProfile: any
  ) => SettingsMergeOptions | Promise<SettingsMergeOptions>
): Promise<{ settings: Record<string, any>; profile: any }> {
  if (!userId || userId === 'guest') {
    throw new Error('atomicUpdateProfileSettings cannot be called for guest users');
  }

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    // 1. Fetch current profile from database
    const { data: profileRow, error: fetchErr } = await supabase
      .from('profiles')
      .select('*, settings')
      .eq('id', userId)
      .maybeSingle();

    if (fetchErr) {
      throw fetchErr;
    }

    const currentProfile = profileRow || {};
    const existingSettings =
      currentProfile.settings && typeof currentProfile.settings === 'object'
        ? currentProfile.settings
        : {};

    // Determine whether version key _v exists explicitly on the fetched settings
    const hasExplicitVersion =
      existingSettings &&
      typeof existingSettings === 'object' &&
      Object.prototype.hasOwnProperty.call(existingSettings, '_v') &&
      existingSettings._v !== null &&
      existingSettings._v !== undefined;

    const currentVersion =
      hasExplicitVersion && typeof existingSettings._v === 'number' && Number.isFinite(existingSettings._v)
        ? existingSettings._v
        : 0;
    const nextVersion = currentVersion + 1;

    // 2. Obtain requested changes from updater callback
    const updateOptions = await updater(existingSettings, currentProfile);
    const directUpdates = updateOptions.directUpdates || {};
    const settingsUpdates = updateOptions.settingsUpdates || {};

    // 3. Merge settings: preserve all unrelated settings keys
    const mergedSettings: Record<string, any> = {
      ...existingSettings,
      ...settingsUpdates,
    };

    // Deep merge unlocked_rewards permanently
    const currentUnlocks = Array.isArray(existingSettings.unlocked_rewards)
      ? existingSettings.unlocked_rewards
      : [];
    const newUnlocks = Array.isArray(settingsUpdates.unlocked_rewards)
      ? settingsUpdates.unlocked_rewards
      : [];
    const addedRewards = Array.isArray(updateOptions.addRewards)
      ? updateOptions.addRewards
      : [];
    const combinedUnlocks = Array.from(new Set([...currentUnlocks, ...newUnlocks, ...addedRewards]));
    if (combinedUnlocks.length > 0 || Array.isArray(existingSettings.unlocked_rewards)) {
      mergedSettings.unlocked_rewards = combinedUnlocks;
    }

    // Deep merge milestone_highwater via Math.max
    const exHw = existingSettings.milestone_highwater || {};
    const newHw = settingsUpdates.milestone_highwater || {};
    const extraHw = updateOptions.highwater || {};
    const mergedHighwater = {
      completedTasks: Math.max(
        exHw.completedTasks || 0,
        newHw.completedTasks || 0,
        extraHw.completedTasks || 0
      ),
      focusSessions: Math.max(
        exHw.focusSessions || 0,
        newHw.focusSessions || 0,
        extraHw.focusSessions || 0
      ),
      habitDays: Math.max(
        exHw.habitDays || 0,
        newHw.habitDays || 0,
        extraHw.habitDays || 0
      ),
    };
    if (
      mergedHighwater.completedTasks > 0 ||
      mergedHighwater.focusSessions > 0 ||
      mergedHighwater.habitDays > 0 ||
      existingSettings.milestone_highwater
    ) {
      mergedSettings.milestone_highwater = mergedHighwater;
    }

    // Stamp new version counter
    mergedSettings._v = nextVersion;

    // 4. Build payload
    const updatePayload: Record<string, any> = {
      ...directUpdates,
      settings: mergedSettings,
      updated_at: new Date().toISOString(),
    };

    // 5. Version-checked OCC conditional update using actual production query semantics
    let query = supabase
      .from('profiles')
      .update(updatePayload)
      .eq('id', userId);

    // Apply exact version filter based on fetched state:
    // 1) If fetched version is missing: match missing _v explicitly via IS NULL
    // 2) If explicit zero: match explicit 0 separately via EQ '0'
    // 3) If subsequent writes (> 0): match current version number via EQ String(currentVersion)
    if (!hasExplicitVersion) {
      query = query.filter('settings->>_v', 'is', 'null');
    } else if (currentVersion === 0) {
      query = query.filter('settings->>_v', 'eq', '0');
    } else {
      query = query.filter('settings->>_v', 'eq', String(currentVersion));
    }

    const { data: updatedRows, error: updateErr } = await query.select();

    if (updateErr) {
      throw updateErr;
    }

    // 6. If no rows updated, a race condition occurred! Retry with backoff.
    if (!updatedRows || updatedRows.length === 0) {
      const backoffMs = 25 + Math.random() * 50 * (attempt + 1);
      await new Promise((resolve) => setTimeout(resolve, backoffMs));
      continue;
    }

    // Succeeded
    return {
      settings: mergedSettings,
      profile: updatedRows[0],
    };
  }

  throw new Error(
    `atomicUpdateProfileSettings failed for user ${userId} after ${MAX_RETRIES} attempts due to concurrent conflicts`
  );
}
