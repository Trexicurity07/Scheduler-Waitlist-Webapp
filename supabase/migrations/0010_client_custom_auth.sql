-- Remove Supabase auth.users dependency from client_profiles.
-- Clients now use bcrypt + a session cookie instead of Supabase auth sessions.

-- Drop RLS policies that used auth.uid() — all access is now via service role.
DROP POLICY IF EXISTS "Clients can read their own profile"       ON public.client_profiles;
DROP POLICY IF EXISTS "Clients can update their own profile"    ON public.client_profiles;
DROP POLICY IF EXISTS "Clients can view their own client records" ON public.clients;

-- Remove the FK to auth.users; user_id is now a self-managed UUID.
ALTER TABLE public.client_profiles
  DROP CONSTRAINT IF EXISTS client_profiles_user_id_fkey;

-- Add custom-auth columns.
ALTER TABLE public.client_profiles
  ADD COLUMN IF NOT EXISTS password_hash    TEXT,
  ADD COLUMN IF NOT EXISTS session_token    TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS session_expires_at TIMESTAMPTZ;
