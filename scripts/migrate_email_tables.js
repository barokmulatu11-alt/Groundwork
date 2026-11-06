const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const connStr = 'postgresql://neondb_owner:npg_lLZTbmK1WNR2@ep-gentle-night-b4oacb89-pooler.c-6.us-east-2.aws.neon.tech/neondb?sslmode=require';

async function run() {
  const client = new Client({ connectionString: connStr });
  try {
    await client.connect();
    console.log('Connected to database!');
    const sql = fs.readFileSync(path.join(__dirname, '../supabase/migrations/20261016_email_templates_and_logs.sql'), 'utf-8');
    await client.query(sql);
    console.log('Migration executed successfully!');
  } catch (err) {
    console.error('Migration error:', err.message);
  } finally {
    await client.end();
  }
}

run();
