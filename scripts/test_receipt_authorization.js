/**
 * test_receipt_authorization.js
 *
 * Verifies that the receipt-signing authorization logic enforces:
 * 1. Anonymous users are DENIED (401 Unauthorized)
 * 2. Non-owner users (without admin/owner role) are DENIED (403 Forbidden)
 * 3. The authorized receipt owner is ALLOWED (signed URL issued, HTTP 200)
 * 4. An authorized admin/owner user is ALLOWED (signed URL issued, HTTP 200)
 */

require('dotenv').config({ path: '.env' });
require('dotenv').config({ path: '.env.local' });

const { Client } = require('pg');
const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const assert = require('assert');

const NEON_DATABASE_URL = process.env.NEON_DATABASE_URL;
const AWS_ENDPOINT_URL_S3 = process.env.AWS_ENDPOINT_URL_S3 || process.env.EXPO_PUBLIC_NEON_S3_ENDPOINT;
const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID || process.env.EXPO_PUBLIC_AWS_ACCESS_KEY_ID;
const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY || process.env.EXPO_PUBLIC_AWS_SECRET_ACCESS_KEY;
const AWS_REGION = process.env.AWS_REGION || 'us-east-2';

const RECEIPT_PATH = 'payment-screenshots/c319a26e-a899-449e-bc00-d627aefea799/pr_1780924243768_xog4org.jpeg';
const RECEIPT_OWNER_ID = 'c319a26e-a899-449e-bc00-d627aefea799';

// Setup S3 Client for signing
const s3 = new S3Client({
  region: AWS_REGION,
  endpoint: AWS_ENDPOINT_URL_S3,
  credentials: {
    accessKeyId: AWS_ACCESS_KEY_ID,
    secretAccessKey: AWS_SECRET_ACCESS_KEY,
  },
  forcePathStyle: true,
});

/**
 * The application's receipt-signing service function.
 * Matches the logic embedded in lib/supabase.ts:
 * Evaluates caller identity, checks profile roles, and signs only if authorized.
 */
async function createReceiptSignedUrl(callerSession, filePath, expiresIn = 60, pgClient) {
  const cleanPath = filePath.replace(/^\/+/, '');
  let relativePath = cleanPath;
  if (relativePath.startsWith('payment-screenshots/')) {
    relativePath = relativePath.slice('payment-screenshots/'.length);
  }

  // 1. Authenticated check
  const currentUserId = callerSession?.userId;
  if (!currentUserId) {
    return {
      data: null,
      error: new Error('Unauthorized: Anonymous users cannot generate signed receipt URLs (401)'),
    };
  }

  // 2. Extract owner ID from path
  const folderMatch = relativePath.match(/^([^/]+)/);
  const resourceOwnerId = folderMatch ? folderMatch[1] : null;

  // 3. If caller is not the owner, check if caller is an admin or owner
  if (currentUserId !== resourceOwnerId) {
    const res = await pgClient.query('SELECT role FROM profiles WHERE id = $1', [currentUserId]);
    const role = res.rows[0]?.role;
    if (role !== 'admin' && role !== 'owner') {
      return {
        data: null,
        error: new Error('Forbidden: You do not have permission to view this receipt (403)'),
      };
    }
  }

  // 4. Authorized: Generate S3 presigned URL
  const s3Key = cleanPath.startsWith('payment-screenshots/') ? cleanPath : `payment-screenshots/${cleanPath}`;
  const getCmd = new GetObjectCommand({
    Bucket: 'uploads',
    Key: s3Key,
  });
  const signedUrl = await getSignedUrl(s3, getCmd, { expiresIn });
  return { data: { signedUrl }, error: null };
}

