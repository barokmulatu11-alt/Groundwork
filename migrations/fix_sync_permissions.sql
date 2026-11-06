-- Groundwork Database Permissions for Cloud Sync (Neon / PostgREST)
-- Fixes "permission denied for table tasks/habits/notes/focus_sessions/day_notes"

GRANT USAGE ON SCHEMA public TO authenticated, anonymous, authenticator;

-- Grant table CRUD to authenticated users
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticator;

-- Grant read on public tables to anonymous
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anonymous;

-- Grant usage on sequences for serial/auto-increment columns
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated, authenticator, anonymous;

-- Ensure future tables automatically inherit these permissions
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO authenticated, authenticator;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated, authenticator;
