const { Client } = require('pg');
const connStr = 'postgresql://neondb_owner:npg_lLZTbmK1WNR2@ep-gentle-night-b4oacb89-pooler.c-6.us-east-2.aws.neon.tech/neondb?sslmode=require';

async function main() {
  const client = new Client({ connectionString: connStr });
  await client.connect();

  const accounts = await client.query("SELECT id, \"userId\", \"providerId\", password FROM neon_auth.account WHERE \"userId\" = '03b1ffcf-7989-447e-a7a3-bc089c1aa7c9';");
  console.log('Test user account:');
  console.log(accounts.rows);

  await client.end();
}

main().catch(console.error);
