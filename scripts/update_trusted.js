const { Client } = require('pg');

async function main() {
  const c = new Client({
    connectionString: 'postgresql://neondb_owner:npg_lLZTbmK1WNR2@ep-gentle-night-b4oacb89-pooler.c-6.us-east-2.aws.neon.tech/neondb?sslmode=require'
  });
  await c.connect();
  const origins = [
    'http://localhost:8081',
    'http://127.0.0.1:8081',
    'http://10.0.2.2:8081',
    'https://groundwork.app',
    'https://groundwork.pro.et',
    'https://*.groundwork.pro.et',
    'https://barok-labs.pro.et',
    'https://v0-barok-labs.vercel.app',
    'https://groundwork-ap4ovo7tv-barok-labs-projects.vercel.app',
    'https://*.vercel.app',
    'https://ep-gentle-night-b4oacb89.neonauth.c-6.us-east-2.aws.neon.tech',
    'groundwork://',
    'groundwork://*',
    'groundwork://reset-password'
  ];
  await c.query('UPDATE neon_auth.project_config SET trusted_origins = $1::jsonb', [JSON.stringify(origins)]);
  const r = await c.query('SELECT trusted_origins FROM neon_auth.project_config');
  console.log('SUCCESS_ORIGINS:', JSON.stringify(r.rows[0].trusted_origins, null, 2));
  await c.end();
}

main().catch(err => {
  console.error('ERROR:', err);
  process.exit(1);
});
