require('dotenv').config({ path: '.env' });
require('dotenv').config({ path: '.env.local' });

const { PostgrestClient } = require('@supabase/postgrest-js');
const { Pool } = require('pg');

const NEON_API_URL = process.env.EXPO_PUBLIC_NEON_API_URL;
const NEON_AUTH_URL = process.env.EXPO_PUBLIC_NEON_AUTH_URL;
const NEON_DATABASE_URL = process.env.NEON_DATABASE_URL;

const pool = new Pool({ connectionString: NEON_DATABASE_URL });

function decodeJwtPayload(token) {
  return JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString('utf8'));
}

async function getLiveAuthSession() {
  const signInRes = await fetch(NEON_AUTH_URL + '/sign-in/email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: 'http://localhost:8081' },
    body: JSON.stringify({ email: 'neon_real_test_1@groundwork.test', password: 'TestPassword123!' }),
  });
  if (!signInRes.ok) throw new Error(`Sign in failed: ${signInRes.status}`);

  const cookie = signInRes.headers.get('set-cookie');
  const tokenRes = await fetch(NEON_AUTH_URL + '/token', {
    method: 'GET',
    headers: { Origin: 'http://localhost:8081', Cookie: cookie },
  });
  if (!tokenRes.ok) throw new Error(`Get token failed: ${tokenRes.status}`);

  const { token } = await tokenRes.json();
  const payload = decodeJwtPayload(token);
  return { token, userId: payload.sub };
}

/**
 * Executes atomicUpdateProfileSettings against the live Neon PostgREST client
 * using the production query semantics implemented in lib/profileSettingsService.ts
 */
async function atomicUpdateLive(postgrest, userId, updater) {
  const MAX_RETRIES = 5;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    // 1. Fetch current profile
    const { data: rows, error: fetchErr } = await postgrest
      .from('profiles')
      .select('*, settings')
      .eq('id', userId);

    if (fetchErr) throw fetchErr;
    if (!rows || rows.length === 0) throw new Error(`User profile ${userId} not found`);

    const currentProfile = rows[0] || {};
    const existingSettings =
      currentProfile.settings && typeof currentProfile.settings === 'object'
        ? currentProfile.settings
        : {};

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

    // 2. Obtain changes
    const updateOptions = await updater(existingSettings, currentProfile);
    const directUpdates = updateOptions.directUpdates || {};
    const settingsUpdates = updateOptions.settingsUpdates || {};

    // 3. Deep merge
    const mergedSettings = {
      ...existingSettings,
      ...settingsUpdates,
    };

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

    mergedSettings._v = nextVersion;

    // 4. Update payload
    const updatePayload = {
      ...directUpdates,
      settings: mergedSettings,
      updated_at: new Date().toISOString(),
    };

    // 5. Version-checked OCC conditional update
    let query = postgrest
      .from('profiles')
      .update(updatePayload)
      .eq('id', userId);

    if (!hasExplicitVersion) {
      query = query.filter('settings->>_v', 'is', 'null');
    } else if (currentVersion === 0) {
      query = query.filter('settings->>_v', 'eq', '0');
    } else {
      query = query.filter('settings->>_v', 'eq', String(currentVersion));
    }

    const { data: updatedRows, error: updateErr } = await query.select();
    if (updateErr) throw updateErr;

    // 6. OCC conflict retry
    if (!updatedRows || updatedRows.length === 0) {
      const backoffMs = 25 + Math.random() * 50 * (attempt + 1);
      await new Promise((resolve) => setTimeout(resolve, backoffMs));
      continue;
    }

    return { settings: mergedSettings, profile: updatedRows[0] };
  }

  throw new Error(`atomicUpdateLive failed for user ${userId} after ${MAX_RETRIES} attempts`);
}

