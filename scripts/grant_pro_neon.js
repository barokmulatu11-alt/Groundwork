const { Client } = require('pg');

const connStr = 'postgresql://neondb_owner:npg_lLZTbmK1WNR2@ep-gentle-night-b4oacb89.c-6.us-east-2.aws.neon.tech/neondb?sslmode=require';

async function main() {
  const client = new Client({ connectionString: connStr });
  await client.connect();

  console.log('Connected to Neon database!');

  // 1. Ensure public.is_admin() recognizes direct database connections / neondb_owner / superusers
  await client.query(`
    CREATE OR REPLACE FUNCTION public.is_admin()
    RETURNS BOOLEAN
    LANGUAGE plpgsql
    STABLE
    SECURITY DEFINER
    SET search_path = public, pg_temp
    AS $$
    BEGIN
      -- Direct database connection / superuser / database owner (Neon SQL Editor, psql, scripts)
      IF current_user IN ('postgres', 'neondb_owner') 
         OR session_user IN ('postgres', 'neondb_owner') THEN
        RETURN true;
      END IF;

      -- Service role / JWT claim check
      IF coalesce(current_setting('request.jwt.claim.role', true), '') = 'service_role' THEN
        RETURN true;
      END IF;

      -- Check auth.user_id() if present
      BEGIN
        IF auth.user_id() IS NOT NULL THEN
          RETURN EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.user_id()
              AND lower(trim(coalesce(role, ''))) IN ('admin', 'owner')
          );
        END IF;
      EXCEPTION WHEN OTHERS THEN
        NULL;
      END;

      RETURN false;
    END;
    $$;
  `);
  console.log('Updated public.is_admin() successfully.');

  // 2. Update profiles_role_check constraint so 'pro' is also accepted as a role
  console.log('Updating profiles_role_check constraint...');
  await client.query(`
    ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('user', 'moderator', 'admin', 'owner', 'pro'));
  `);
  console.log('profiles_role_check updated to allow (user, moderator, admin, owner, pro).');

  // 3. Update ayfokruleul1@gmail.com to Pro
  console.log('Granting Pro to ayfokruleul1@gmail.com...');
  const res = await client.query(`
    UPDATE public.profiles
    SET 
      pro_status = true,
      role = 'pro',
      subscription_type = 'lifetime',
      pro_until = NOW() + INTERVAL '100 years',
      settings = jsonb_set(
        COALESCE(settings, '{}'::jsonb),
        '{unlocked_rewards}',
        '["focus_presets", "habit_heatmaps", "deep_analytics", "premium_themes", "cloud_vault"]'::jsonb
      ),
      updated_at = NOW()
    WHERE email = 'ayfokruleul1@gmail.com'
    RETURNING id, email, username, full_name, role, pro_status, subscription_type, pro_until, settings;
  `);

  console.log('Successfully updated profile:');
  console.log(JSON.stringify(res.rows[0], null, 2));

  await client.end();
}

main().catch(err => {
  console.error('Error running script:', err);
  process.exit(1);
});
