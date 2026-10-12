const fetch = globalThis.fetch;
const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function testOrigins() {
  const c = new Client({ connectionString: process.env.NEON_DATABASE_URL });
  await c.connect();

  const testOriginsList = [
    'http://localhost:8081',
    'http://10.0.2.2:8081',
    'http://127.0.0.1:8081',
    'https://groundwork.app',
    'https://v0-barok-labs.vercel.app',
    'groundwork://',
    'groundwork://reset-password'
  ];

  await c.query('UPDATE neon_auth.project_config SET trusted_origins = $1::jsonb', [JSON.stringify(testOriginsList)]);
  console.log('Set trusted_origins to:', testOriginsList);
  await c.end();

  const urlsToTest = [
    'http://localhost:8081/reset-password',
    'http://10.0.2.2:8081/reset-password',
    'https://groundwork.app/reset-password',
    'https://v0-barok-labs.vercel.app/reset-password',
    'groundwork://reset-password'
  ];

  for (const url of urlsToTest) {
    const res = await fetch('https://ep-gentle-night-b4oacb89.neonauth.c-6.us-east-2.aws.neon.tech/neondb/auth/request-password-reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Origin': 'http://localhost:8081' },
      body: JSON.stringify({ email: 'test_user_68@example.com', redirectTo: url })
    });
    const d = await res.json().catch(e => ({}));
    console.log(url, '--> status:', res.status, d.code || d.message || 'OK');
  }
}

testOrigins().catch(console.error);
