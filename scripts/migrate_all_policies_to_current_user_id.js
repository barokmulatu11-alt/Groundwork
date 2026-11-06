const { Client } = require('pg');

const connStr = process.env.NEON_DATABASE_URL || 'postgresql://neondb_owner:npg_lLZTbmK1WNR2@ep-gentle-night-b4oacb89.c-6.us-east-2.aws.neon.tech/neondb?sslmode=require';

async function main() {
  const client = new Client({ connectionString: connStr, ssl: { rejectUnauthorized: false } });
  await client.connect();

  console.log('Ensuring public.current_user_id() exists with SECURITY DEFINER...');
  await client.query(`
    CREATE OR REPLACE FUNCTION public.current_user_id()
    RETURNS text
    LANGUAGE plpgsql
    STABLE
    SECURITY DEFINER
    SET search_path = public, auth, pg_temp
    AS $$
    DECLARE
      v_uid text;
    BEGIN
      -- 1. Try auth.user_id() from pg_session_jwt
      BEGIN
        v_uid := auth.user_id();
        IF v_uid IS NOT NULL AND v_uid <> '' THEN
          RETURN v_uid;
        END IF;
      EXCEPTION WHEN OTHERS THEN
        NULL;
      END;

      -- 2. Try PostgREST JWT claim sub
      BEGIN
        v_uid := current_setting('request.jwt.claim.sub', true);
        IF v_uid IS NOT NULL AND v_uid <> '' THEN
          RETURN v_uid;
        END IF;
      EXCEPTION WHEN OTHERS THEN
        NULL;
      END;

      -- 3. Try PostgREST JWT claim id
      BEGIN
        v_uid := current_setting('request.jwt.claim.id', true);
        IF v_uid IS NOT NULL AND v_uid <> '' THEN
          RETURN v_uid;
        END IF;
      EXCEPTION WHEN OTHERS THEN
        NULL;
      END;

      RETURN NULL;
    END;
    $$;

    GRANT EXECUTE ON FUNCTION public.current_user_id() TO authenticated, anonymous, authenticator, public;
  `);

  console.log('Fetching policies referencing auth.user_id()...');
  const policiesRes = await client.query(`
    SELECT 
      schemaname, 
      tablename, 
      policyname, 
      roles, 
      cmd, 
      qual, 
      with_check
    FROM pg_policies
    WHERE schemaname = 'public' 
      AND (qual LIKE '%auth.user_id%' OR with_check LIKE '%auth.user_id%')
    ORDER BY tablename, policyname;
  `);

  console.log(`Found ${policiesRes.rows.length} policies to update.`);

  for (const pol of policiesRes.rows) {
    let rolesFormatted = 'authenticated';
    if (Array.isArray(pol.roles)) {
      rolesFormatted = pol.roles.join(', ');
    } else if (typeof pol.roles === 'string') {
      rolesFormatted = pol.roles.replace(/[{}]/g, '').trim();
    }
    const rolesClause = rolesFormatted ? `TO ${rolesFormatted}` : 'TO authenticated';

    const newQual = pol.qual ? pol.qual.replace(/auth\.user_id\(\)/g, 'public.current_user_id()') : null;
    const newCheck = pol.with_check ? pol.with_check.replace(/auth\.user_id\(\)/g, 'public.current_user_id()') : null;

    let createStmt = `CREATE POLICY "${pol.policyname}" ON "${pol.schemaname}"."${pol.tablename}"\n  FOR ${pol.cmd} ${rolesClause}\n`;
    if (newQual) {
      createStmt += `  USING (${newQual})\n`;
    }
    if (newCheck) {
      createStmt += `  WITH CHECK (${newCheck})\n`;
    }

    try {
      await client.query(`DROP POLICY IF EXISTS "${pol.policyname}" ON "${pol.schemaname}"."${pol.tablename}";`);
      await client.query(createStmt);
      console.log(`✔ Updated ${pol.tablename}.${pol.policyname}`);
    } catch (err) {
      console.error(`❌ Failed on ${pol.tablename}.${pol.policyname}:`, err.message);
      console.error(createStmt);
    }
  }

  await client.query("NOTIFY pgrst, 'reload schema';");
  console.log('PostgREST schema reloaded successfully.');

  await client.end();
}

main().catch(console.error);
