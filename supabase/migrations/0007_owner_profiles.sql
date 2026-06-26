CREATE TABLE public.owner_profiles (
  auth_user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  business_name TEXT NOT NULL,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT owner_profiles_business_name_unique UNIQUE (business_name),
  CONSTRAINT owner_profiles_email_unique UNIQUE (email)
);

ALTER TABLE public.owner_profiles ENABLE ROW LEVEL SECURITY;
