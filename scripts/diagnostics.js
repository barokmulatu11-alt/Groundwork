const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
const { createClient } = require('@supabase/supabase-js');
const { S3Client, GetObjectCommand, ListObjectsV2Command } = require('@aws-sdk/client-s3');
const crypto = require('crypto');

require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });

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

const EXCLUDED_TABLES = [
  'pro_analytics',
  'analytics_events',
  'analytics_daily_aggregates',
  'analytics_realtime_cache',
  'analytics_reports',
];

function sha256(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

async function run() {
  console.log('--- Groundwork Live Diagnostic ---');
  const sb = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const neon = new Client({
    connectionString: process.env.NEON_DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  await neon.connect();
  console.log('Connected to Supabase and Neon.\n');

  // 1. Users & Accounts
  const { data: { users }, error: uErr } = await sb.auth.admin.listUsers({ perPage: 1000 });
  if (uErr) throw uErr;
  console.log(`Supabase Auth Users count: ${users.length}`);

  // 1. Discover Auth Schema & Counts
  const { discoverBetterAuthSchema } = require('../lib/migrationHelpers');
  const authTableMap = await discoverBetterAuthSchema(neon);
  console.log('Auth table schema map:', authTableMap);

  const allSchemasRes = await neon.query(`
    SELECT DISTINCT table_schema, table_name 
    FROM information_schema.tables 
    WHERE table_schema NOT IN ('information_schema', 'pg_catalog')
    ORDER BY table_schema, table_name
  `);
  console.log('All non-system tables in Neon:', allSchemasRes.rows);

  const userSchema = authTableMap['user'] || 'public';
  const accountSchema = authTableMap['account'] || 'public';

  let neonUserCount = 0;
  let neonAccountCount = 0;
  if (authTableMap['user']) {
    const neonUserRes = await neon.query(`SELECT count(*) FROM "${userSchema}"."user"`);
    neonUserCount = neonUserRes.rows[0].count;
  }
  if (authTableMap['account']) {
    const neonAccountRes = await neon.query(`SELECT count(*) FROM "${accountSchema}"."account"`);
    neonAccountCount = neonAccountRes.rows[0].count;
  }
  console.log(`Neon "user" count: ${neonUserCount}`);
  console.log(`Neon "account" count: ${neonAccountCount}`);

  // Providers breakdown in Supabase
  const providerCounts = {};
  users.forEach(u => {
    const prov = u.app_metadata?.provider || 'email';
    providerCounts[prov] = (providerCounts[prov] || 0) + 1;
  });
  console.log('Supabase user providers:', providerCounts);

  // Check account table providers in Neon
  if (authTableMap['account']) {
    const neonAcctProvRes = await neon.query(`SELECT "providerId", count(*) FROM "${accountSchema}"."account" GROUP BY "providerId"`);
    console.log('Neon account providers:', neonAcctProvRes.rows);
  }

  // 2. Table Counts for 24 Migration Tables
  console.log('\n--- 24 Tables Source vs Destination Counts ---');
  const tableCounts = [];
  for (const table of ALL_MIGRATION_TABLES) {
    const { count: sbCount, error: sbErr } = await sb.from(table).select('*', { count: 'exact', head: true });
    let neonCount = 0;
    try {
      const res = await neon.query(`SELECT count(*) FROM public."${table}"`);
      neonCount = parseInt(res.rows[0].count, 10);
    } catch (e) {
      neonCount = 'ERROR: ' + e.message;
    }
    tableCounts.push({
      table,
      supabase: sbCount,
      neon: neonCount,
      delta: (typeof neonCount === 'number' && typeof sbCount === 'number') ? neonCount - sbCount : 'N/A'
    });
    console.log(`  ${table.padEnd(25)} | Supabase: ${String(sbCount).padStart(5)} | Neon: ${String(neonCount).padStart(5)} | Delta: ${tableCounts[tableCounts.length-1].delta}`);
  }

  // 3. Excluded Tables
  console.log('\n--- 5 Excluded Tables Counts in Supabase ---');
  for (const table of EXCLUDED_TABLES) {
    const { count: sbCount, error: sbErr } = await sb.from(table).select('*', { count: 'exact', head: true });
    let neonCount = 'N/A';
    try {
      const res = await neon.query(`SELECT count(*) FROM public."${table}"`);
      neonCount = parseInt(res.rows[0].count, 10);
    } catch (e) {
      neonCount = 'NOT IN NEON (' + e.code + ')';
    }
    console.log(`  ${table.padEnd(28)} | Supabase: ${sbErr ? sbErr.message : sbCount} | Neon: ${neonCount}`);
  }

  // 4. Column Differences / Dropped Columns
  console.log('\n--- Column Differences (Supabase vs Neon) ---');
  for (const table of ALL_MIGRATION_TABLES) {
    // Get columns in Neon
    const neonColRes = await neon.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = $1
    `, [table]);
    const neonCols = new Set(neonColRes.rows.map(r => r.column_name));

    // Sample row from Supabase
    const { data: sampleRow, error: sampleErr } = await sb.from(table).select('*').limit(1);
    if (sampleRow && sampleRow.length > 0) {
      const sbCols = Object.keys(sampleRow[0]);
      const dropped = sbCols.filter(c => !neonCols.has(c));
      const added = Array.from(neonCols).filter(c => !sbCols.includes(c));
      if (dropped.length > 0 || added.length > 0) {
        console.log(`  Table [${table}]:`);
        if (dropped.length > 0) console.log(`    Dropped / Unmapped from Supabase: ${dropped.join(', ')}`);
        if (added.length > 0) console.log(`    Added in Neon: ${added.join(', ')}`);
      }
    }
  }

  // 5. Storage Files and Hashes
  console.log('\n--- Storage Files and Hashes ---');
  const s3Client = new S3Client({
    region: process.env.AWS_REGION,
    endpoint: process.env.AWS_ENDPOINT_URL_S3,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
    forcePathStyle: true,
  });

  const filesToVerify = [
    { bucket: 'avatars', path: '9d6a4f87-a96a-4f87-b2c0-48a1545864cf/avatar.jpeg' },
    { bucket: 'avatars', path: '9fb50c0a-0c94-440d-8ab7-2b09cedfe093/avatar.jpeg' },
    { bucket: 'avatars', path: 'acaeeff7-0b1b-4854-bf37-71de35b75966/avatar.jpeg' },
    { bucket: 'avatars', path: 'b79ea118-5822-4e35-849a-a641375c1ffc/avatar.png' },
    { bucket: 'avatars', path: 'd526bf92-3e6f-4c40-8249-c94ff5e6781e/avatar.jpeg' },
    { bucket: 'payment-screenshots', path: 'c319a26e-a899-449e-bc00-d627aefea799/pr_1780924243768_xog4org.jpeg' },
  ];

  for (const file of filesToVerify) {
    // Download from Supabase
    const { data: sbBlob, error: sbErr } = await sb.storage.from(file.bucket).download(file.path);
    let sbHash = 'ERR', sbSize = 0;
    if (sbBlob) {
      const buf = Buffer.from(await sbBlob.arrayBuffer());
      sbHash = sha256(buf);
      sbSize = buf.length;
    }

    // Download from Neon S3 (stored under bucket 'uploads' with key `bucket/path`)
    let neonHash = 'ERR', neonSize = 0;
    try {
      const getRes = await s3Client.send(new GetObjectCommand({
        Bucket: 'uploads',
        Key: `${file.bucket}/${file.path}`,
      }));
      const neonBuf = Buffer.from(await getRes.Body.transformToByteArray());
      neonHash = sha256(neonBuf);
      neonSize = neonBuf.length;
    } catch (e) {
      neonHash = 'ERR: ' + e.message;
    }

    console.log(`  File: ${file.bucket}/${file.path}`);
    console.log(`    Supabase Hash: ${sbHash} (${sbSize} bytes)`);
    console.log(`    Neon S3  Hash: ${neonHash} (${neonSize} bytes)`);
    console.log(`    Match: ${sbHash === neonHash ? 'YES ✔' : 'NO ✗'}`);
  }

  await neon.end();
}

run().catch(e => {
  console.error('Diagnostic error:', e);
  process.exit(1);
});