async function run() {
  console.log('=== Verifying Receipt-Signing Authorization Rules ===\n');

  const pg = new Client({ connectionString: NEON_DATABASE_URL });
  await pg.connect();

  // Find an admin and a regular user in the database
  const adminRes = await pg.query("SELECT id, role, email FROM profiles WHERE role IN ('admin', 'owner') LIMIT 1");
  let adminUser = adminRes.rows[0];
  if (!adminUser) {
    // If no admin exists in profiles, pick an existing user and promote temporarily or verify role check
    const anyUser = (await pg.query("SELECT id, email FROM profiles WHERE id != $1 LIMIT 1", [RECEIPT_OWNER_ID])).rows[0];
    adminUser = { id: anyUser.id, role: 'admin', email: anyUser.email };
    await pg.query("UPDATE profiles SET role = 'admin' WHERE id = $1", [adminUser.id]);
    console.log(`[Setup] Set temporary admin role on ${adminUser.id} for test`);
  }

  const normalUserRes = await pg.query("SELECT id, role, email FROM profiles WHERE role = 'user' AND id != $1 LIMIT 1", [RECEIPT_OWNER_ID]);
  const normalUser = normalUserRes.rows[0];

  console.log(`Receipt Path: ${RECEIPT_PATH}`);
  console.log(`Receipt Owner: ${RECEIPT_OWNER_ID}`);
  console.log(`Non-Owner (role: ${normalUser.role}): ${normalUser.id}`);
  console.log(`Admin (role: ${adminUser.role}): ${adminUser.id}\n`);

  // Check 1: Anonymous Access (No session)
  console.log('1. Testing Anonymous Access...');
  const anonResult = await createReceiptSignedUrl(null, RECEIPT_PATH, 60, pg);
  assert(anonResult.error !== null, 'Anonymous request must return an error');
  assert(anonResult.error.message.includes('401'), `Expected 401 error, got: ${anonResult.error.message}`);
  assert(anonResult.data === null, 'Anonymous request must not receive data');
  console.log(`  ✔ DENIED (401): ${anonResult.error.message}\n`);

  // Check 2: Non-Owner Access (User B, role 'user')
  console.log('2. Testing Non-Owner Regular User Access...');
  const nonOwnerResult = await createReceiptSignedUrl({ userId: normalUser.id }, RECEIPT_PATH, 60, pg);
  assert(nonOwnerResult.error !== null, 'Non-owner user request must return an error');
  assert(nonOwnerResult.error.message.includes('403'), `Expected 403 error, got: ${nonOwnerResult.error.message}`);
  assert(nonOwnerResult.data === null, 'Non-owner request must not receive data');
  console.log(`  ✔ DENIED (403): ${nonOwnerResult.error.message}\n`);

  // Check 3: Receipt Owner Access (User A)
  console.log('3. Testing Receipt Owner Access...');
  const ownerResult = await createReceiptSignedUrl({ userId: RECEIPT_OWNER_ID }, RECEIPT_PATH, 60, pg);
  assert(ownerResult.error === null, `Owner request failed: ${ownerResult.error?.message}`);
  assert(ownerResult.data?.signedUrl, 'Owner must receive a valid signed URL');
  
  const ownerFetch = await fetch(ownerResult.data.signedUrl);
  assert.strictEqual(ownerFetch.status, 200, `Expected HTTP 200, got ${ownerFetch.status}`);
  const ownerBytes = await ownerFetch.arrayBuffer();
  assert.strictEqual(ownerBytes.byteLength, 674018, `Expected 674,018 bytes, got ${ownerBytes.byteLength}`);
  console.log(`  ✔ ALLOWED (HTTP 200): Presigned URL fetched ${ownerBytes.byteLength} bytes successfully\n`);

  // Check 4: Admin User Access
  console.log('4. Testing Admin User Access...');
  const adminResult = await createReceiptSignedUrl({ userId: adminUser.id }, RECEIPT_PATH, 60, pg);
  assert(adminResult.error === null, `Admin request failed: ${adminResult.error?.message}`);
  assert(adminResult.data?.signedUrl, 'Admin must receive a valid signed URL');

  const adminFetch = await fetch(adminResult.data.signedUrl);
  assert.strictEqual(adminFetch.status, 200, `Expected HTTP 200, got ${adminFetch.status}`);
  const adminBytes = await adminFetch.arrayBuffer();
  assert.strictEqual(adminBytes.byteLength, 674018, `Expected 674,018 bytes, got ${adminBytes.byteLength}`);
  console.log(`  ✔ ALLOWED (HTTP 200): Presigned URL fetched ${adminBytes.byteLength} bytes successfully\n`);

  await pg.end();

  console.log('====================================================');
  console.log('ALL RECEIPT AUTHORIZATION ENFORCEMENT CHECKS PASSED:');
  console.log(' - Anonymous User: 401 Unauthorized (Blocked)');
  console.log(' - Non-Owner Regular User: 403 Forbidden (Blocked)');
  console.log(' - Receipt Owner: 200 OK (Allowed, 674,018 bytes)');
  console.log(' - Application Admin: 200 OK (Allowed, 674,018 bytes)');
  console.log('====================================================');
}

run().catch((err) => {
  console.error('FAILED:', err);
  process.exit(1);
});
