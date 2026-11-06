const fetch = globalThis.fetch;
const endpoint = 'https://ep-gentle-night-b4oacb89.c-6.us-east-2.aws.neon.tech/sql';
const connStr = 'postgresql://neondb_owner:npg_lLZTbmK1WNR2@ep-gentle-night-b4oacb89.c-6.us-east-2.aws.neon.tech/neondb?sslmode=require';

async function test() {
  const query = 'SELECT s.token, s."userId", u.email, u.name FROM neon_auth.session s JOIN neon_auth.user u ON s."userId" = u.id ORDER BY s."createdAt" DESC LIMIT 1';
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Neon-Connection-String': connStr },
    body: JSON.stringify({ query })
  });
  console.log('status:', res.status);
  const data = await res.json();
  console.log('rows:', data.rows);
}
test().catch(console.error);
