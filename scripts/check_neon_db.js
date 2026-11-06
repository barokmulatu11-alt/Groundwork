const { Client } = require('pg');

const connStr = 'postgresql://neondb_owner:npg_lLZTbmK1WNR2@ep-gentle-night-b4oacb89.c-6.us-east-2.aws.neon.tech/neondb?sslmode=require';

async function main() {
  const client = new Client({ connectionString: connStr });
  await client.connect();

  console.log('Connected to Neon!');
  const tables = await client.query(`
    SELECT table_schema, table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public'
    ORDER BY table_name;
  `);
  console.log('Public tables in Neon:', tables.rows.map(r => r.table_name));

  const profileCount = await client.query('SELECT count(*)::int as count FROM public.profiles;');
  console.log('Profiles in Neon:', profileCount.rows[0].count);

  const sampleProfiles = await client.query('SELECT id, email, username, pro_status FROM public.profiles LIMIT 5;');
  console.log('Sample profiles in Neon:', sampleProfiles.rows);

  await client.end();
}

main().catch(console.error);
