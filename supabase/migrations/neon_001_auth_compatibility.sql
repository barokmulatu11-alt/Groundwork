-- ====================================================================
-- NEON MIGRATION: Auth Compatibility Layer
-- This script ensures existing RLS policies depending on auth.uid() 
-- continue to function when queried via the Neon Data API.
-- ====================================================================

-- 1. Create the auth schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS auth;

-- 2. Mock auth.users for existing foreign keys. 
-- In Neon Auth (Better Auth), users are stored in `neon_auth.users`.
-- We create a view to map neon_auth.users to auth.users so existing 
-- foreign keys and queries won't immediately break.
-- Note: Foreign key constraints against views are not supported in Postgres.
-- We will need to alter existing foreign keys to point to neon_auth.users directly in a later step.
-- For now, this allows SELECTs to work.

-- CREATE VIEW auth.users AS SELECT * FROM neon_auth.users;

-- 3. Define auth.uid() to extract the JWT subject (sub) claim.
-- Neon Data API passes the JWT via request.jwt.claims.
CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid AS $$
BEGIN
  RETURN (
    SELECT NULLIF(
      current_setting('request.jwt.claim.sub', true),
      ''
    )::uuid
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE;
