const { Client } = require('pg');
const connStr = 'postgresql://neondb_owner:npg_lLZTbmK1WNR2@ep-gentle-night-b4oacb89-pooler.c-6.us-east-2.aws.neon.tech/neondb?sslmode=require';

async function main() {
  const { hashPassword } = await import('@better-auth/utils/password');
  const passwordHash = await hashPassword('Groundwork2026!');
  console.log('Generated hash for Groundwork2026!:', passwordHash);

  const client = new Client({ connectionString: connStr });
  await client.connect();

  const userId = 'c6425f3c-788b-4446-99b8-2c28aadcfbcd'; // ayfokruleul1@gmail.com

  // Delete existing credential if any
  await client.query(`
    DELETE FROM neon_auth.account 
    WHERE "userId" = $1::uuid AND "providerId" = 'credential'
  `, [userId]);

  // Insert credential account
  await client.query(`
    INSERT INTO neon_auth.account (
      id,
      "userId",
      "accountId",
      "providerId",
      password,
      "createdAt",
      "updatedAt"
    )
    VALUES (
      gen_random_uuid(),
      $1::uuid,
      $1::text,
      'credential',
      $2,
      NOW(),
      NOW()
    )
  `, [userId, passwordHash]);

  console.log('Successfully set email/password credential for ayfokruleul1@gmail.com in neon_auth.account!');

  await client.end();

  // Now test sign in with neonAuth!
  const { createInternalNeonAuth } = require('@neondatabase/auth');
  const auth = createInternalNeonAuth('https://ep-gentle-night-b4oacb89.neonauth.c-6.us-east-2.aws.neon.tech/neondb/auth', {
    fetchOptions: {
      headers: {
        Origin: 'https://groundwork.app',
      }
    }
  });

  const signInRes = await auth.adapter.signIn.email({
    email: 'ayfokruleul1@gmail.com',
    password: 'Groundwork2026!'
  });

  console.log('Sign in result for ayfokruleul1@gmail.com:');
  console.log(JSON.stringify(signInRes, null, 2));
}

main().catch(console.error);
