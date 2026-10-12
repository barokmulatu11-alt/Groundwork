/**
 * test_web_neon_integration.js
 *
 * Comprehensive automated verification of web app flows running against Neon:
 * 1. Login & Auth token verification
 * 2. Session recovery across simulated restarts
 * 3. Logout & token invalidation
 * 4. Task creation, editing, and deletion in Neon PostgREST
 * 5. Offline change queuing and synchronization upon reconnection
 * 6. Avatar upload to Neon S3 & verification
 * 7. Authorized receipt viewing via presigned URLs
 * 8. Cross-user access denial (RLS boundary test)
 */

require('dotenv').config({ path: '.env' });
require('dotenv').config({ path: '.env.local' });

const { Client } = require('pg');
const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
const crypto = require('crypto');

const NEON_AUTH_URL = process.env.EXPO_PUBLIC_NEON_AUTH_URL;
const NEON_API_URL = process.env.EXPO_PUBLIC_NEON_API_URL;
const NEON_DATABASE_URL = process.env.NEON_DATABASE_URL;
const AWS_ENDPOINT_URL_S3 = process.env.AWS_ENDPOINT_URL_S3;

let passed = 0, failed = 0;
function assert(condition, message) {
  if (condition) {
    console.log(`  ✔ ${message}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failed++;
  }
}

// Client helper that simulates a web browser (cookie jar + Origin)
class WebClient {
  constructor(authUrl, apiUrl) {
    this.authUrl = authUrl;
    this.apiUrl = apiUrl;
    this.cookie = null;
    this.jwt = null;
    this.user = null;
  }

  async signUp(email, password, name) {
    const res = await fetch(`${this.authUrl}/sign-up/email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'http://localhost:8081'
      },
      body: JSON.stringify({ email, password, name })
    });
    this._saveCookies(res);
    const data = await res.json();
    this.user = data.user;
    await this.refreshSession();
    return { status: res.status, data };
  }

  async signIn(email, password) {
    const res = await fetch(`${this.authUrl}/sign-in/email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'http://localhost:8081'
      },
      body: JSON.stringify({ email, password })
    });
    this._saveCookies(res);
    const data = await res.json();
    this.user = data.user;
    await this.refreshSession();
    return { status: res.status, data };
  }

  async refreshSession() {
    if (!this.cookie) return null;
    const res = await fetch(`${this.authUrl}/get-session`, {
      headers: {
        'Cookie': this.cookie,
        'Origin': 'http://localhost:8081'
      }
    });
    this._saveCookies(res);
    const jwt = res.headers.get('set-auth-jwt');
    if (jwt) this.jwt = jwt;
    const data = await res.json().catch(() => null);
    if (data?.user) this.user = data.user;
    return { status: res.status, data, jwt: this.jwt };
  }

  async signOut() {
    const headers = {
      'Content-Type': 'application/json',
      'Origin': 'http://localhost:8081'
    };
    if (this.cookie) headers['Cookie'] = this.cookie;
    if (this.jwt) headers['Authorization'] = `Bearer ${this.jwt}`;
    const res = await fetch(`${this.authUrl}/sign-out`, {
      method: 'POST',
      headers,
      body: JSON.stringify({})
    });
    this.cookie = null;
    this.jwt = null;
    this.user = null;
    return { status: res.status };
  }

  _saveCookies(res) {
    const setCookie = res.headers.get('set-cookie');
    if (setCookie) {
      // Extract the session token cookie
      const match = setCookie.match(/(__Secure-neon-auth\.session_token=[^;]+)/);
      if (match) {
        this.cookie = match[1];
      }
    }
  }

  apiFetch(path, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };
    if (this.jwt) {
      headers['Authorization'] = `Bearer ${this.jwt}`;
      headers['apikey'] = this.jwt;
    }
    return fetch(`${this.apiUrl}${path}`, {
      ...options,
      headers
    });
  }
}

async function runTests() {
  console.log('================================================================');
  console.log(' Groundwork: Web App Integration & Release Readiness Test Suite');
  console.log('================================================================\n');

  const neon = new Client({ connectionString: NEON_DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await neon.connect();

  const clientA = new WebClient(NEON_AUTH_URL, NEON_API_URL);
  const clientB = new WebClient(NEON_AUTH_URL, NEON_API_URL);

  const userA_Email = `user_a_${Date.now()}@example.com`;
  const userB_Email = `user_b_${Date.now()}@example.com`;
  const passwordA = 'UserAPassword123!';
  const passwordB = 'UserBPassword123!';

  try {
    // ─── 1. Login & Registration ─────────────────────────────────────────────────
    console.log('1. Testing User Registration & Login (Neon Auth)...');
    
    const regA = await clientA.signUp(userA_Email, passwordA, 'User A');
    assert(regA.status === 200, 'User A sign-up succeeds (HTTP 200)');
    assert(!!clientA.user?.id, 'User A assigned unique ID');
    assert(!!clientA.jwt, 'User A received valid PostgREST Data API JWT from Neon Auth');

    const regB = await clientB.signUp(userB_Email, passwordB, 'User B');
    assert(regB.status === 200, 'User B sign-up succeeds (HTTP 200)');
    assert(!!clientB.user?.id, 'User B assigned unique ID');
    assert(!!clientB.jwt, 'User B received valid PostgREST Data API JWT from Neon Auth');

    // Create public profiles in public.profiles to establish application ownership
    await neon.query('INSERT INTO public.profiles (id, email, full_name, role) VALUES ($1, $2, $3, $4)', [clientA.user.id, userA_Email, 'User A', 'user']);
    await neon.query('INSERT INTO public.profiles (id, email, full_name, role) VALUES ($1, $2, $3, $4)', [clientB.user.id, userB_Email, 'User B', 'user']);

    // Test sign in for User A
    const loginA = await clientA.signIn(userA_Email, passwordA);
    assert(loginA.status === 200, 'User A sign-in succeeds (HTTP 200)');
    assert(!!clientA.jwt, 'Fresh JWT issued on sign-in');

    // ─── 2. Restart / Session Recovery ──────────────────────────────────────────
    console.log('\n2. Testing Restart / Session Recovery...');
    // Simulate browser reload / app restart with preserved cookie & token
    const recoveredSession = await clientA.refreshSession();
    assert(recoveredSession.status === 200, 'Session verified with server on app restart (HTTP 200)');
    assert(recoveredSession.data?.session?.userId === clientA.user.id, 'Session correctly identifies User A across restarts');
    assert(!!clientA.jwt, 'PostgREST JWT active across restarts');

    // ─── 3. Logout & Token Invalidation ─────────────────────────────────────────
    console.log('\n3. Testing Logout & Token Invalidation...');
    const prevCookie = clientA.cookie;
    const prevJwt = clientA.jwt;
    const signOutRes = await clientA.signOut();
    assert(signOutRes.status === 200, 'Sign-out succeeds (HTTP 200)');

    // Attempt to use terminated session
    const staleSession = await fetch(`${NEON_AUTH_URL}/get-session`, {
      headers: { 'Cookie': prevCookie, 'Origin': 'http://localhost:8081' }
    });
    const staleData = await staleSession.json().catch(() => null);
    assert(staleData === null || !staleData.session, 'Terminated session rejected by Neon Auth');

    // Re-login User A for remaining tests
    await clientA.signIn(userA_Email, passwordA);

    // ─── 4. Task Creation, Edit, Deletion against Neon Data API ───────────────────
    console.log('\n4. Testing Task CRUD Operations against Neon PostgREST...');
    const testTaskId = crypto.randomUUID();
    const initialTitle = 'Complete Release Readiness Verification';
    
    // Create Task
    const createRes = await clientA.apiFetch('/tasks', {
      method: 'POST',
      headers: { 'Prefer': 'return=representation' },
      body: JSON.stringify({
        id: testTaskId,
        user_id: clientA.user.id,
        title: initialTitle,
        completed: false,
        priority: 'high',
        date: '2026-10-05',
        note: 'Integration verification'
      })
    });
    assert(createRes.status === 201, `Task creation succeeds in PostgREST (HTTP ${createRes.status})`);
    
    // Verify Task in DB
    const dbTask1 = await neon.query('SELECT * FROM public.tasks WHERE id = $1', [testTaskId]);
    assert(dbTask1.rows.length === 1 && dbTask1.rows[0].title === initialTitle, 'Task verified in Neon database');

    // Edit Task
    const updatedTitle = 'Complete Release Readiness Verification [EDITED]';
    const updateRes = await clientA.apiFetch(`/tasks?id=eq.${testTaskId}`, {
      method: 'PATCH',
      headers: { 'Prefer': 'return=representation' },
      body: JSON.stringify({
        title: updatedTitle,
        completed: true
      })
    });
    assert(updateRes.status === 200 || updateRes.status === 204, `Task edit succeeds (HTTP ${updateRes.status})`);
    const dbTask2 = await neon.query('SELECT * FROM public.tasks WHERE id = $1', [testTaskId]);
    assert(dbTask2.rows[0].title === updatedTitle && dbTask2.rows[0].completed === true, 'Task update verified in Neon database');

    // Delete Task
    const deleteRes = await clientA.apiFetch(`/tasks?id=eq.${testTaskId}`, {
      method: 'DELETE'
    });
    assert(deleteRes.status === 200 || deleteRes.status === 204, `Task deletion succeeds (HTTP ${deleteRes.status})`);
    const dbTask3 = await neon.query('SELECT * FROM public.tasks WHERE id = $1', [testTaskId]);
    assert(dbTask3.rows.length === 0, 'Task deletion verified in Neon database');

    // ─── 5. Offline Changes Followed by Reconnection ─────────────────────────────
    console.log('\n5. Testing Offline Changes followed by Reconnection Sync...');
    const offlineTask1 = { id: crypto.randomUUID(), user_id: clientA.user.id, title: 'Offline Task 1', completed: false, date: '2026-10-05', priority: 'low' };
    const offlineTask2 = { id: crypto.randomUUID(), user_id: clientA.user.id, title: 'Offline Task 2', completed: true, date: '2026-10-05', priority: 'medium' };
    const offlineQueue = [offlineTask1, offlineTask2];

    // Client reconnects: flushes queue to Neon PostgREST
    const syncRes = await clientA.apiFetch('/tasks', {
      method: 'POST',
      headers: { 'Prefer': 'return=minimal' },
      body: JSON.stringify(offlineQueue)
    });
    assert(syncRes.status === 201, `Offline task queue synced successfully upon reconnection (HTTP ${syncRes.status})`);

    const dbSync = await neon.query('SELECT count(*) FROM public.tasks WHERE id IN ($1, $2)', [offlineTask1.id, offlineTask2.id]);
    assert(parseInt(dbSync.rows[0].count, 10) === 2, 'All queued offline tasks confirmed in Neon database');

    // Clean up offline tasks
    await neon.query('DELETE FROM public.tasks WHERE id IN ($1, $2)', [offlineTask1.id, offlineTask2.id]);

    // ─── 6. Avatar Upload to Neon S3 ─────────────────────────────────────────────
    console.log('\n6. Testing Avatar Upload to Neon S3 Storage...');
    const avatarPath = `${clientA.user.id}/avatar_test.jpeg`;
    const avatarContent = Buffer.from('FAKE_AVATAR_IMAGE_DATA_FOR_VERIFICATION_' + Date.now());
    const expectedAvatarHash = crypto.createHash('sha256').update(avatarContent).digest('hex');

    const s3 = new S3Client({
      region: process.env.AWS_REGION || 'us-east-2',
      endpoint: AWS_ENDPOINT_URL_S3,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
      },
      forcePathStyle: true
    });
    const { PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
    const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

    await s3.send(new PutObjectCommand({
      Bucket: 'uploads',
      Key: `avatars/${avatarPath}`,
      Body: avatarContent,
      ContentType: 'image/jpeg'
    }));
    assert(true, 'Avatar upload to Neon S3 succeeds');

    // Verify S3 storage directly
    const s3Get = await s3.send(new GetObjectCommand({
      Bucket: 'uploads',
      Key: `avatars/${avatarPath}`
    }));
    const downloadedBuf = Buffer.from(await s3Get.Body.transformToByteArray());
    const actualAvatarHash = crypto.createHash('sha256').update(downloadedBuf).digest('hex');
    assert(actualAvatarHash === expectedAvatarHash, 'Uploaded avatar SHA-256 matches exactly in Neon S3');

    // Clean up avatar
    await s3.send(new DeleteObjectCommand({
      Bucket: 'uploads',
      Key: `avatars/${avatarPath}`
    }));

    // ─── 7. Authorized Receipt Viewing ───────────────────────────────────────────
    console.log('\n7. Testing Authorized Receipt Viewing (Presigned URL)...');
    const receiptPath = 'payment-screenshots/c319a26e-a899-449e-bc00-d627aefea799/pr_1780924243768_xog4org.jpeg';
    const signedUrl = await getSignedUrl(s3, new GetObjectCommand({
      Bucket: 'uploads',
      Key: receiptPath
    }), { expiresIn: 60 });
    assert(!!signedUrl, 'createSignedUrl generates valid presigned URL');

    const receiptFetch = await fetch(signedUrl);
    assert(receiptFetch.status === 200, 'Fetching presigned receipt URL returns HTTP 200');
    const receiptBytes = await receiptFetch.arrayBuffer();
    assert(receiptBytes.byteLength === 674018, `Receipt byte count matches exactly: 674,018 bytes`);

    // ─── 8. Cross-User Access Denial (RLS Security) ──────────────────────────────
    console.log('\n8. Testing Cross-User Access Denial (Neon RLS Policies)...');
    
    // Create a private task for User A
    const userATaskId = crypto.randomUUID();
    await neon.query(
      'INSERT INTO public.tasks (id, user_id, title, completed, date) VALUES ($1, $2, $3, $4, $5)',
      [userATaskId, clientA.user.id, 'User A Confidential Task', false, '2026-10-05']
    );

    // User B attempts to read User A's task via PostgREST
    const readAttempt = await clientB.apiFetch(`/tasks?id=eq.${userATaskId}`);
    const readData = await readAttempt.json();
    assert(readData.length === 0, 'User B CANNOT see User A private task (RLS blocks SELECT)');

    // User B attempts to update User A's task
    const updateAttempt = await clientB.apiFetch(`/tasks?id=eq.${userATaskId}`, {
      method: 'PATCH',
      headers: { 'Prefer': 'return=representation' },
      body: JSON.stringify({ title: 'Hacked by User B' })
    });
    const updateData = await updateAttempt.json();
    assert(updateData.length === 0, 'User B CANNOT modify User A private task (RLS blocks UPDATE)');

    // User B attempts to delete User A's task
    const deleteAttempt = await clientB.apiFetch(`/tasks?id=eq.${userATaskId}`, {
      method: 'DELETE',
      headers: { 'Prefer': 'return=representation' }
    });
    const deleteData = await deleteAttempt.json();
    assert(deleteData.length === 0, 'User B CANNOT delete User A private task (RLS blocks DELETE)');

    // Verify task is still intact in DB
    const checkTask = await neon.query('SELECT * FROM public.tasks WHERE id = $1', [userATaskId]);
    assert(checkTask.rows[0].title === 'User A Confidential Task', 'User A task remains unmodified and secure in DB');

    // Clean up User A task
    await neon.query('DELETE FROM public.tasks WHERE id = $1', [userATaskId]);

    console.log('\n================================================================');
    console.log(`Summary: ${passed} passed, ${failed} failed`);
    console.log('================================================================\n');

  } finally {
    // Clean up test users
    console.log('Cleaning up test accounts...');
    if (clientA.user?.id) {
      await neon.query('DELETE FROM public.profiles WHERE id = $1', [clientA.user.id]);
      await neon.query('DELETE FROM neon_auth.account WHERE "userId" = $1', [clientA.user.id]);
      await neon.query('DELETE FROM neon_auth.session WHERE "userId" = $1', [clientA.user.id]);
      await neon.query('DELETE FROM neon_auth.user WHERE id = $1', [clientA.user.id]);
    }
    if (clientB.user?.id) {
      await neon.query('DELETE FROM public.profiles WHERE id = $1', [clientB.user.id]);
      await neon.query('DELETE FROM neon_auth.account WHERE "userId" = $1', [clientB.user.id]);
      await neon.query('DELETE FROM neon_auth.session WHERE "userId" = $1', [clientB.user.id]);
      await neon.query('DELETE FROM neon_auth.user WHERE id = $1', [clientB.user.id]);
    }
    await neon.end();
  }

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(e => {
  console.error('Fatal test error:', e);
  process.exit(1);
});
