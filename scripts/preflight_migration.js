require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const { Client } = require('pg');
const { S3Client, ListBucketsCommand } = require('@aws-sdk/client-s3');

const {
  discoverBetterAuthSchema,
  ALL_MIGRATION_TABLES,
  STORAGE_BUCKETS,
  assertRequiredAuthTables
} = require('../lib/migrationHelpers');

// Environment vars should be evaluated inside the function for testing


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

async function runPreflight() {
  const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const NEON_DATABASE_URL = process.env.NEON_DATABASE_URL;
  
  const AWS_ENDPOINT_URL_S3 = process.env.AWS_ENDPOINT_URL_S3;
  const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID;
  const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY;
  const AWS_REGION = process.env.AWS_REGION;

  console.log('\n=============================================');
  console.log('       MIGRATION PREFLIGHT CHECK (READ-ONLY) ');
  console.log('=============================================\n');

  let blockers = [];

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    blockers.push('Missing Supabase credentials (EXPO_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY).');
  }
  if (!NEON_DATABASE_URL) {
    blockers.push('Missing Neon credentials (NEON_DATABASE_URL).');
  }
  
  if (blockers.length > 0) {
    console.error('❌ Preflight failed to start due to missing environment variables:');
    blockers.forEach(b => console.error(`  - ${b}`));
    process.exit(1);
  }

  console.log('1. Verifying Connections...');
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const neon = new Client({ connectionString: NEON_DATABASE_URL, ssl: { rejectUnauthorized: false } });

  try {
    await neon.connect();
    console.log('  ✔ Neon Postgres connection established.');
  } catch (e) {
    blockers.push(`Neon Connection Failed: ${e.message}`);
  }

  // Auth Introspection
  console.log('\n2. Inspecting Destination Auth Schema...');
  let authTableMap = null;
  if (blockers.length === 0) {
    try {
      authTableMap = await discoverBetterAuthSchema(neon);
      assertRequiredAuthTables(authTableMap);
      console.log(`  ✔ Better Auth discovered successfully.`);
      console.log(`    - user table located in schema: "${authTableMap['user']}"`);
      console.log(`    - account table located in schema: "${authTableMap['account']}"`);
    } catch (e) {
      blockers.push(`Auth Schema Inspection Failed: ${e.message}`);
    }
  }

  // App Table Compatibility
  console.log('\n3. Inspecting Application Table Compatibility...');
  if (blockers.length === 0) {
    let missingTables = [];
    for (const table of ALL_MIGRATION_TABLES) {
      const res = await neon.query(`SELECT to_regclass('public."${table}"') as exists`);
      if (!res.rows[0].exists) {
        missingTables.push(table);
      }
    }
    if (missingTables.length > 0) {
      blockers.push(`Missing destination tables in public schema: ${missingTables.join(', ')}`);
    } else {
      console.log(`  ✔ All ${ALL_MIGRATION_TABLES.length} migration tables exist in destination.`);
    }
  }

  // Source Counting: Auth Users
  console.log('\n4. Counting Source Auth Users...');
  let totalAuthUsers = 0;
  try {
    let page = 1;
    while (true) {
      const { data: { users }, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
      if (error) throw error;
      totalAuthUsers += users.length;
      if (users.length < 1000) break;
      page++;
    }
    console.log(`  ✔ ${totalAuthUsers} auth users discovered via Supabase Admin API.`);
  } catch (e) {
    blockers.push(`Supabase Auth Extraction Failed: ${e.message}`);
  }

  // Source Counting: Rows
  console.log('\n5. Counting Source Database Records...');
  let totalRows = 0;
  for (const table of ALL_MIGRATION_TABLES) {
    const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
    if (error) {
      blockers.push(`Failed to count table "${table}": ${error.message}`);
    } else {
      console.log(`  - ${table.padEnd(28)}: ${count} rows`);
      totalRows += (count || 0);
    }
  }
  console.log(`  ✔ Total ${totalRows} records across all tables.`);

  // Source Counting: Storage
  console.log('\n6. Inspecting Source Storage Files...');
  let totalFiles = 0;
  for (const bucket of STORAGE_BUCKETS) {
    try {
      const files = await listAllFiles(supabase, bucket);
      console.log(`  - Bucket "${bucket}": ${files.length} files`);
      totalFiles += files.length;
    } catch (e) {
      blockers.push(`Storage Inspection Failed for bucket "${bucket}": ${e.message}`);
    }
  }
  console.log(`  ✔ Total ${totalFiles} files across all buckets.`);

  // Storage Authentication & Permissions
  console.log('\n7. Validating Storage Authentication Method...');
  if (totalFiles > 0) {
    if (!AWS_ENDPOINT_URL_S3 || !AWS_ACCESS_KEY_ID || !AWS_SECRET_ACCESS_KEY || !AWS_REGION) {
      blockers.push('Missing AWS S3 configuration (AWS_ENDPOINT_URL_S3, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION). Storage migration requires S3 credentials.');
    } else {
      console.log('  Testing S3 Destination Connectivity...');
      const s3Client = new S3Client({
        region: AWS_REGION,
        endpoint: AWS_ENDPOINT_URL_S3,
        credentials: {
          accessKeyId: AWS_ACCESS_KEY_ID,
          secretAccessKey: AWS_SECRET_ACCESS_KEY
        },
        forcePathStyle: true
      });
      
      try {
        const buckets = await s3Client.send(new ListBucketsCommand({}));
        const bucketNames = buckets.Buckets.map(b => b.Name);
        console.log(`  ✔ Connected to Neon S3 successfully.`);
        console.log(`    Discovered buckets: ${bucketNames.join(', ')}`);
        
        if (!bucketNames.includes('uploads')) {
          blockers.push(`The expected 'uploads' bucket was not found in the destination S3. Discovered: ${bucketNames.join(', ')}`);
        }
      } catch (err) {
        blockers.push(`Failed to list buckets on Neon S3 endpoint: ${err.message}`);
      }
    }
  } else {
    console.log('  ✔ No files to migrate. Skipping storage auth requirements.');
  }

  // Summary
  console.log('\n=============================================');
  await neon.end();

  if (blockers.length > 0) {
    console.error('❌ PREFLIGHT FAILED WITH BLOCKERS:');
    blockers.forEach(b => console.error(`  - ${b}`));
    console.log('\nResolve these issues before running the live migration.');
    process.exit(1);
  } else {
    console.log('✅ PREFLIGHT SUCCESSFUL! No blockers detected.');
    console.log('\nReady for live migration.');
  }
  console.log('=============================================\n');
}

module.exports = { runPreflight };

if (require.main === module) {
  runPreflight().catch(e => {
    console.error('\nFatal Preflight Error:', e.message);
    process.exit(1);
  });
}
