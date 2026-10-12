const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });
async function run() {
  const c = new Client({ connectionString: process.env.NEON_DATABASE_URL });
  await c.connect();
  const tables = await c.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'neon_auth'");
  console.log('Tables:', tables.rows.map(r => r.table_name));
  for (const t of tables.rows) {
    const cols = await c.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_schema = 'neon_auth' AND table_name = $1", [t.table_name]);
    console.log(t.table_name, cols.rows.map(c => c.column_name));
  }
  const config = await c.query("SELECT * FROM neon_auth.project_config");
  console.log('Project config full:', JSON.stringify(config.rows, null, 2));
  await c.end();
}
run().catch(console.error);
