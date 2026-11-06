const { Client } = require('pg');

async function test() {
  const c = new Client({
    connectionString: 'postgresql://neondb_owner:npg_lLZTbmK1WNR2@ep-gentle-night-b4oacb89-pooler.c-6.us-east-2.aws.neon.tech/neondb?sslmode=require'
  });
  await c.connect();
  const res = await c.query("SELECT policyname, tablename, cmd, qual, with_check FROM pg_policies WHERE tablename IN ('tasks', 'habits', 'notes', 'user_settings')");
  for (const r of res.rows) {
    console.log(`Table: ${r.tablename} | Policy: ${r.policyname} | Cmd: ${r.cmd}`);
    console.log(`  Qual: ${r.qual}`);
    console.log(`  WithCheck: ${r.with_check}`);
  }
  await c.end();
}
test().catch(console.error);
