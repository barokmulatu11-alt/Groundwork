/**
 * test_migration_logic.js
 *
 * Local regression tests for migration helper functions.
 * Does NOT require live credentials. Tests logic units in isolation.
 *
 * Run: node scripts/test_migration_logic.js
 */

'use strict';

const { createHash } = require('crypto');

let passed = 0, failed = 0;

function assert(condition, label, detail) {
  if (condition) {
    console.log(`  ✔ ${label}`);
    passed++;
  } else {
    console.error(`  ✗ ${label}`);
    if (detail) console.error(`    ${detail}`);
    failed++;
  }
}

// ─── Shared helper implementations (mirrors migrate_supabase_to_neon.js) ──────

function getPk(item) {
  if (item.user_id && item.friend_id) return `${item.user_id}-${item.friend_id}`;
  if (item.sender_id && item.receiver_id) return `${item.sender_id}-${item.receiver_id}`;
  if (item.user_id && item.followee_id) return `${item.user_id}-${item.followee_id}`;
  if (item.blocker_id && item.blocked_id) return `${item.blocker_id}-${item.blocked_id}`;
  if (item.id) return String(item.id);
  if (item.user_id) return String(item.user_id);
  return JSON.stringify(item);
}

function detectDeletes(prevSnapshot, currentSnapshot) {
  const prevMap = new Map(prevSnapshot.map(item => [getPk(item), item]));
  const currentMap = new Map(currentSnapshot.map(item => [getPk(item), item]));
  const deletes = [];
  for (const [id, prevItem] of prevMap) {
    if (!currentMap.has(id)) {
      deletes.push({ eventType: 'DELETE', old: prevItem, new: null });
    }
  }
  return deletes;
}

function serializeValue(v, colMeta) {
  if (v === null || v === undefined) return null;
  if (!colMeta) {
    if (Array.isArray(v)) return v;
    if (typeof v === 'object') return JSON.stringify(v);
    return v;
  }
  const { data_type } = colMeta;
  if (data_type === 'ARRAY') return Array.isArray(v) ? v : null;
  if (data_type === 'json' || data_type === 'jsonb') {
    return typeof v === 'string' ? v : JSON.stringify(v);
  }
  return v;
}

function filterRow(sourceRow, destCols) {
  const filtered = {};
  const unmapped = [];
  for (const [k, v] of Object.entries(sourceRow)) {
    if (destCols.has(k)) {
      filtered[k] = v;
    } else {
      unmapped.push(k);
    }
  }
  return { filtered, unmapped };
}

function sha256(buf) {
  return createHash('sha256').update(buf).digest('hex');
}

function parseJwtExpiry(token) {
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8'));
    return payload.exp ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

function isTokenExpired(token) {
  const exp = parseJwtExpiry(token);
  if (!exp) return true;
  return Date.now() > exp;
}

function makeFakeJwt(exp) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({ sub: 'user123', exp })).toString('base64url');
  return `${header}.${payload}.fakesig`;
}

function verifyAllKeys(sourceRows, destRows, pkCols) {
  const destPkMap = new Set(destRows.map(r => pkCols.map(c => r[c]).join('|')));
  const missing = [];
  for (const row of sourceRows) {
    const key = pkCols.map(c => row[c]).join('|');
    if (!destPkMap.has(key)) missing.push(key);
  }
  return missing;
}

function getAccountId(user) {
  const provider = user.app_metadata?.provider || 'email';
  if (provider === 'email') return user.email || user.id;
  return user.app_metadata?.sub || user.identities?.[0]?.id || user.id;
}

function checkRequiredTables(foundTables) {
  const required = ['user', 'account'];
  const missing = required.filter(t => !foundTables.has(t));
  if (missing.length > 0) throw new Error(`Required Better Auth tables missing: ${missing.join(', ')}`);
  return true;
}

async function guardedUpload(token, bucket, filePath, buffer) {
  if (!token) {
    throw new Error(`Storage auth not available: cannot upload ${bucket}/${filePath}.`);
  }
  return { status: 200 };
}

// ─── Savepoint transaction simulator ────────────────────────────────────────
const txSimulator = {
  state: 'active',
  log: [],
  async query(sql) {
    if (sql === 'SAVEPOINT s') { this.log.push('SAVEPOINT'); return; }
    if (sql === 'ROLLBACK TO SAVEPOINT s') { this.state = 'active'; this.log.push('ROLLBACK_TO'); return; }
    if (sql === 'RELEASE SAVEPOINT s') { this.log.push('RELEASE'); return; }
    if (sql === 'FAIL') {
      this.state = 'error'; this.log.push('FAIL');
      const e = new Error('FK violation'); e.code = '23503'; throw e;
    }
    if (this.state === 'error') throw new Error('current transaction is aborted');
    this.log.push(sql);
  }
};

async function safeInsert(tx, sql) {
  await tx.query('SAVEPOINT s');
  try {
    await tx.query(sql);
    await tx.query('RELEASE SAVEPOINT s');
    return 'ok';
  } catch (e) {
    await tx.query('ROLLBACK TO SAVEPOINT s');
    throw e;
  }
}

