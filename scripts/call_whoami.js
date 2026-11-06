const fetch = require('node-fetch');

const NEON_AUTH_URL = 'https://ep-gentle-night-b4oacb89.neonauth.c-6.us-east-2.aws.neon.tech/neondb/auth';
const NEON_API_URL = 'https://ep-gentle-night-b4oacb89.apirest.c-6.us-east-2.aws.neon.tech/neondb/rest/v1';

async function main() {
  const signInRes = await fetch(NEON_AUTH_URL + '/sign-in/email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Origin': 'http://localhost:8081' },
    body: JSON.stringify({ email: 'neon_real_test_1@groundwork.test', password: 'TestPassword123!' }),
  });
  const cookies = signInRes.headers.get('set-cookie');
  const tokenRes = await fetch(NEON_AUTH_URL + '/token', {
    method: 'GET',
    headers: { 'Origin': 'http://localhost:8081', Cookie: cookies },
  });
  const { token } = await tokenRes.json();

  console.log('Testing PostgREST RPC debug_whoami with JWT:');
  const rpcRes = await fetch(`${NEON_API_URL}/rpc/debug_whoami`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'apikey': token,
      'Content-Type': 'application/json',
    },
  });
  console.log('RPC Status:', rpcRes.status);
  console.log('RPC Body:', await rpcRes.text());
}

main().catch(console.error);
