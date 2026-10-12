require('dotenv').config({ path: '.env' });
require('dotenv').config({ path: '.env.local' });

const { verifyCaller, authorizeAndSignUpload, authorizeAndSignDownload } = require('../lib/serverStorage');
const { Pool } = require('pg');

async function main() {
  const authUrl = process.env.EXPO_PUBLIC_NEON_AUTH_URL;

  // 1. Authenticate Account 1 (Owner) against live Neon Auth
  const ownerSignIn = await fetch(authUrl + '/sign-in/email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Origin': 'http://localhost:8081' },
    body: JSON.stringify({ email: 'neon_real_test_1@groundwork.test', password: 'TestPassword123!' }),
  });
  const ownerCookie = ownerSignIn.headers.get('set-cookie');
  const ownerTokenRes = await fetch(authUrl + '/token', {
    method: 'GET',
    headers: { 'Origin': 'http://localhost:8081', Cookie: ownerCookie },
  });
  const { token: ownerJwt } = await ownerTokenRes.json();

  // 2. Sign up / In Account 2 (Attacker) against live Neon Auth
  const attackerEmail = 'neon_real_attacker@groundwork.test';
  await fetch(authUrl + '/sign-up/email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Origin': 'http://localhost:8081' },
    body: JSON.stringify({ email: attackerEmail, password: 'TestPassword123!', name: 'Attacker User' }),
  });
  const attackerSignIn = await fetch(authUrl + '/sign-in/email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Origin': 'http://localhost:8081' },
    body: JSON.stringify({ email: attackerEmail, password: 'TestPassword123!' }),
  });
  const attackerCookie = attackerSignIn.headers.get('set-cookie');
  const attackerTokenRes = await fetch(authUrl + '/token', {
    method: 'GET',
    headers: { 'Origin': 'http://localhost:8081', Cookie: attackerCookie },
  });
  const { token: attackerJwt } = await attackerTokenRes.json();

  const pool = new Pool({ connectionString: process.env.NEON_DATABASE_URL });

  // 3. Cryptographically verify both tokens against live remote JWKS
  const ownerVerification = await verifyCaller(`Bearer ${ownerJwt}`, pool);
  const attackerVerification = await verifyCaller(`Bearer ${attackerJwt}`, pool);

  if (ownerVerification.error || !ownerVerification.caller) {
    throw new Error(`Owner token verification failed: ${JSON.stringify(ownerVerification.error)}`);
  }
  if (attackerVerification.error || !attackerVerification.caller) {
    throw new Error(`Attacker token verification failed: ${JSON.stringify(attackerVerification.error)}`);
  }

  const ownerCaller = ownerVerification.caller;
  const attackerCaller = attackerVerification.caller;

  console.log('[Live Auth] Both real accounts verified against live Neon Auth JWKS successfully.');

  // 4. Request upload URL for owner
  const testFileName = `test_roundtrip_${Date.now()}.txt`;
  const relativePath = `${ownerCaller.userId}/${testFileName}`;
  const uploadSignResult = await authorizeAndSignUpload({
    caller: ownerCaller,
    bucket: 'notes',
    filePath: relativePath,
    contentType: 'text/plain',
  });

  if (uploadSignResult.error || !uploadSignResult.data?.uploadUrl) {
    throw new Error(`Failed to generate upload signed URL: ${JSON.stringify(uploadSignResult.error)}`);
  }

  // 5. Perform HTTP PUT upload of real test payload
  const testPayload = `Groundwork Verified Storage Payload @ ${new Date().toISOString()}`;
  const uploadHttpRes = await fetch(uploadSignResult.data.uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': 'text/plain' },
    body: testPayload,
  });

  if (!uploadHttpRes.ok) {
    throw new Error(`Real S3 upload PUT failed with HTTP status ${uploadHttpRes.status}`);
  }
  console.log('[Live S3] Real file upload PUT succeeded with HTTP 200.');

  // 6. Generate download signed URL for owner
  const downloadSignResult = await authorizeAndSignDownload({
    caller: ownerCaller,
    bucket: 'notes',
    filePath: relativePath,
    expiresIn: 300,
    pgClient: pool,
  });

  if (downloadSignResult.error || !downloadSignResult.data?.signedUrl) {
    throw new Error(`Failed to generate download signed URL: ${JSON.stringify(downloadSignResult.error)}`);
  }

  // 7. Perform HTTP GET download and compare contents
  const downloadHttpRes = await fetch(downloadSignResult.data.signedUrl);
  if (!downloadHttpRes.ok) {
    throw new Error(`Real S3 download GET failed with HTTP status ${downloadHttpRes.status}`);
  }
  const downloadedContent = await downloadHttpRes.text();
  const contentMatches = downloadedContent === testPayload;
  console.log('[Live S3] Real file download GET succeeded. Content matches exactly:', contentMatches);
  if (!contentMatches) {
    await pool.end();
    throw new Error(`S3 download verification failed: expected "${testPayload}", received "${downloadedContent}"`);
  }

  // 8. Verify Account 2 (Attacker) is denied access to Owner's file
  const attackerAccessResult = await authorizeAndSignDownload({
    caller: attackerCaller,
    bucket: 'notes',
    filePath: relativePath,
    expiresIn: 300,
    pgClient: pool,
  });

  const attackerDenied = attackerAccessResult.error?.status === 403;
  console.log('[Live Security] Attacker access denied (HTTP 403):', attackerDenied);
  if (!attackerDenied) {
    await pool.end();
    throw new Error(`Attacker access control failed: expected HTTP 403, received status ${attackerAccessResult.error?.status || 200}`);
  }

  await pool.end();

  console.log('\nFINAL ROUNDTRIP VERIFICATION: ALL 4 CHECKS PASSED!');
}

main().catch((err) => {
  console.error('[Error] Live storage roundtrip failed:', err);
  process.exit(1);
});
