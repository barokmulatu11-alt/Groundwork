require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');

async function main() {
  const c = new Client({ connectionString: process.env.NEON_DATABASE_URL });
  await c.connect();
  const res = await c.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_schema = 'neon_auth' AND table_name = 'project_config'");
  console.log('Columns:', res.rows);
  const rows = await c.query('SELECT * FROM neon_auth.project_config');
  console.log('Current config:', rows.rows[0]);
  await c.end();
}

main().catch(console.error);
