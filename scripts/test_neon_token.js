require('dotenv').config({ path: '.env' });
require('dotenv').config({ path: '.env.local' });

async function main() {
  const url = process.env.EXPO_PUBLIC_NEON_AUTH_URL;
  // Sign in with neon_real_test_1@groundwork.test to get a fresh session and set-cookie
  const signInRes = await fetch(url + '/sign-in/email', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Origin': 'http://localhost:8081',
    },
    body: JSON.stringify({
      email: 'neon_real_test_1@groundwork.test',
      password: 'TestPassword123!',
    }),
  });

  const cookies = signInRes.headers.get('set-cookie');
  const body = await signInRes.json().catch(() => ({}));
  console.log('Sign in status:', signInRes.status);
  console.log('Set-Cookie present:', Boolean(cookies));
  console.log('Body user id:', body?.user?.id);

  // Now call /token with the returned cookie or session token
  const tokenRes = await fetch(url + '/token', {
    method: 'GET',
    headers: {
      'Origin': 'http://localhost:8081',
      ...(cookies ? { Cookie: cookies } : {}),
      ...(body?.token ? { Authorization: `Bearer ${body.token}` } : {}),
    },
  });

  console.log('/token status:', tokenRes.status);
  const tokenBody = await tokenRes.text();
  console.log('/token body:', tokenBody);
}

main().catch(console.error);
