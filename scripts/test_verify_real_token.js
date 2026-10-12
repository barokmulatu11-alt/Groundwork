require('dotenv').config({ path: '.env' });
require('dotenv').config({ path: '.env.local' });

const { verifyCaller, handleStorageApiRequest } = require('../lib/serverStorage');
const { Pool } = require('pg');

async function main() {
  const url = process.env.EXPO_PUBLIC_NEON_AUTH_URL;
  const signInRes = await fetch(url + '/sign-in/email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Origin': 'http://localhost:8081' },
    body: JSON.stringify({ email: 'neon_real_test_1@groundwork.test', password: 'TestPassword123!' }),
  });
  const cookies = signInRes.headers.get('set-cookie');
  const tokenRes = await fetch(url + '/token', {
    method: 'GET',
    headers: { 'Origin': 'http://localhost:8081', Cookie: cookies },
  });
  const { token } = await tokenRes.json();

  console.log('Real token obtained from Neon Auth.');

  const pool = new Pool({ connectionString: process.env.NEON_DATABASE_URL });
  const result = await verifyCaller(`Bearer ${token}`, pool);

  console.log('verifyCaller result:');
  console.log('caller exists:', Boolean(result.caller));
  console.log('caller userId:', result.caller?.userId);
  console.log('caller role:', result.caller?.role);
  if (result.error) {
    console.log('error:', result.error);
  }

  await pool.end();
}

main().catch(console.error);
