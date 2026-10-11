-- Phase 9F DRAFT - production execution requires separate reviewed approval.
-- This migration first targets postgres-owned RizSim public tables.
-- Keep application SELECT/INSERT/UPDATE/DELETE grants and RLS intact.
REVOKE TRUNCATE, TRIGGER, REFERENCES, MAINTAIN
  ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
-- Default permissions apply to future postgres-owned tables only.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE TRUNCATE, TRIGGER, REFERENCES, MAINTAIN ON TABLES FROM anon, authenticated;
-- supabase_admin default privileges require owner-level permission;
-- review separately and do not run an unauthorized default-ACL change.
