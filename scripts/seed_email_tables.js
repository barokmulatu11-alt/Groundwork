const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const connStr = 'postgresql://neondb_owner:npg_lLZTbmK1WNR2@ep-gentle-night-b4oacb89-pooler.c-6.us-east-2.aws.neon.tech/neondb?sslmode=require';

async function seed() {
  const client = new Client({ connectionString: connStr });
  try {
    await client.connect();
    console.log('Connected to DB');

    const jsonPath = path.join(__dirname, '../admin-dashboard/src/data/default-email-templates.json');
    const templates = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

    for (const tpl of templates) {
      await client.query(`
        INSERT INTO public.email_templates (id, slug, name, category, description, subject, body_html, body_text, variables, is_default, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, now())
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          category = EXCLUDED.category,
          description = EXCLUDED.description,
          subject = EXCLUDED.subject,
          body_html = EXCLUDED.body_html,
          body_text = EXCLUDED.body_text,
          variables = EXCLUDED.variables,
          updated_at = now();
      `, [
        tpl.id,
        tpl.slug,
        tpl.name,
        tpl.category,
        tpl.description,
        tpl.subject,
        tpl.body_html,
        tpl.body_text,
        JSON.stringify(tpl.variables),
        tpl.is_default
      ]);
      console.log('Successfully seeded template:', tpl.name);
    }
    console.log('All default templates seeded!');
  } catch (err) {
    console.error('Seed error:', err.message);
  } finally {
    await client.end();
  }
}

seed();
