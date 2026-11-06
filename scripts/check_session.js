const { Client } = require('pg');
const c = new Client({
  connectionString: 'postgresql://neondb_owner:npg_lLZTbmK1WNR2@ep-gentle-night-b4oacb89-pooler.c-6.us-east-2.aws.neon.tech/neondb?sslmode=require'
});

async function checkKey() {
  await c.connect();
  const jwks = await c.query('SELECT * FROM neon_auth.jwks LIMIT 1;');
  const k = jwks.rows[0];
  console.log('PublicKey:', k.publicKey);
  console.log('PrivateKey string:', k.privateKey);
  await c.end();
}

checkKey().catch(console.error);
