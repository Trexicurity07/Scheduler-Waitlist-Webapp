-- Pending signups table: stores pre-verification data for both owners and clients.
-- Rows are inserted on signup and deleted once the email code is verified.
-- Upsert on (email, account_type) handles resend cleanly.

CREATE TABLE public.pending_signups (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  account_type      TEXT        NOT NULL CHECK (account_type IN ('owner', 'client')),
  email             TEXT        NOT NULL,
  password_hash     TEXT        NOT NULL,
  verification_code TEXT        NOT NULL,
  expires_at        TIMESTAMPTZ NOT NULL,
  -- owner-specific
  business_name     TEXT,
  -- client-specific
  name              TEXT,
  phone             TEXT,
  created_at        TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX pending_signups_email_type_idx
  ON public.pending_signups(email, account_type);

-- Drop link-based email verification columns from client_profiles.
-- Every row in client_profiles is now verified by definition (inserted only after code check).
ALTER TABLE public.client_profiles
  DROP COLUMN IF EXISTS email_verification_token,
  DROP COLUMN IF EXISTS verified_at;