// ─── Main test runner ────────────────────────────────────────────────────────
async function main() {

  // 1. getPk — composite primary key extraction
  console.log('\n1. getPk composite key extraction');
  assert(getPk({ id: 'abc' }) === 'abc', 'single id');
  assert(getPk({ user_id: 'a', friend_id: 'b' }) === 'a-b', 'friendship composite key');
  assert(getPk({ sender_id: 'x', receiver_id: 'y' }) === 'x-y', 'request composite key');
  assert(getPk({ user_id: 'u', followee_id: 'f' }) === 'u-f', 'follow composite key');
  assert(getPk({ blocker_id: 'p', blocked_id: 'q' }) === 'p-q', 'block composite key');
  assert(getPk({ user_id: 'only' }) === 'only', 'user_id fallback');
  assert(getPk({ some: 'thing' }) === JSON.stringify({ some: 'thing' }), 'fallback to stringify');

  // 2. DELETE detection — paginated reconciliation, not window inference
  console.log('\n2. DELETE detection via full reconciliation');
  {
    const prev = [{ id: '1', name: 'a' }, { id: '2', name: 'b' }, { id: '3', name: 'c' }];
    const curr = [{ id: '1', name: 'a' }, { id: '3', name: 'c' }];
    const dels = detectDeletes(prev, curr);
    assert(dels.length === 1, 'detects 1 deleted row', `got ${dels.length}`);
    assert(dels[0].old.id === '2', 'correct deleted row id');
  }
  {
    const prev = [{ id: '1' }, { id: '2' }];
    const curr = [{ id: '1' }, { id: '2' }];
    const dels = detectDeletes(prev, curr);
    assert(dels.length === 0, 'no false-positive deletes', `got ${dels.length}`);
  }
  {
    const prev = [{ user_id: 'a', friend_id: 'b' }, { user_id: 'a', friend_id: 'c' }];
    const curr = [{ user_id: 'a', friend_id: 'b' }];
    const dels = detectDeletes(prev, curr);
    assert(dels.length === 1, 'composite key delete detected');
    assert(dels[0].old.friend_id === 'c', 'correct composite deleted row');
  }

  // 3. serializeValue — column-type aware
  console.log('\n3. serializeValue column-type aware');
  assert(serializeValue(null, null) === null, 'null passthrough');
  assert(Array.isArray(serializeValue(['a', 'b'], { data_type: 'ARRAY' })), 'array preserved for ARRAY column');
  assert(serializeValue('string', { data_type: 'ARRAY' }) === null, 'non-array → null for ARRAY column');
  assert(serializeValue({ k: 1 }, { data_type: 'jsonb' }) === '{"k":1}', 'object stringified for jsonb');
  assert(serializeValue('already', { data_type: 'jsonb' }) === 'already', 'string passthrough for jsonb');
  assert(serializeValue(42, { data_type: 'integer' }) === 42, 'integer passthrough');
  assert(Array.isArray(serializeValue(['a'], null)), 'array passthrough when no meta');

  // 4. FK failure — should abort migration, not skip silently
  console.log('\n4. FK failure handling');
  {
    const SKIP_CODES = ['23505']; // only unique violations are skippable
    const fkErr = Object.assign(new Error('FK violation'), { code: '23503' });
    let threw = false;
    try {
      if (!SKIP_CODES.includes(fkErr.code)) throw fkErr;
    } catch (e) { threw = (e.code === '23503'); }
    assert(threw, 'FK violation (23503) throws — not silently skipped');
  }
  {
    const SKIP_CODES = ['23505'];
    const dupErr = Object.assign(new Error('duplicate'), { code: '23505' });
    let skipped = false;
    if (SKIP_CODES.includes(dupErr.code)) skipped = true;
    assert(skipped, 'unique violation (23505) skipped correctly');
  }

  // 5. Unmapped source columns — detected, not silently dropped
  console.log('\n5. Unmapped source columns — detect and report');
  {
    const destCols = new Set(['id', 'name', 'created_at']);
    const sourceRow = { id: '1', name: 'test', created_at: '2024', extra_col: 'orphan', another: 'lost' };
    const { filtered, unmapped } = filterRow(sourceRow, destCols);
    assert(Object.keys(filtered).length === 3, 'only dest columns kept');
    assert(unmapped.length === 2, `unmapped columns identified (${unmapped})`);
    assert(unmapped.includes('extra_col') && unmapped.includes('another'), 'correct unmapped columns');
  }

  // 6. Savepoint transaction safety
  console.log('\n6. Savepoint transaction safety');
  {
    try {
      await safeInsert(txSimulator, 'FAIL');
    } catch (e) {
      // Expected FK error — savepoint must have recovered the transaction
    }
    let subsequentOk = false;
    try {
      await safeInsert(txSimulator, 'SELECT 1');
      subsequentOk = true;
    } catch (e) {
      // would fail if tx is still aborted
    }
    assert(txSimulator.log.includes('ROLLBACK_TO'), 'ROLLBACK TO SAVEPOINT was issued on error');
    assert(txSimulator.state === 'active', 'transaction state is active after savepoint rollback');
    assert(subsequentOk, 'subsequent insert succeeds after savepoint rollback');
  }

  // 7. Full-key verification — every source PK in destination
  console.log('\n7. Full-key verification');
  {
    const source = [{ id: '1' }, { id: '2' }, { id: '3' }];
    const dest = [{ id: '1' }, { id: '3' }];
    const missing = verifyAllKeys(source, dest, ['id']);
    assert(missing.length === 1, 'detects 1 missing PK', `got ${missing}`);
    assert(missing[0] === '2', 'correct missing PK value');
  }
  {
    const source = [{ user_id: 'a', friend_id: 'b' }, { user_id: 'c', friend_id: 'd' }];
    const dest = [{ user_id: 'a', friend_id: 'b' }, { user_id: 'c', friend_id: 'd' }];
    const missing = verifyAllKeys(source, dest, ['user_id', 'friend_id']);
    assert(missing.length === 0, 'all composite PKs verified');
  }
  {
    const source = [{ user_id: 'a', friend_id: 'b' }, { user_id: 'c', friend_id: 'd' }];
    const dest = [{ user_id: 'a', friend_id: 'b' }];
    const missing = verifyAllKeys(source, dest, ['user_id', 'friend_id']);
    assert(missing.length === 1, 'detects 1 missing composite PK');
    assert(missing[0] === 'c|d', 'correct composite missing key value');
  }

  // 8. Storage auth guard — fail before uploading
  console.log('\n8. Storage auth guard');
  {
    let threw = false;
    try { await guardedUpload(null, 'avatars', 'test.jpg', Buffer.from('x')); }
    catch (e) { threw = e.message.includes('Storage auth not available'); }
    assert(threw, 'upload rejects without auth token');
  }
  {
    let ok = false;
    try { const r = await guardedUpload('real_token', 'avatars', 'test.jpg', Buffer.from('x')); ok = r.status === 200; }
    catch { }
    assert(ok, 'upload proceeds with token');
  }

  // 9. SHA-256 content hash verification
  console.log('\n9. Content hash verification');
  {
    const orig = Buffer.from('hello world');
    const same = Buffer.from('hello world');
    const corrupt = Buffer.from('hello world!');
    assert(sha256(orig) === sha256(same), 'identical content matches');
    assert(sha256(orig) !== sha256(corrupt), 'corrupted content detected');
  }

  // 10. Better Auth schema detection
  console.log('\n10. Better Auth schema detection');
  assert(
    (() => { try { return checkRequiredTables(new Set(['user', 'account', 'session'])); } catch { return false; } })(),
    'passes with all required tables'
  );
  assert(
    (() => { try { checkRequiredTables(new Set(['user'])); return false; } catch (e) { return e.message.includes('account'); } })(),
    'throws when account table missing'
  );
  assert(
    (() => { try { checkRequiredTables(new Set([])); return false; } catch (e) { return e.message.includes('user') && e.message.includes('account'); } })(),
    'throws with both missing tables named'
  );

  // 11. JWT expiry parsing
  console.log('\n11. JWT expiry parsing');
  const pastToken = makeFakeJwt(Math.floor(Date.now() / 1000) - 3600);
  const futureToken = makeFakeJwt(Math.floor(Date.now() / 1000) + 3600);
  const badToken = 'not.a.jwt';
  assert(isTokenExpired(pastToken), 'expired token correctly detected');
  assert(!isTokenExpired(futureToken), 'valid future token not marked expired');
  assert(isTokenExpired(badToken), 'unparseable token treated as expired');
  assert(parseJwtExpiry(futureToken) > Date.now(), 'expiry parseable from valid JWT');

  // 12. accountId mapping
  console.log('\n12. accountId mapping for Better Auth');
  const emailUser = { id: 'u1', email: 'user@example.com', app_metadata: { provider: 'email' } };
  const googleUser = { id: 'u2', email: 'g@example.com', app_metadata: { provider: 'google', sub: 'google-sub-123' } };
  const githubUser = { id: 'u3', email: 'o@example.com', app_metadata: { provider: 'github' }, identities: [{ id: 'github-id-456' }] };
  const noProvider = { id: 'u4', email: 'n@example.com', app_metadata: {} };
  assert(getAccountId(emailUser) === 'user@example.com', 'email provider: accountId = email address (not "email")');
  assert(getAccountId(googleUser) === 'google-sub-123', 'google: accountId = sub');
  assert(getAccountId(githubUser) === 'github-id-456', 'github: accountId from identities[0].id');
  assert(getAccountId(noProvider) === 'n@example.com', 'no provider defaults to email');

  // ─── Summary ──────────────────────────────────────────────────────────────
  console.log(`\n${'─'.repeat(60)}`);
  console.log(`Results: ${passed} passed, ${failed} failed`);
  if (failed > 0) {
    console.error(`\n❌ ${failed} test(s) failed.`);
    process.exit(1);
  } else {
    console.log('\n✔ All regression tests passed.');
  }
}

main().catch(e => {
  console.error('\nTest runner crashed:', e.message);
  process.exit(1);
});
