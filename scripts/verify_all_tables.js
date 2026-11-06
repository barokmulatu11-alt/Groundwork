const fetch = require('node-fetch');

const NEON_AUTH_URL = 'https://ep-gentle-night-b4oacb89.neonauth.c-6.us-east-2.aws.neon.tech/neondb/auth';
const NEON_API_URL = 'https://ep-gentle-night-b4oacb89.apirest.c-6.us-east-2.aws.neon.tech/neondb/rest/v1';

async function main() {
  const signInRes = await fetch(NEON_AUTH_URL + '/sign-in/email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: 'http://localhost:8081' },
    body: JSON.stringify({ email: 'neon_real_test_1@groundwork.test', password: 'TestPassword123!' }),
  });
  const cookies = signInRes.headers.get('set-cookie');
  const tokenRes = await fetch(NEON_AUTH_URL + '/token', {
    headers: { Origin: 'http://localhost:8081', Cookie: cookies },
  });
  const { token } = await tokenRes.json();
  const userId = 'c29cb0ce-4c80-44c4-a13f-6f70473afc3b';

  const tables = ['tasks', 'habits', 'notes', 'focus_sessions', 'day_notes', 'sub_tasks', 'user_settings'];
  console.log(`Testing SELECT on all tables for userId: ${userId}`);

  for (const t of tables) {
    const res = await fetch(`${NEON_API_URL}/${t}?user_id=eq.${userId}&limit=1`, {
      headers: { Authorization: `Bearer ${token}`, apikey: token },
    });
    console.log(`Table ${t.padEnd(16)}: status ${res.status} ${res.ok ? '✔ SUCCESS' : '❌ FAILED: ' + (await res.text())}`);
  }
}

main().catch(console.error);
