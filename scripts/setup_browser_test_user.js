require('dotenv').config({ path: '.env' });
require('dotenv').config({ path: '.env.local' });

const NEON_AUTH_URL = process.env.EXPO_PUBLIC_NEON_AUTH_URL;

async function setup() {
  const email = 'browser_test_user@groundwork.test';
  const password = 'TestPassword123!';
  const name = 'Browser Test User';

  console.log('Registering/Signing up browser test user...');
  const res = await fetch(`${NEON_AUTH_URL}/sign-up/email`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Origin': 'http://localhost:8081',
    },
    body: JSON.stringify({ email, password, name }),
  });

  const body = await res.json().catch(() => ({}));
  console.log('Sign up status:', res.status, body);

  if (res.status === 200 || (res.status === 400 && body.message?.includes('already exists'))) {
    console.log('Browser test user is ready:');
    console.log('Email:', email);
    console.log('Password:', password);
  } else {
    console.error('Failed to setup test user:', body);
  }
}

setup().catch(console.error);
