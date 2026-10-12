require('dotenv').config({ path: '.env' });
require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');
const client = new Client({ connectionString: process.env.NEON_DATABASE_URL });
async function main() {
  await client.connect();
  const tables = await client.query(`
    SELECT table_schema, table_name 
    FROM information_schema.tables 
    WHERE table_name IN ('user', 'account', 'profiles')
  `);
  console.log('Tables:', tables.rows);
  const users = await client.query('SELECT id, email FROM neon_auth.user LIMIT 5');
  console.log('Neon auth users:', users.rows);
  await client.end();
}
main().catch(console.error);
