-- Remove Supabase auth.users dependency from owner auth.
-- All owner auth is now handled by bcrypt + session cookie, same as clients.

-- Drop all RLS policies that reference auth.uid() on owner-managed tables.
DROP POLICY IF EXISTS "Owners can view their own business"       ON public.businesses;
DROP POLICY IF EXISTS "Owners can update their own business"     ON public.businesses;
DROP POLICY IF EXISTS "Owners can view their clients"            ON public.clients;
DROP POLICY IF EXISTS "Owners can view their appointments"       ON public.appointments;
DROP POLICY IF EXISTS "Owners can view their waitlist entries"   ON public.waitlist_entries;
DROP POLICY IF EXISTS "Owners can update their waitlist entries" ON public.waitlist_entries;
DROP POLICY IF EXISTS "Owners can insert waitlist entries"       ON public.waitlist_entries;
DROP POLICY IF EXISTS "Owners can view their notifications"      ON public.notifications;

-- Drop FK from businesses to auth.users so owner_user_id is a free UUID.
ALTER TABLE public.businesses
  DROP CONSTRAINT IF EXISTS businesses_owner_user_id_fkey;

-- Drop FK from owner_profiles to auth.users.
ALTER TABLE public.owner_profiles
  DROP CONSTRAINT IF EXISTS owner_profiles_auth_user_id_fkey;

-- Re-add FK from businesses to owner_profiles for referential integrity.
ALTER TABLE public.businesses
  ADD CONSTRAINT businesses_owner_user_id_fkey
  FOREIGN KEY (owner_user_id) REFERENCES public.owner_profiles(auth_user_id) ON DELETE CASCADE;

-- Add custom auth columns.
ALTER TABLE public.owner_profiles
  ADD COLUMN IF NOT EXISTS password_hash      TEXT,
  ADD COLUMN IF NOT EXISTS session_token      TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS session_expires_at TIMESTAMPTZ;
