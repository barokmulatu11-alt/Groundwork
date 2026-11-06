const { Client } = require('pg');

async function test() {
  const c = new Client({
    connectionString: 'postgresql://neondb_owner:npg_lLZTbmK1WNR2@ep-gentle-night-b4oacb89-pooler.c-6.us-east-2.aws.neon.tech/neondb?sslmode=require'
  });
  await c.connect();
  const res = await c.query('SELECT s.id, s.token, s."userId", s."createdAt", u.email, u.name FROM neon_auth.session s JOIN neon_auth.user u ON s."userId" = u.id ORDER BY s."createdAt" DESC LIMIT 5');
  console.log('Recent sessions:', res.rows);
  await c.end();
}
test().catch(console.error);
