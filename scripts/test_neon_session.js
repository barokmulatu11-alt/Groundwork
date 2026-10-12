require('dotenv').config({ path: '.env' });
require('dotenv').config({ path: '.env.local' });

async function main() {
  const url = process.env.EXPO_PUBLIC_NEON_AUTH_URL;
  const sessionToken = '1MShUey2RVuqPWkzTakDPrZObBUdlfVB';

  console.log('Testing NEON_AUTH_URL:', url);

  const endpoints = [
    { method: 'GET', path: '/get-session', headers: { Cookie: `better-auth.session_token=${sessionToken}` } },
    { method: 'GET', path: '/get-session', headers: { Authorization: `Bearer ${sessionToken}` } },
    { method: 'GET', path: '/token', headers: { Cookie: `better-auth.session_token=${sessionToken}` } },
    { method: 'POST', path: '/get-jwt-token', headers: { Cookie: `better-auth.session_token=${sessionToken}` } },
    { method: 'GET', path: '/session', headers: { Authorization: `Bearer ${sessionToken}` } },
  ];

  for (const ep of endpoints) {
    try {
      const res = await fetch(url + ep.path, {
        method: ep.method,
        headers: {
          'Origin': 'http://localhost:8081',
          ...ep.headers,
        },
      });
      const text = await res.text();
      console.log(`${ep.method} ${ep.path}: status ${res.status}, body length: ${text.length}`);
      if (res.status === 200) {
        console.log(`Success! Header keys:`, Array.from(res.headers.keys()));
        console.log(`Body preview:`, text.slice(0, 100));
      }
    } catch (e) {
      console.log(`${ep.method} ${ep.path} error:`, e.message);
    }
  }
}

main().catch(console.error);
