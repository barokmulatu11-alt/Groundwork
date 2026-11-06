const { Client } = require('pg');
const connStr = 'postgresql://neondb_owner:npg_lLZTbmK1WNR2@ep-gentle-night-b4oacb89-pooler.c-6.us-east-2.aws.neon.tech/neondb?sslmode=require';

async function main() {
  const client = new Client({ connectionString: connStr });
  await client.connect();

  console.log('Connected to Neon via pooler!');

  // 1. Create trigger function to automatically sync neon_auth.user to public.profiles
  await client.query(`
    CREATE OR REPLACE FUNCTION public.handle_neon_auth_user()
    RETURNS TRIGGER
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public, pg_temp
    AS $$
    BEGIN
      INSERT INTO public.profiles (
        id,
        email,
        full_name,
        avatar_url,
        role,
        created_at,
        updated_at
      )
      VALUES (
        NEW.id::text,
        NEW.email,
        NEW.name,
        NEW.image,
        'user',
        COALESCE(NEW."createdAt", NOW()),
        COALESCE(NEW."updatedAt", NOW())
      )
      ON CONFLICT (id) DO UPDATE
      SET 
        email = EXCLUDED.email,
        full_name = COALESCE(public.profiles.full_name, EXCLUDED.full_name),
        avatar_url = COALESCE(public.profiles.avatar_url, EXCLUDED.avatar_url),
        updated_at = NOW();

      RETURN NEW;
    END;
    $$;
  `);

  await client.query(`
    DROP TRIGGER IF EXISTS trg_handle_neon_auth_user ON neon_auth.user;
    CREATE TRIGGER trg_handle_neon_auth_user
      AFTER INSERT OR UPDATE ON neon_auth.user
      FOR EACH ROW
      EXECUTE FUNCTION public.handle_neon_auth_user();
  `);
  console.log('Created trg_handle_neon_auth_user trigger on neon_auth.user!');

  // 2. Backfill any neon_auth.user rows that are missing in public.profiles
  const backfillRes = await client.query(`
    INSERT INTO public.profiles (id, email, full_name, avatar_url, role, created_at, updated_at)
    SELECT 
      u.id::text, 
      u.email, 
      u.name, 
      u.image, 
      'user', 
      COALESCE(u."createdAt", NOW()), 
      COALESCE(u."updatedAt", NOW())
    FROM neon_auth.user u
    WHERE NOT EXISTS (
      SELECT 1 FROM public.profiles p WHERE p.id = u.id::text
    )
    ON CONFLICT (id) DO NOTHING
    RETURNING id, email, full_name;
  `);
  console.log(`Backfilled ${backfillRes.rowCount} users into public.profiles:`, backfillRes.rows);

  // Verify test user
  const checkTestUser = await client.query('SELECT id, email, full_name, role FROM public.profiles WHERE id = $1', ['03b1ffcf-7989-447e-a7a3-bc089c1aa7c9']);
  console.log('Test user profile verified:', checkTestUser.rows);

  await client.end();
}

main().catch(console.error);
