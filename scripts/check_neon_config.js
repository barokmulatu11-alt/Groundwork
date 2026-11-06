const { Client } = require('pg');

async function test() {
  const c = new Client({
    connectionString: 'postgresql://neondb_owner:npg_lLZTbmK1WNR2@ep-gentle-night-b4oacb89-pooler.c-6.us-east-2.aws.neon.tech/neondb?sslmode=require'
  });
  await c.connect();
  const cfg = await c.query("SELECT social_providers, plugin_configs, trusted_origins FROM neon_auth.project_config");
  console.log('social_providers:', JSON.stringify(cfg.rows[0].social_providers, null, 2));
  console.log('plugin_configs:', JSON.stringify(cfg.rows[0].plugin_configs, null, 2));
  console.log('trusted_origins:', JSON.stringify(cfg.rows[0].trusted_origins, null, 2));
  await c.end();
}
test().catch(console.error);