async function runLiveVerification() {
  console.log('========================================================================');
  console.log(' REAL NEON DATA API CONCURRENCY & OCC VERIFICATION (NO ADAPTER)          ');
  console.log('========================================================================\n');

  const { token, userId } = await getLiveAuthSession();
  console.log('[Live Auth] Obtained real Neon Auth session for user ID:', userId);

  const postgrest = new PostgrestClient(NEON_API_URL, {
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: token,
    },
  });

  // Ensure test profile exists
  await pool.query(
    "INSERT INTO public.profiles (id, email, username, settings) VALUES ($1, 'neon_real_test_1@groundwork.test', 'neon_test_1', '{}'::jsonb) ON CONFLICT (id) DO NOTHING",
    [userId]
  );

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 1: A settings update starting from {} succeeds
  // ──────────────────────────────────────────────────────────────────────────
  console.log('--- Test 1: Single settings update starting from {} ---');
  await pool.query("UPDATE public.profiles SET settings = '{}'::jsonb, updated_at = NOW() WHERE id = $1", [userId]);

  const t1Res = await atomicUpdateLive(postgrest, userId, () => ({
    settingsUpdates: { theme_mode: 'dark', font_size: 'medium' },
  }));

  const dbRes1 = await pool.query("SELECT settings FROM public.profiles WHERE id = $1", [userId]);
  const s1 = dbRes1.rows[0]?.settings || {};

  const t1Passed =
    s1.theme_mode === 'dark' &&
    s1.font_size === 'medium' &&
    s1._v === 1;

  if (!t1Passed) {
    throw new Error(`Test 1 Failed: settings update starting from {} produced unexpected state: ${JSON.stringify(s1)}`);
  }
  console.log('✔ Test 1 PASS: Settings update starting from {} succeeded with _v = 1');
  console.log('  State in Neon Postgres:', JSON.stringify(s1));

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 2: Two simultaneous reward updates starting from {} both survive
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- Test 2: Two simultaneous reward updates starting from {} ---');
  await pool.query("UPDATE public.profiles SET settings = '{}'::jsonb, updated_at = NOW() WHERE id = $1", [userId]);

  const w1 = atomicUpdateLive(postgrest, userId, () => ({
    addRewards: ['note_security'],
    highwater: { completedTasks: 5 },
  }));

  const w2 = atomicUpdateLive(postgrest, userId, () => ({
    addRewards: ['streak_shield'],
    highwater: { completedTasks: 12 },
  }));

  await Promise.all([w1, w2]);

  const dbRes2 = await pool.query("SELECT settings FROM public.profiles WHERE id = $1", [userId]);
  const s2 = dbRes2.rows[0]?.settings || {};
  const unlocks2 = new Set(s2.unlocked_rewards || []);

  const hasNoteSecurity = unlocks2.has('note_security');
  const hasStreakShield = unlocks2.has('streak_shield');
  const hwTasksMerged = s2.milestone_highwater?.completedTasks === 12;
  const version2Valid = typeof s2._v === 'number' && s2._v >= 2;

  const t2Passed = hasNoteSecurity && hasStreakShield && hwTasksMerged && version2Valid;
  if (!t2Passed) {
    throw new Error(`Test 2 Failed: simultaneous updates starting from {} lost data: ${JSON.stringify(s2)}`);
  }
  console.log('✔ Test 2 PASS: Both simultaneous updates starting from {} survived');
  console.log('  Both rewards preserved:', hasNoteSecurity && hasStreakShield);
  console.log('  Milestone highwater merged max(5, 12):', s2.milestone_highwater?.completedTasks);
  console.log('  Final version counter _v:', s2._v);

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 3: A settings change racing with a reward unlock preserves both
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- Test 3: Settings change racing with reward unlock ---');
  // Currently s2 has rewards ['note_security', 'streak_shield'] and _v = 2
  const settingsChange = atomicUpdateLive(postgrest, userId, () => ({
    settingsUpdates: {
      accent_color: 'amber',
      sound_effects: false,
    },
  }));

  const rewardUnlock = atomicUpdateLive(postgrest, userId, () => ({
    addRewards: ['offline_vault'],
    highwater: { focusSessions: 4 },
  }));

  await Promise.all([settingsChange, rewardUnlock]);

  const dbRes3 = await pool.query("SELECT settings FROM public.profiles WHERE id = $1", [userId]);
  const s3 = dbRes3.rows[0]?.settings || {};
  const unlocks3 = new Set(s3.unlocked_rewards || []);

  const preservedAccent = s3.accent_color === 'amber';
  const preservedSound = s3.sound_effects === false;
  const preservedNoteSec = unlocks3.has('note_security');
  const preservedStreak = unlocks3.has('streak_shield');
  const preservedVault = unlocks3.has('offline_vault');
  const hwFocusMerged = s3.milestone_highwater?.focusSessions === 4;
  const version3Valid = typeof s3._v === 'number' && s3._v >= 3;

  const t3Passed =
    preservedAccent &&
    preservedSound &&
    preservedNoteSec &&
    preservedStreak &&
    preservedVault &&
    hwFocusMerged &&
    version3Valid;

  if (!t3Passed) {
    throw new Error(`Test 3 Failed: racing settings change and reward unlock lost data: ${JSON.stringify(s3)}`);
  }
  console.log('✔ Test 3 PASS: Settings change racing with reward unlock preserved both');
  console.log('  Unrelated settings preserved (accent_color, sound_effects):', preservedAccent && preservedSound);
  console.log('  All three rewards preserved:', preservedNoteSec && preservedStreak && preservedVault);
  console.log('  Highwater marks preserved:', s3.milestone_highwater);
  console.log('  Final version counter _v:', s3._v);

  await pool.end();

  console.log('\n========================================================================');
  console.log(' REAL NEON DATA API CONCURRENCY RESULTS: ALL 3 VERIFICATIONS PASSED!     ');
  console.log('========================================================================\n');
}

runLiveVerification().catch((err) => {
  console.error('[Error] Real Neon Data API verification failed:', err);
  pool.end().catch(() => {});
  process.exit(1);
});
