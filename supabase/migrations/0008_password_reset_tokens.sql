ALTER TABLE public.owner_profiles
  ADD COLUMN password_reset_token TEXT,
  ADD COLUMN password_reset_expires_at TIMESTAMPTZ;

ALTER TABLE public.client_profiles
  ADD COLUMN password_reset_token TEXT,
  ADD COLUMN password_reset_expires_at TIMESTAMPTZ;
