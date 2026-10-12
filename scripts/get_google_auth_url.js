require('dotenv').config({ path: '.env' });
require('dotenv').config({ path: '.env.local' });

const NEON_AUTH_URL = process.env.EXPO_PUBLIC_NEON_AUTH_URL;

async function getGoogleAuthUrl(callbackUrl = 'http://localhost:8081/auth/callback') {
  const res = await fetch(`${NEON_AUTH_URL}/sign-in/social`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Origin': 'http://localhost:8081',
    },
    body: JSON.stringify({
      provider: 'google',
      callbackURL: callbackUrl,
    }),
  });

  const data = await res.json();
  console.log('\n======================================================');
  console.log('GOOGLE OAUTH SIGN-IN URL PREPARED:');
  console.log('------------------------------------------------------');
  console.log(data.url);
  console.log('------------------------------------------------------');
  console.log('Instructions:');
  console.log('1. Open the URL above in a browser.');
  console.log('2. Complete the Google account-selection and consent prompt.');
  console.log('3. After redirect, run:');
  console.log('   node scripts/verify_google_oauth_linking.js <your-google-email>');
  console.log('======================================================\n');
}

getGoogleAuthUrl().catch(console.error);
