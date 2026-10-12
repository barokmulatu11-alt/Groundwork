require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');

async function main() {
  const c = new Client({ connectionString: process.env.NEON_DATABASE_URL });
  await c.connect();
  const origins = [
    'http://localhost:8081',
    'http://127.0.0.1:8081',
    'http://10.0.2.2:8081',
    'groundwork://reset-password',
    'groundwork://*',
  ];
  await c.query('UPDATE neon_auth.project_config SET trusted_origins = $1::jsonb', [JSON.stringify(origins)]);
  const r = await c.query('SELECT trusted_origins FROM neon_auth.project_config');
  console.log('Updated trusted_origins:', r.rows[0].trusted_origins);
  await c.end();
}

main().catch(console.error);
