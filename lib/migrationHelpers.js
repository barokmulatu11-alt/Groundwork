'use strict';
/**
 * lib/migrationHelpers.js
 *
 * Shared, importable helpers used by both the migration script and the test suite.
 * All functions are pure (no side effects, no external I/O) unless explicitly noted.
 * External services (Postgres, S3, Supabase) are injected as parameters so callers
 * can substitute mocks in tests.
 */

const { createHash } = require('crypto');
const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');

// ─── Primary key extraction ───────────────────────────────────────────────────

/**
 * Derive a stable string key for a row based on known composite-PK patterns.
 * Order of checks matters: more-specific composite keys first.
 */
function getPk(item) {
  if (item.user_id && item.friend_id)    return `${item.user_id}-${item.friend_id}`;
  if (item.sender_id && item.receiver_id) return `${item.sender_id}-${item.receiver_id}`;
  if (item.user_id && item.followee_id)  return `${item.user_id}-${item.followee_id}`;
  if (item.blocker_id && item.blocked_id) return `${item.blocker_id}-${item.blocked_id}`;
  if (item.id)      return String(item.id);
  if (item.user_id) return String(item.user_id);
  return JSON.stringify(item);
}

// ─── Polling: snapshot diff ───────────────────────────────────────────────────

/**
 * Compute INSERT / UPDATE / DELETE events from two consecutive polling snapshots.
 *
 * DELETE detection contract:
 *  - Only called for filtered subscriptions (isFiltered = true).
 *  - For unfiltered DESC-ordered snapshots, passing isFiltered = false suppresses
 *    DELETEs entirely: a record absent from the window is not necessarily deleted.
 *
 * @param {any[]} prevSnapshot   - Previous poll result.
 * @param {any[]} currentSnapshot - Current poll result.
 * @param {{ event: string; table: string; schema: string }} listener
 * @param {boolean} isFiltered   - True if the subscription is row-scoped (e.g. user_id=eq.xxx).
 * @returns {{ eventType: 'INSERT'|'UPDATE'|'DELETE', new: any|null, old: any|null }[]}
 */
function diffSnapshots(prevSnapshot, currentSnapshot, listener, isFiltered) {
  const prevMap    = new Map(prevSnapshot.map(item => [getPk(item), item]));
  const currentMap = new Map(currentSnapshot.map(item => [getPk(item), item]));
  const events = [];

  for (const [id, currentItem] of currentMap) {
    const prevItem = prevMap.get(id);
    if (!prevItem) {
      if (listener.event === '*' || listener.event === 'INSERT') {
        events.push({ eventType: 'INSERT', new: currentItem, old: null, table: listener.table, schema: listener.schema });
      }
    } else if (JSON.stringify(currentItem) !== JSON.stringify(prevItem)) {
      if (listener.event === '*' || listener.event === 'UPDATE') {
        events.push({ eventType: 'UPDATE', new: currentItem, old: prevItem, table: listener.table, schema: listener.schema });
      }
    }
  }

  // DELETE: only safe when isFiltered = true (all rows for the scope are present)
  if (isFiltered && (listener.event === '*' || listener.event === 'DELETE')) {
    for (const [id, prevItem] of prevMap) {
      if (!currentMap.has(id)) {
        events.push({ eventType: 'DELETE', new: null, old: prevItem, table: listener.table, schema: listener.schema });
      }
    }
  }

  return events;
}

// ─── Value serialization ──────────────────────────────────────────────────────

/**
 * Serialize a source value to match the destination Postgres column type.
 * @param {any} v
 * @param {{ data_type: string, udt_name: string } | null} colMeta
 */
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

// ─── Row filtering ────────────────────────────────────────────────────────────

/**
 * Split a source row into columns that exist in the destination and those that don't.
 * @param {Record<string, any>} sourceRow
 * @param {Set<string>} destCols
 * @returns {{ filtered: Record<string, any>, unmapped: string[] }}
 */
function filterRow(sourceRow, destCols) {
  const filtered = {};
  const unmapped = [];
  for (const [k, v] of Object.entries(sourceRow)) {
    if (destCols.has(k)) filtered[k] = v;
    else unmapped.push(k);
  }
  return { filtered, unmapped };
}

// ─── Content hashing ──────────────────────────────────────────────────────────

/** @param {Buffer} buf */
function sha256(buf) {
  return createHash('sha256').update(buf).digest('hex');
}

