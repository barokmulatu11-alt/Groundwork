/**
 * migrate_supabase_to_neon.js
 *
 * Complete, privileged Supabase → Neon migration.
 *
 * Prerequisites (.env.local):
 *   SUPABASE_SERVICE_ROLE_KEY  — service role key (bypasses RLS for full extraction)
 *   NEON_DATABASE_URL          — Neon Postgres connection string (sslmode=require)
 *
 * Optional:
 *   EXPO_PUBLIC_NEON_S3_ENDPOINT — override default Neon S3 base URL
 *   NEON_MIGRATION_JWT           — a valid Neon Auth JWT for storage uploads.
 *                                  If absent, storage migration is SKIPPED.
 *
 * Run: node scripts/migrate_supabase_to_neon.js
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
const { createClient } = require('@supabase/supabase-js');

const { S3Client } = require('@aws-sdk/client-s3');
const {
  serializeValue,
  filterRow,
  assertRequiredAuthTables,
  getAccountId,
  uploadToS3,
  verifyS3Upload,
  verifyRowsComplete,
  computeMigrationSuccess,
  ALL_MIGRATION_TABLES,
  STORAGE_BUCKETS,
  discoverBetterAuthSchema,
} = require('../lib/migrationHelpers');

// ─── Environment ─────────────────────────────────────────────────────────────
const envLocalPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envLocalPath)) {
  require('dotenv').config({ path: envLocalPath });
} else {
  require('dotenv').config();
}

const SUPABASE_URL = process.env.SUPABASE_URL
  || process.env.EXPO_PUBLIC_SUPABASE_URL
  || 'https://yevrsmlwmegovfwdxpjw.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const NEON_DATABASE_URL = process.env.NEON_DATABASE_URL;
const AWS_ENDPOINT_URL_S3 = process.env.AWS_ENDPOINT_URL_S3;
const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID;
const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY;
const AWS_REGION = process.env.AWS_REGION;

// ─── Guards ───────────────────────────────────────────────────────────────────
if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error('\n❌ Fatal: SUPABASE_SERVICE_ROLE_KEY is missing.');
  console.error('Without it, RLS silently hides rows. Migration would be incomplete.');
  process.exit(1);
}
if (!NEON_DATABASE_URL) {
  console.error('\n❌ Fatal: NEON_DATABASE_URL is missing.');
  console.error('Add to .env.local: NEON_DATABASE_URL=postgresql://<user>:<pass>@ep-gentle-night-b4oacb89.us-east-2.aws.neon.tech/neondb?sslmode=require');
  process.exit(1);
}
if (!AWS_ENDPOINT_URL_S3 || !AWS_ACCESS_KEY_ID || !AWS_SECRET_ACCESS_KEY || !AWS_REGION) {
  console.warn('\n⚠️  AWS S3 configuration not fully set. Storage migration will be SKIPPED.');
  console.warn('   To migrate storage, set AWS_ENDPOINT_URL_S3, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, and AWS_REGION.\n');
}

const SKIP_ON_CONFLICT_CODES = new Set(['23505']);

// ─── Extraction Helpers ──────────────────────────────────────────────────────

async function fetchAllRows(supabase, table) {
  const PAGE_SIZE = 1000;
  let from = 0;
  const allRows = [];
  while (true) {
    const { data, error } = await supabase
      .from(table).select('*').range(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(`Extraction failed for "${table}": ${error.message}`);
    if (!data || data.length === 0) break;
    allRows.push(...data);
    if (data.length < PAGE_SIZE) break;
    from += data.length;
  }
  return allRows;
}

async function listAllFiles(supabase, bucket, currentPath = '') {
  const files = [];
  let offset = 0;
  while (true) {
    const { data, error } = await supabase.storage.from(bucket).list(currentPath, { limit: 1000, offset });
    if (error) throw new Error(`Failed to list ${bucket}/${currentPath}: ${error.message}`);
    if (!data || data.length === 0) break;
    
    for (const item of data) {
      if (item.name === '.emptyFolderPlaceholder') continue;
      const itemPath = currentPath ? `${currentPath}/${item.name}` : item.name;
      if (!item.id || item.metadata?.mimetype == null) {
        files.push(...await listAllFiles(supabase, bucket, itemPath));
      } else {
        files.push(itemPath);
      }
    }
    if (data.length < 1000) break;
    offset += 1000;
  }
  return files;
}

// ─── DB Introspection ────────────────────────────────────────────────────────

async function getTableColumns(neon, table, schema = 'public') {
  const res = await neon.query(`
    SELECT column_name, data_type, udt_name
    FROM information_schema.columns
    WHERE table_schema = $1 AND table_name = $2
    ORDER BY ordinal_position
  `, [schema, table]);
  const map = {};
  for (const row of res.rows) map[row.column_name] = { data_type: row.data_type, udt_name: row.udt_name };
  return map;
}

async function getTablePrimaryKeys(neon, table, schema = 'public') {
  const res = await neon.query(`
    SELECT kcu.column_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
    WHERE tc.constraint_type = 'PRIMARY KEY'
      AND tc.table_schema = $1 AND tc.table_name = $2
    ORDER BY kcu.ordinal_position
  `, [schema, table]);
  return res.rows.map(r => r.column_name);
}

// ─── Storage Migration ────────────────────────────────────────────────────────

async function backupStorageFiles(supabase, backupStorageDir) {
  console.log('\n--- Storage Migration ---');
  fs.mkdirSync(backupStorageDir, { recursive: true });
  const index = [];
  let attempted = 0, succeeded = 0;

  for (const bucket of STORAGE_BUCKETS) {
    const bucketDir = path.join(backupStorageDir, bucket);
    fs.mkdirSync(bucketDir, { recursive: true });
    console.log(`\nBucket: ${bucket}`);

    const allFiles = await listAllFiles(supabase, bucket);
    console.log(`  ${allFiles.length} file(s) found.`);

    if (allFiles.length > 0 && (!AWS_ENDPOINT_URL_S3 || !AWS_ACCESS_KEY_ID || !AWS_SECRET_ACCESS_KEY || !AWS_REGION)) {
      console.log(`  ⚠️  Skipping ${allFiles.length} files: AWS S3 configuration incomplete.`);
      attempted += allFiles.length;
      continue;
    }

    let s3Client;
    if (AWS_ENDPOINT_URL_S3 && AWS_ACCESS_KEY_ID && AWS_SECRET_ACCESS_KEY && AWS_REGION) {
      s3Client = new S3Client({
        region: AWS_REGION,
        endpoint: AWS_ENDPOINT_URL_S3,
        credentials: {
          accessKeyId: AWS_ACCESS_KEY_ID,
          secretAccessKey: AWS_SECRET_ACCESS_KEY
        },
        forcePathStyle: true
      });
    }

    // ── Storage Resumption & Recovery Documentation ────────────────────────
    // Since storage uploads occur via HTTP outside the Postgres transaction,
    // they are not rolled back if a later table insertion fails. 
    // Recovery Strategy:
    // 1. The script maintains a 'storage_index.json' detailing completed transfers.
    // 2. The S3 verification hash check (verifyS3Upload) is idempotent.
    // 3. If a migration is re-run after a partial failure, the script will upload
    //    and simply overwrite existing files, skipping nothing but ensuring that
    //    all files ultimately match their source hash.
    // 4. No files are deleted from the source Supabase storage during migration.
    // ───────────────────────────────────────────────────────────────────────

    for (const filePath of allFiles) {
      attempted++;
      const { data: blob, error } = await supabase.storage.from(bucket).download(filePath);
      if (error || !blob) {
        throw new Error(`Download FAILED for ${bucket}/${filePath}: ${error?.message || 'no data'}`);
      }
      const arrayBuffer = await blob.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const contentType = blob.type || 'application/octet-stream';

      // Local backup
      const localDest = path.join(bucketDir, filePath);
      fs.mkdirSync(path.dirname(localDest), { recursive: true });
      fs.writeFileSync(localDest, buffer);

      // Upload and verify using shared module
      await uploadToS3(s3Client, bucket, filePath, buffer, contentType);
      await verifyS3Upload(s3Client, bucket, filePath, buffer);

      index.push({ bucket, path: filePath, sizeBytes: buffer.length, contentType });
      succeeded++;
      console.log(`  ✔ ${bucket}/${filePath} (${buffer.length} bytes) — verified`);
    }
  }

  const indexPath = path.join(backupStorageDir, 'storage_index.json');
  fs.writeFileSync(indexPath, JSON.stringify(index, null, 2));
  console.log(`\n✔ ${succeeded} file(s) migrated and verified.`);
  return { attempted, succeeded, authAvailable: !!(AWS_ENDPOINT_URL_S3 && AWS_ACCESS_KEY_ID && AWS_SECRET_ACCESS_KEY && AWS_REGION) };
}

// ─── Auth Migration ──────────────────────────────────────────────────────────

async function verifyNeonAuthEndpoint(authUrl) {
  const res = await fetch(`${authUrl}/get-session`).catch(e => null);
  if (!res || res.status !== 200) {
    throw new Error(`Neon Auth endpoint unreachable or unhealthy. Expected 200 from ${authUrl}/get-session, got ${res?.status ?? 'no response'}`);
  }
  console.log(`  Neon Auth endpoint healthy (${authUrl}/get-session → 200)`);
}

async function migrateAuthUsers(neon, authUsers, authTableMap) {
  const userSchema = authTableMap['user'];
  const accountSchema = authTableMap['account'];

  const userCols = await getTableColumns(neon, 'user', userSchema);
  const accountCols = await getTableColumns(neon, 'account', accountSchema);
  const userDestCols = new Set(Object.keys(userCols));
  const accountDestCols = new Set(Object.keys(accountCols));

  console.log(`\n  Importing ${authUsers.length} auth user(s)...`);
  await neon.query('BEGIN');

  const pkUserCols = await getTablePrimaryKeys(neon, 'user', userSchema);
  const pkAccountCols = await getTablePrimaryKeys(neon, 'account', accountSchema);

  let userOk = 0, accountOk = 0, failed = 0;

  for (const u of authUsers) {
    const rawUser = {
      id: u.id,
      name: u.user_metadata?.full_name || u.email?.split('@')[0] || 'User',
      email: u.email || null,
      emailVerified: u.email_confirmed_at != null,
      image: u.user_metadata?.avatar_url || null,
      createdAt: u.created_at,
      updatedAt: u.updated_at || u.created_at,
    };
    const { filtered: userRow, unmapped: userUnmapped } = filterRow(rawUser, userDestCols);
    if (userUnmapped.length > 0) {
      console.log(`    [user/${u.id}] unmapped source fields: ${userUnmapped.join(', ')}`);
    }

    if (!userRow.id) {
      console.error(`    ABORT: user ${u.email} has no id — cannot establish ownership`);
      failed++;
      throw new Error(`User without id encountered: ${JSON.stringify(u).slice(0, 100)}`);
    }

    const userColNames = Object.keys(userRow).map(c => `"${c}"`).join(', ');
    const userVals = Object.values(userRow);
    const userPlaceholders = userVals.map((_, i) => `$${i + 1}`).join(', ');
    const userPkList = pkUserCols.length ? pkUserCols.map(c => `"${c}"`).join(', ') : '"id"';

    await neon.query('SAVEPOINT user_insert');
    try {
      await neon.query(
        `INSERT INTO "${userSchema}"."user" (${userColNames}) VALUES (${userPlaceholders})
         ON CONFLICT (${userPkList}) DO UPDATE SET
           email = EXCLUDED.email,
           "emailVerified" = EXCLUDED."emailVerified",
           "updatedAt" = EXCLUDED."updatedAt"`,
        userVals
      );
      await neon.query('RELEASE SAVEPOINT user_insert');
      userOk++;
    } catch (e) {
      await neon.query('ROLLBACK TO SAVEPOINT user_insert');
      failed++;
      throw new Error(`Cannot insert user ${u.id} into "${userSchema}"."user": ${e.message}`);
    }

    const providerId = u.app_metadata?.provider || 'email';
    const accountId = getAccountId(u);
    const crypto = require('crypto');
    const hash = crypto.createHash('md5').update(u.id + providerId).digest('hex');
    const deterministicUuid = `${hash.slice(0,8)}-${hash.slice(8,12)}-${hash.slice(12,16)}-${hash.slice(16,20)}-${hash.slice(20,32)}`;

    const rawAccount = {
      id: deterministicUuid,
      userId: u.id,
      accountId,
      providerId,
      createdAt: u.created_at,
      updatedAt: u.updated_at || u.created_at,
    };
    const { filtered: accountRow, unmapped: accountUnmapped } = filterRow(rawAccount, accountDestCols);
    if (accountUnmapped.length > 0) {
      console.log(`    [account/${u.id}] unmapped fields: ${accountUnmapped.join(', ')}`);
    }

    const acctColNames = Object.keys(accountRow).map(c => `"${c}"`).join(', ');
    const acctVals = Object.values(accountRow);
    const acctPlaceholders = acctVals.map((_, i) => `$${i + 1}`).join(', ');
    const acctPkList = pkAccountCols.length ? pkAccountCols.map(c => `"${c}"`).join(', ') : '"id"';

    await neon.query('SAVEPOINT account_insert');
    try {
      await neon.query(
        `INSERT INTO "${accountSchema}".account (${acctColNames}) VALUES (${acctPlaceholders})
         ON CONFLICT (${acctPkList}) DO NOTHING`,
        acctVals
      );
      await neon.query('RELEASE SAVEPOINT account_insert');
      accountOk++;
    } catch (e) {
      await neon.query('ROLLBACK TO SAVEPOINT account_insert');
      throw new Error(`Cannot insert account for user ${u.id}: ${e.message}`);
    }
  }
  await neon.query('COMMIT');

  console.log(`  Users: ${userOk} inserted/updated, ${failed} failed.`);
  console.log(`  Accounts: ${accountOk} inserted.`);
}

// ─── Table Import ─────────────────────────────────────────────────────────────

async function importTable(neon, table, rows) {
  if (rows.length === 0) { console.log(`  SKIP ${table}: 0 rows`); return { ok: 0, failed: 0 }; }

  const colMeta = await getTableColumns(neon, table);
  const pkCols = await getTablePrimaryKeys(neon, table);
  const destCols = new Set(Object.keys(colMeta));

  if (destCols.size === 0) {
    throw new Error(`Table "${table}" not found in Neon. Run apply_neon_schema.js first.`);
  }

  const pkList = pkCols.length ? pkCols.map(c => `"${c}"`).join(', ') : null;
  const conflictClause = pkList ? `ON CONFLICT (${pkList}) DO NOTHING` : 'ON CONFLICT DO NOTHING';
  let ok = 0, skipped = 0;

  for (let i = 0; i < rows.length; i++) {
    const { filtered, unmapped } = filterRow(rows[i], destCols);
    if (unmapped.length > 0) {
      console.warn(`    [${table}] row ${i}: unmapped source columns: ${unmapped.join(', ')}`);
    }
    if (Object.keys(filtered).length === 0) { skipped++; continue; }

    const columns = Object.keys(filtered);
    const values = columns.map(c => serializeValue(filtered[c], colMeta[c]));
    const colNames = columns.map(c => `"${c}"`).join(', ');
    const placeholders = columns.map((_, j) => `$${j + 1}`).join(', ');
    const sql = `INSERT INTO public."${table}" (${colNames}) VALUES (${placeholders}) ${conflictClause}`;

    await neon.query('SAVEPOINT row_insert');
    try {
      await neon.query(sql, values);
      await neon.query('RELEASE SAVEPOINT row_insert');
      ok++;
    } catch (e) {
      await neon.query('ROLLBACK TO SAVEPOINT row_insert');
      if (SKIP_ON_CONFLICT_CODES.has(e.code)) {
        skipped++;
      } else {
        await neon.query('ROLLBACK');
        throw new Error(
          `Insert failed for "${table}" row ${i} (code=${e.code}): ${e.message}\n` +
          `  Values: ${JSON.stringify(filtered).slice(0, 300)}`
        );
      }
    }
  }

  console.log(`  ${table.padEnd(28)}: ${ok} inserted, ${skipped} skipped (conflicts)`);
  // Returning { ok, failed: 0 } on success because the loop throws on failure
  return { ok, failed: 0 };
}

// ─── Main ──────────────────────────────────────────────────────────────────────

async function runMigration() {
  console.log('=================================================================');
  console.log(' Groundwork: Supabase → Neon Migration');
  console.log('=================================================================');
  console.log(`Source: ${SUPABASE_URL}`);
  console.log(`Destination: ${NEON_DATABASE_URL.replace(/:[^:@]+@/, ':*****@')}`);
  console.log(`Storage configuration: ${(AWS_ENDPOINT_URL_S3 && AWS_ACCESS_KEY_ID && AWS_SECRET_ACCESS_KEY && AWS_REGION) ? 'set' : 'NOT SET (storage will be skipped)'}`);

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const neon = new Client({ connectionString: NEON_DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await neon.connect();
  console.log('✔ Connected to Neon.\n');

  const NEON_AUTH_URL = process.env.EXPO_PUBLIC_NEON_AUTH_URL
    || 'https://ep-gentle-night-b4oacb89.neonauth.c-6.us-east-2.aws.neon.tech/neondb/auth';
  await verifyNeonAuthEndpoint(NEON_AUTH_URL);

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.resolve(__dirname, 'backups', `backup_${timestamp}`);
  fs.mkdirSync(backupDir, { recursive: true });

  let migrationSuccessResult = null;

  try {
    // 1. Storage migration
    const storageResult = await backupStorageFiles(supabase, path.join(backupDir, 'storage'));

    // 2. Extract all source tables
    console.log('\n--- Extracting Tables from Supabase ---');
    const backupTables = {};
    const extractionCounts = {};

    console.log('  Extracting auth.users via Admin API...');
    let authUsers = [];
    let page = 1;
    while (true) {
      const { data: { users }, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
      if (error) throw new Error(`auth.users extraction failed: ${error.message}`);
      authUsers.push(...users);
      if (users.length < 1000) break;
      page++;
    }
    console.log(`    ✔ ${authUsers.length} user(s)`);

    for (const table of ALL_MIGRATION_TABLES) {
      process.stdout.write(`  ${table.padEnd(30)}... `);
      const rows = await fetchAllRows(supabase, table);
      backupTables[table] = rows;
      extractionCounts[table] = rows.length;
      console.log(`${rows.length} rows`);
    }

    const backupPath = path.join(backupDir, 'database_backup.json');
    fs.writeFileSync(backupPath, JSON.stringify(backupTables, null, 2));
    console.log(`\n✔ Backup written: ${backupPath}`);

    // 3. Import into Neon
    console.log('\\n--- Importing into Neon ---');
    // Removed global BEGIN to allow incremental commits and resume on connection drops

    const authTableMap = await discoverBetterAuthSchema(neon);
    await migrateAuthUsers(neon, authUsers, authTableMap);

    console.log('\\n  Importing application tables...');
    const tableResults = {};
    for (const table of ALL_MIGRATION_TABLES) {
      await neon.query('BEGIN');

      await neon.query('SAVEPOINT trigger_disable');
      try { 
        await neon.query(`ALTER TABLE public."${table}" DISABLE TRIGGER USER`);
        await neon.query('RELEASE SAVEPOINT trigger_disable');
      } catch(e) {
        await neon.query('ROLLBACK TO SAVEPOINT trigger_disable');
      }

      tableResults[table] = await importTable(neon, table, backupTables[table] || []);

      await neon.query('SAVEPOINT trigger_enable');
      try { 
        await neon.query(`ALTER TABLE public."${table}" ENABLE TRIGGER USER`); 
        await neon.query('RELEASE SAVEPOINT trigger_enable');
      } catch(e) {
        await neon.query('ROLLBACK TO SAVEPOINT trigger_enable');
      }
      await neon.query('COMMIT');
    }

    // 4. Verify using shared logic
    console.log('\n--- Verifying Migration ---');
    for (const table of ALL_MIGRATION_TABLES) {
      const pkCols = await getTablePrimaryKeys(neon, table, 'public');
      const colMeta = await getTableColumns(neon, table, 'public');
      const destCols = Object.keys(colMeta);
      const verifyFields = destCols.filter(c => !pkCols.includes(c));

      const destRes = await neon.query(`SELECT * FROM public."${table}"`);
      const destRows = destRes.rows;

      const { missingKeys, valueMismatches } = verifyRowsComplete(backupTables[table] || [], destRows, pkCols, verifyFields);
      if (missingKeys.length > 0) {
        throw new Error(`Verification FAILED for "${table}": ${missingKeys.length} source row(s) missing from destination.`);
      }
      if (valueMismatches.length > 0) {
        const sample = valueMismatches[0];
        throw new Error(`Verification FAILED for "${table}": field values mismatched after import. e.g. PK=${sample.pk} field=${sample.field} src=${sample.src} dst=${sample.dst}`);
      }

      console.log(`  ✔ ${table.padEnd(28)}: all source PKs and values verified`);
    }

    // Evaluate success condition
    migrationSuccessResult = computeMigrationSuccess(tableResults, storageResult);
    if (!migrationSuccessResult.success) {
      throw new Error(`Migration orchestration failed: ${migrationSuccessResult.reason}`);
    }

    // Removed global COMMIT
    console.log('\\n✔ Migration completed successfully: ' + migrationSuccessResult.reason);

    // 5. Account recovery notice
    const emailUsers = authUsers.filter(u => (u.app_metadata?.provider || 'email') === 'email');
    console.log('\n══════════════════════════════════════════════════════════');
    console.log('  ⚠️  ACCOUNT RECOVERY REQUIRED BEFORE CUTOVER');
    console.log('══════════════════════════════════════════════════════════');
    console.log(`  ${emailUsers.length} user(s) use email/password login.`);
    console.log('  Supabase uses bcrypt; Neon Better Auth uses argon2id.');
    console.log('  These formats are INCOMPATIBLE — passwords were NOT migrated.');
    console.log('  These users CANNOT log in until they reset their password.');
    console.log('');
    console.log('  Required actions before cutover:');
    console.log('  1. Configure a password-reset email in your Better Auth setup.');
    console.log('  2. Send reset emails to all email-provider users.');
    console.log('  3. Give users time to complete reset before switching production traffic.');
    console.log('');
    console.log('  OAuth-only users (Google, GitHub etc) are not affected.');
    console.log('══════════════════════════════════════════════════════════');

    if (!(AWS_ENDPOINT_URL_S3 && AWS_ACCESS_KEY_ID && AWS_SECRET_ACCESS_KEY && AWS_REGION)) {
      console.log('\n  ⚠️  Storage was SKIPPED. Re-run with AWS S3 credentials set to migrate files.');
    }

  } catch (err) {
    console.error('\n❌ Migration failed:', err.message);
    throw err;
  } finally {
    await neon.end();
  }
}

module.exports = { runMigration };

if (require.main === module) {
  runMigration().catch(e => {
    console.error('\nMigration terminated:', e.message);
    process.exit(1);
  });
}
