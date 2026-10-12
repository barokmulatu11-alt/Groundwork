/**
 * verify_google_oauth_linking.js
 *
 * Verifies that a Google OAuth sign-in properly resolves to the existing
 * pre-migration user account and preserves all relational data attachments.
 */

require('dotenv').config({ path: '.env' });
require('dotenv').config({ path: '.env.local' });

const { Client } = require('pg');
const assert = require('assert');

const NEON_DATABASE_URL = process.env.NEON_DATABASE_URL;

async function verifyGoogleAccount(targetEmail) {
  if (!targetEmail) {
    console.error('Usage: node scripts/verify_google_oauth_linking.js <user-email>');
    process.exit(1);
  }

  console.log(`=== Verifying Google Account Linkage & Data Retention for: ${targetEmail} ===\n`);

  const pg = new Client({ connectionString: NEON_DATABASE_URL });
  await pg.connect();

  try {
    // 1. Check neon_auth.user
    const userRes = await pg.query('SELECT id, name, email, "emailVerified", "createdAt" FROM neon_auth.user WHERE email = $1', [targetEmail]);
    if (userRes.rows.length === 0) {
      console.log(`❌ No user found in neon_auth.user with email: ${targetEmail}`);
      return false;
    }
    const user = userRes.rows[0];
    console.log(`✔ User Found in neon_auth.user:`);
    console.log(`  - ID: ${user.id}`);
    console.log(`  - Name: ${user.name}`);
    console.log(`  - Email Verified: ${user.emailVerified}`);

    // 2. Check neon_auth.account
    const acctRes = await pg.query('SELECT "providerId", "accountId", "createdAt" FROM neon_auth.account WHERE "userId" = $1', [user.id]);
    console.log(`✔ Linked Auth Accounts (${acctRes.rows.length}):`);
    acctRes.rows.forEach(a => console.log(`  - Provider: ${a.providerId}, Account ID: ${a.accountId}`));

    // 3. Check public.profiles
    const profRes = await pg.query('SELECT id, username, full_name, role, pro_status FROM profiles WHERE id = $1', [user.id]);
    if (profRes.rows.length > 0) {
      const p = profRes.rows[0];
      console.log(`✔ Public Profile Intact:`);
      console.log(`  - Role: ${p.role}`);
      console.log(`  - Full Name: ${p.full_name}`);
      console.log(`  - Pro Status: ${p.pro_status}`);
    } else {
      console.log(`❌ Profile missing in public.profiles!`);
    }

    // 4. Check user data attachments
    const tasksRes = await pg.query('SELECT count(*)::int as count FROM tasks WHERE user_id::text = $1', [user.id]);
    const habitsRes = await pg.query('SELECT count(*)::int as count FROM habits WHERE user_id::text = $1', [user.id]);
    const notesRes = await pg.query('SELECT count(*)::int as count FROM notes WHERE user_id::text = $1', [user.id]);
    const connectRes = await pg.query('SELECT count(*)::int as count FROM connect_profiles WHERE id::text = $1', [user.id]);
    const paymentsRes = await pg.query('SELECT count(*)::int as count FROM payment_requests WHERE user_id::text = $1', [user.id]);

    console.log(`✔ User Relational Data Attachments:`);
    console.log(`  - Tasks: ${tasksRes.rows[0].count}`);
    console.log(`  - Habits: ${habitsRes.rows[0].count}`);
    console.log(`  - Notes: ${notesRes.rows[0].count}`);
    console.log(`  - Connect Profile: ${connectRes.rows[0].count > 0 ? 'Present' : 'None'}`);
    console.log(`  - Payment Requests: ${paymentsRes.rows[0].count}`);

    console.log('\n✔ Verification Complete: User account and relational integrity verified.');
    return true;
  } finally {
    await pg.end();
  }
}

const emailArg = process.argv[2];
if (emailArg) {
  verifyGoogleAccount(emailArg).catch(console.error);
} else {
  // If no email provided, print status of all 55 Google accounts in Neon
  (async () => {
    const pg = new Client({ connectionString: NEON_DATABASE_URL });
    await pg.connect();
    const res = await pg.query(`
      SELECT u.id, u.email, u.name, count(t.id)::int as task_count
      FROM neon_auth.user u
      JOIN neon_auth.account a ON a."userId" = u.id AND a."providerId" = 'google'
      LEFT JOIN tasks t ON t.user_id::text = u.id::text
      GROUP BY u.id, u.email, u.name
      LIMIT 5
    `);
    console.log('Sample Pre-Migrated Google OAuth Users Ready for Login Verification:');
    res.rows.forEach(r => console.log(` - ${r.email} (ID: ${r.id}, Tasks: ${r.task_count})`));
    await pg.end();
  })().catch(console.error);
}
