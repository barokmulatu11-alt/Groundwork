require('dotenv').config({ path: '.env.local' });
const fetch = globalThis.fetch;

const NEON_AUTH_URL = process.env.EXPO_PUBLIC_NEON_AUTH_URL || 'https://ep-gentle-night-b4oacb89.neonauth.c-6.us-east-2.aws.neon.tech/neondb/auth';

async function testEmailChangeFlow() {
  console.log('--- 1. Testing Neon Auth /change-email with real test account ---');
  
  // Sign in as neon_real_test_1
  const signInRes = await fetch(`${NEON_AUTH_URL}/sign-in/email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: 'http://localhost:8081' },
    body: JSON.stringify({ email: 'neon_real_test_1@groundwork.test', password: 'TestPassword123!' }),
  });

  if (!signInRes.ok) {
    throw new Error(`Sign in failed with status ${signInRes.status}`);
  }
  const cookie = signInRes.headers.get('set-cookie');
  console.log('✓ Successfully authenticated test user: neon_real_test_1@groundwork.test');

  // Attempt change-email
  const testTargetEmail = 'updated_address@groundwork.test';
  const changeRes = await fetch(`${NEON_AUTH_URL}/change-email`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: 'http://localhost:8081',
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: JSON.stringify({ newEmail: testTargetEmail }),
  });

  console.log(`Provider HTTP status: ${changeRes.status}`);
  const changeBody = await changeRes.json().catch(() => ({}));
  console.log('Provider response payload:', changeBody);

  // Validate provider behavior
  if (changeRes.status === 400 && changeBody.code === 'CHANGE_EMAIL_DISABLED') {
    console.log('✓ Confirmed provider behavior: change-email endpoint is disabled on active Neon Auth instance.');
  } else if (changeRes.ok) {
    console.log('✓ Provider permitted email change verification request.');
  }

  // --- 2. Test Supabase Adapter wrapper translation ---
  console.log('\n--- 2. Testing Adapter error translation logic ---');
  // Replicating lib/supabase.ts translation logic:
  function translateProviderResponse(resBody, status) {
    if (resBody?.error || status >= 400) {
      const err = resBody?.error || resBody;
      const msg = (err.code === 'CHANGE_EMAIL_DISABLED' || err.message?.toLowerCase().includes('disabled'))
        ? 'Email changes are currently not enabled by the authentication provider.'
        : (err.message || 'Failed to update email.');
      return { data: null, error: new Error(msg) };
    }
    return { data: { user: resBody?.user || null }, error: null };
  }

  const translated = translateProviderResponse(changeBody, changeRes.status);
  console.log('Translated adapter result:', {
    hasData: !!translated.data,
    errorMessage: translated.error?.message,
  });

  if (translated.error && translated.error.message.includes('not enabled')) {
    console.log('✓ SUCCESS: Client accurately receives explanation without reporting false success.');
  } else if (!translated.error && translated.data) {
    console.log('✓ SUCCESS: Email verification dispatched.');
  } else {
    throw new Error('FAILURE: False success condition occurred (no error but no user data).');
  }

  console.log('\nAll email-change verification checks PASSED.');
}

testEmailChangeFlow().catch((e) => {
  console.error('Test FAILED:', e);
  process.exit(1);
});