// ─── JWT utilities ────────────────────────────────────────────────────────────

/**
 * Decode the `exp` claim from a JWT without verifying the signature.
 * @param {string} token
 * @returns {number|null} Expiry in milliseconds since epoch, or null if unparseable.
 */
function parseJwtExpiry(token) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
    return payload.exp ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

/**
 * @param {string} token
 * @param {number} [clockSkewMs=30000]
 * @returns {boolean} True if the token is expired or unparseable.
 */
function isJwtExpired(token, clockSkewMs = 30_000) {
  const exp = parseJwtExpiry(token);
  if (!exp) return true;
  return Date.now() >= exp - clockSkewMs;
}

// ─── Auth schema detection ────────────────────────────────────────────────────

/**
 * Ensure all required Better Auth tables are present.
 * @param {Set<string>} foundTables
 * @throws if any required table is absent.
 */
function assertRequiredAuthTables(foundTablesMap) {
  const required = ['user', 'account'];
  const missing = required.filter(t => !foundTablesMap[t]);
  if (missing.length > 0) {
    throw new Error(`Required Better Auth tables missing from destination: ${missing.join(', ')}`);
  }
}

// ─── Provider account mapping ─────────────────────────────────────────────────

/**
 * Derive the Better Auth `accountId` for a Supabase auth user.
 * - email provider → user's email address (NOT the string "email")
 * - OAuth providers → OAuth subject from app_metadata.sub or identities[0].id
 * @param {{ email?: string; id: string; app_metadata?: any; identities?: any[] }} user
 * @returns {string}
 */
function getAccountId(user) {
  const provider = user.app_metadata?.provider || 'email';
  if (provider === 'email') return user.email || user.id;
  return user.app_metadata?.sub || user.identities?.[0]?.id || user.id;
}

// ─── Storage authentication guard removed since we use S3 credentials ─────────

// ─── Upload + verify ──────────────────────────────────────────────────────────

/**
 * Upload a buffer to Neon S3 using AWS SDK.
 * @param {S3Client} s3Client
 * @param {string} bucket
 * @param {string} filePath
 * @param {Buffer} buffer
 * @param {string} contentType
 */
async function uploadToS3(s3Client, bucket, filePath, buffer, contentType) {
  // If destination only has an 'uploads' bucket, we map bucket/filePath to uploads/bucket/filePath
  const destBucket = 'uploads';
  const destKey = `${bucket}/${filePath}`;
  
  await s3Client.send(new PutObjectCommand({
    Bucket: destBucket,
    Key: destKey,
    Body: buffer,
    ContentType: contentType || 'application/octet-stream',
  }));
}

/**
 * Verify an uploaded file by downloading it with AWS SDK and comparing SHA-256.
 * @param {S3Client} s3Client
 * @param {string} bucket
 * @param {string} filePath
 * @param {Buffer} originalBuffer
 */
async function verifyS3Upload(s3Client, bucket, filePath, originalBuffer) {
  const destBucket = 'uploads';
  const destKey = `${bucket}/${filePath}`;
  
  const res = await s3Client.send(new GetObjectCommand({
    Bucket: destBucket,
    Key: destKey,
  }));
  
  const downloadedBuf = Buffer.from(await res.Body.transformToByteArray());
  const origHash = sha256(originalBuffer);
  const dlHash   = sha256(downloadedBuf);
  if (origHash !== dlHash) {
    throw new Error(
      `Hash mismatch for ${bucket}/${filePath}! ` +
      `Original: ${origHash.substring(0, 8)}... ` +
      `Downloaded: ${dlHash.substring(0, 8)}...`
    );
  }
}


// ─── PK verification ──────────────────────────────────────────────────────────

/**
 * For every row in sourceRows, assert its primary key exists in destRows.
 * Also checks that a specific set of field values match (not just key presence).
 *
 * @param {any[]} sourceRows
 * @param {any[]} destRows
 * @param {string[]} pkCols     - Columns forming the primary key.
 * @param {string[]} verifyFields - Additional field names to value-check.
 * @returns {{ missingKeys: string[], valueMismatches: { pk: string; field: string; src: any; dst: any }[] }}
 */
