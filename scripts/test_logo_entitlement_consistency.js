/**
 * scripts/test_logo_entitlement_consistency.js
 *
 * Verifies production logo entitlement implementation:
 * - canUseLogoVariants from lib/subscriptionService.ts
 * - initializeAccountRewards from lib/rewardsService.ts
 * - session switching in store/useAuthStore.ts
 *
 * Mocking only external boundaries (device haptics, sqlite, window.localStorage).
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
  addEventListener: () => {},
  removeEventListener: () => {},
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

const AsyncStorage = jiti('@react-native-async-storage/async-storage').default;
const { canUseLogoVariants } = jiti('./lib/subscriptionService.ts');
const { initializeAccountRewards } = jiti('./lib/rewardsService.ts');
const { useAuthStore } = jiti('./store/useAuthStore.ts');

async function runLogoEntitlementProductionTests() {
  console.log('Testing Production Logo Entitlement Consistency across accounts & persistence...');

  const userA = 'user_account_alpha';
  const userB = 'user_account_beta';

  // ─── 1. Initial State: Both Accounts Locked ────────────────────────────────
  await initializeAccountRewards(userA);
  await initializeAccountRewards(userB);

  // Set active session to User A
  useAuthStore.setState({
    session: { user: { id: userA, email: 'alpha@groundwork.test' } },
    profile: { id: userA, pro_status: false },
    isGuest: false,
  });

  const gateAInitial = canUseLogoVariants();
  assert.strictEqual(
    gateAInitial.allowed,
    false,
    'User A must initially be locked from logo variants'
  );
  assert(
    gateAInitial.reason && gateAInitial.reason.includes('Milestone'),
    'Gate result must explain milestone requirement'
  );

  // Set active session to User B
  useAuthStore.setState({
    session: { user: { id: userB, email: 'beta@groundwork.test' } },
    profile: { id: userB, pro_status: false },
    isGuest: false,
  });

  const gateBInitial = canUseLogoVariants();
  assert.strictEqual(
    gateBInitial.allowed,
    false,
    'User B must initially be locked from logo variants'
  );
  console.log('✓ Case 1 PASSED: Initial state gate verified for both accounts via production canUseLogoVariants.');

  // ─── 2. Unlock Milestone for User A in Durable Storage ─────────────────────
  // Write unlocked reward to User A's durable storage key
  const unlockedKeyA = `groundwork_unlocked_rewards_${userA}`;
  await AsyncStorage.setItem(unlockedKeyA, JSON.stringify(['premium_themes']));

  // Hydrate User A from durable storage
  await initializeAccountRewards(userA);

  // Switch to User A
  useAuthStore.setState({
    session: { user: { id: userA, email: 'alpha@groundwork.test' } },
    profile: { id: userA, pro_status: false },
    isGuest: false,
  });

  const gateAUnlocked = canUseLogoVariants();
  assert.strictEqual(
    gateAUnlocked.allowed,
    true,
    'User A must be granted logo variants after milestone hydration'
  );
  console.log('✓ Case 2 PASSED: User A unlocks logo variants via milestone reward hydration.');

  // ─── 3. Account Switching & Isolation ──────────────────────────────────────
  // Switch to User B
  useAuthStore.setState({
    session: { user: { id: userB, email: 'beta@groundwork.test' } },
    profile: { id: userB, pro_status: false },
    isGuest: false,
  });

  const gateBAfterSwitch = canUseLogoVariants();
  assert.strictEqual(
    gateBAfterSwitch.allowed,
    false,
    'User B must NOT inherit User A milestone unlock'
  );

  // Switch back to User A
  useAuthStore.setState({
    session: { user: { id: userA, email: 'alpha@groundwork.test' } },
    profile: { id: userA, pro_status: false },
    isGuest: false,
  });

  const gateAReturn = canUseLogoVariants();
  assert.strictEqual(
    gateAReturn.allowed,
    true,
    'User A retains unlocked status when switching back'
  );
  console.log('✓ Case 3 PASSED: Account isolation verified — User B remains locked while User A retains access.');

  // ─── 4. Persistence across Simulated App Restart ───────────────────────────
  // Verify storage key exists
  const storedJson = await AsyncStorage.getItem(unlockedKeyA);
  assert(storedJson && storedJson.includes('premium_themes'), 'Durable storage must contain User A unlock');

  // Re-run initialization to simulate startup hydration
  await initializeAccountRewards(userA);

  useAuthStore.setState({
    session: { user: { id: userA, email: 'alpha@groundwork.test' } },
    profile: { id: userA, pro_status: false },
    isGuest: false,
  });

  const gateAPersisted = canUseLogoVariants();
  assert.strictEqual(
    gateAPersisted.allowed,
    true,
    'User A must retain unlock after restart hydration'
  );
  console.log('✓ Case 4 PASSED: Persistence verified — milestone unlock survives app restart.');

  console.log('\nAll Production Logo Entitlement Consistency tests PASSED successfully.');
}

runLogoEntitlementProductionTests().catch((err) => {
  console.error('\nProduction Logo Entitlement test FAILED:', err);
  process.exit(1);
});
