ALTER TABLE pending_signups
  ADD COLUMN IF NOT EXISTS plan_tier text NOT NULL DEFAULT 'starter',
  ADD COLUMN IF NOT EXISTS payment_session uuid;

ALTER TABLE owner_profiles
  ADD COLUMN IF NOT EXISTS plan_tier text NOT NULL DEFAULT 'starter';
