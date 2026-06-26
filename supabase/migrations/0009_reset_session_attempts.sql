ALTER TABLE public.owner_profiles
  ADD COLUMN password_reset_session TEXT UNIQUE,
  ADD COLUMN password_reset_attempts INTEGER NOT NULL DEFAULT 0;

ALTER TABLE public.client_profiles
  ADD COLUMN password_reset_session TEXT UNIQUE,
  ADD COLUMN password_reset_attempts INTEGER NOT NULL DEFAULT 0;
