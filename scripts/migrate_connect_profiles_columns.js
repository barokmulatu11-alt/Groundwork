const fs = require('fs');
const { Client } = require('pg');

// Read .env.local manually
const envLocal = fs.readFileSync('.env.local', 'utf8');
let dbUrl = null;
for (const line of envLocal.split('\n')) {
  const trimmed = line.trim();
  if (trimmed.startsWith('NEON_DATABASE_URL=')) {
    dbUrl = trimmed.slice('NEON_DATABASE_URL='.length).trim();
    if ((dbUrl.startsWith('"') && dbUrl.endsWith('"')) || (dbUrl.startsWith("'") && dbUrl.endsWith("'"))) {
      dbUrl = dbUrl.slice(1, -1);
    }
    break;
  }
}

if (!dbUrl) {
  console.error('Could not find NEON_DATABASE_URL in .env.local');
  process.exit(1);
}

async function runMigration() {
  const client = new Client({ connectionString: dbUrl });
  await client.connect();
  console.log('Connected to Neon Postgres.');

  try {
    console.log('Checking current columns of connect_profiles...');
    const cols = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'connect_profiles';
    `);
    console.log('Current columns:', cols.rows.map(r => r.column_name));

    console.log('Adding institution and privacy_level if missing...');
    await client.query(`
      ALTER TABLE public.connect_profiles 
      ADD COLUMN IF NOT EXISTS institution TEXT;
    `);

    await client.query(`
      ALTER TABLE public.connect_profiles 
      ADD COLUMN IF NOT EXISTS privacy_level TEXT DEFAULT 'public';
    `);

    // Ensure reload of PostgREST schema cache
    await client.query("NOTIFY pgrst, 'reload schema';");
    console.log('Notified pgrst reload schema.');

    const verify = await client.query(`
      SELECT column_name, data_type, column_default 
      FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'connect_profiles';
    `);
    console.log('Updated columns:');
    verify.rows.forEach(r => console.log(`  - ${r.column_name} (${r.data_type}) default: ${r.column_default}`));
  } catch (err) {
    console.error('Migration error:', err);
  } finally {
    await client.end();
  }
}

runMigration().catch(console.error);