function verifyRowsComplete(sourceRows, destRows, pkCols, verifyFields = []) {
  const destByPk = new Map(
    destRows.map(r => [pkCols.map(c => r[c]).join('|'), r])
  );

  const missingKeys = [];
  const valueMismatches = [];

  const normalize = (v) => {
    if (v instanceof Date) return v.toISOString();
    if (typeof v === 'string' && v.length >= 19 && (v[10] === 'T' || v[10] === ' ') && v[13] === ':') {
      const d = new Date(v);
      if (!isNaN(d.valueOf())) return d.toISOString();
    }
    if (v === null || v === undefined) return null;
    if (Array.isArray(v)) return v.length === 0 ? null : v.join(',');
    if (typeof v === 'string' && v.startsWith('{') && v.endsWith('}')) {
      const inner = v.slice(1, -1).replace(/"/g, '');
      return inner === '' ? null : inner;
    }
    if (typeof v === 'number') return v.toString();
    return v;
  };

  for (const srcRow of sourceRows) {
    const pk = pkCols.map(c => srcRow[c]).join('|');
    const dstRow = destByPk.get(pk);
    if (!dstRow) {
      missingKeys.push(pk);
      continue;
    }
    for (const field of verifyFields) {
      const sv = normalize(srcRow[field]);
      const dv = normalize(dstRow[field]);
      // Use JSON comparison to handle objects/arrays
      if (JSON.stringify(sv) !== JSON.stringify(dv)) {
        valueMismatches.push({ pk, field, src: sv, dst: dv });
      }
    }
  }

  return { missingKeys, valueMismatches };
}

// ─── Migration orchestration state ───────────────────────────────────────────

/**
 * Compute migration success: returns true only if all tables were imported
 * AND storage was either fully migrated or had no files to migrate.
 *
 * Missing storage auth with files remaining = NOT successful.
 *
 * @param {{ [table: string]: { ok: number; failed: number } }} tableResults
 * @param {{ attempted: number; succeeded: number; authAvailable: boolean }} storageResult
 * @returns {{ success: boolean; reason: string }}
 */
function computeMigrationSuccess(tableResults, storageResult) {
  const tableFailures = Object.entries(tableResults)
    .filter(([, r]) => r.failed > 0)
    .map(([t]) => t);

  if (tableFailures.length > 0) {
    return { success: false, reason: `Table import failures: ${tableFailures.join(', ')}` };
  }

  if (!storageResult.authAvailable && storageResult.attempted > 0) {
    return {
      success: false,
      reason: `Storage migration incomplete: ${storageResult.attempted} file(s) found but AWS S3 configuration was incomplete. Re-run with S3 config to migrate files.`,
    };
  }

  if (storageResult.succeeded < storageResult.attempted) {
    return {
      success: false,
      reason: `Storage verification failed: ${storageResult.attempted - storageResult.succeeded} file(s) not confirmed in destination.`,
    };
  }

  return { success: true, reason: 'All tables and storage migrated successfully.' };
}


const ALL_MIGRATION_TABLES = [
  'profiles',
  'feature_flags',
  'announcements',
  'reports',
  'remote_config',
  'subscriptions',
  'user_notifications',
  'tasks',
  'sub_tasks',
  'habits',
  'habit_checkins',
  'focus_sessions',
  'notes',
  'note_tags',
  'day_notes',
  'connect_profiles',
  'connect_social_links',
  'connect_achievements',
  'connect_follows',
  'connect_xp_log',
  'connect_friendships',
  'connect_friend_requests',
  'connect_blocks',
  'payment_requests',
];

const STORAGE_BUCKETS = ['avatars', 'payment-screenshots'];

async function discoverBetterAuthSchema(neon) {
  const res = await neon.query(`
    SELECT table_schema, table_name
    FROM information_schema.tables
    WHERE table_name IN ('user', 'account', 'session', 'verification')
      AND table_schema NOT IN ('information_schema', 'pg_catalog')
    ORDER BY table_schema, table_name
  `);
  const found = {};
  for (const row of res.rows) {
    found[row.table_name] = row.table_schema;
  }
  return found;
}

module.exports = {
  getPk,
  diffSnapshots,
  serializeValue,
  filterRow,
  sha256,
  parseJwtExpiry,
  isJwtExpired,
  assertRequiredAuthTables,
  getAccountId,

  uploadToS3,
  verifyS3Upload,
  verifyRowsComplete,
  computeMigrationSuccess,
  ALL_MIGRATION_TABLES,
  STORAGE_BUCKETS,
  discoverBetterAuthSchema,
};
