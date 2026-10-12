require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');

async function main() {
  const c = new Client({ connectionString: process.env.NEON_DATABASE_URL });
  await c.connect();
  const cols = await c.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_schema = 'neon_auth' AND table_name = 'verification'");
  console.log('Columns:', cols.rows);
  const rows = await c.query('SELECT * FROM neon_auth.verification ORDER BY "createdAt" DESC LIMIT 5');
  console.log('Rows:', rows.rows);
  await c.end();
}

main().catch(console.error);
