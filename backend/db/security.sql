-- =============================================================================
-- NyayaFlow: lock down direct database access
-- Run once in Supabase → SQL Editor. Safe to run again.
--
-- The backend talks to Supabase with the SERVICE ROLE key, which bypasses
-- Row Level Security. Browsers never talk to the database directly.
-- Enabling RLS with no policies therefore blocks the public anon key
-- (which anyone can find) from reading or writing any of these tables,
-- while the backend keeps working.
-- =============================================================================

ALTER TABLE public.users                      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.advocate_profiles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.petitions                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.physical_archive_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.court_orders               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.otp_verifications          ENABLE ROW LEVEL SECURITY;

-- Belt and braces: remove table privileges from the public roles
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;

-- Private bucket for uploaded documents (the backend also creates it on startup)
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('documents', 'documents', false, 15728640)
ON CONFLICT (id) DO UPDATE SET public = false;

-- Speeds up "my petitions" for citizens
CREATE INDEX IF NOT EXISTS idx_petitions_citizen ON public.petitions(citizen_id);
CREATE INDEX IF NOT EXISTS idx_documents_user ON public.documents(user_id);

-- =============================================================================
-- Creating official accounts (police, registry, judges)
-- Citizens and advocates can sign up themselves. Official accounts must exist
-- before the person can sign in. Add one per person, for example:
--
-- INSERT INTO public.users (email, full_name, role, verified_contact)
-- VALUES ('registrar@example.com', 'Registry Officer Name', 'registrar', true);
--
-- Roles: 'police', 'registrar', 'judge', 'admin'.
-- Your own administrator account can also be allowed with the ADMIN_EMAILS
-- environment variable on Render.
-- =============================================================================
