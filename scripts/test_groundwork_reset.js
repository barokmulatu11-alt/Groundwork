const fetch = globalThis.fetch;
const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function run() {
  const email = 'browser_test_user@groundwork.test';
  const res = await fetch('https://ep-gentle-night-b4oacb89.neonauth.c-6.us-east-2.aws.neon.tech/neondb/auth/request-password-reset', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, redirectTo: 'groundwork://reset-password' })
  });
  console.log('Status:', res.status, await res.json());

  const c = new Client({ connectionString: process.env.NEON_DATABASE_URL });
  await c.connect();
  const v = await c.query('SELECT * FROM neon_auth.verification ORDER BY "createdAt" DESC LIMIT 1');
  console.log('Inserted verification row:', v.rows);
  await c.end();
}

run().catch(console.error);
