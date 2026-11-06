const { Client } = require('pg');
const connStr = 'postgresql://neondb_owner:npg_lLZTbmK1WNR2@ep-gentle-night-b4oacb89-pooler.c-6.us-east-2.aws.neon.tech/neondb?sslmode=require';

async function main() {
  const client = new Client({ connectionString: connStr });
  await client.connect();

  const u = await client.query("SELECT id, name, email FROM neon_auth.user WHERE email = 'ayfokruleul1@gmail.com'");
  console.log('ayfokruleul1 in neon_auth.user:', u.rows);

  const p = await client.query("SELECT id, full_name, email, role, pro_status FROM public.profiles WHERE email = 'ayfokruleul1@gmail.com'");
  console.log('ayfokruleul1 in public.profiles:', p.rows);

  const acc = await client.query("SELECT * FROM neon_auth.account WHERE \"userId\" = 'c6425f3c-788b-4446-99b8-2c28aadcfbcd' OR \"accountId\" LIKE '%ayfok%'");
  console.log('ayfokruleul1 in neon_auth.account:', acc.rows);

  await client.end();
}

main().catch(console.error);
