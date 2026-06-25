create table client_profiles (
  user_id     uuid        primary key references auth.users(id) on delete cascade,
  name        text        not null,
  email       text        not null unique,
  phone       text        not null unique,
  email_verification_token text,
  verified_at timestamptz,
  created_at  timestamptz not null default now()
);

alter table client_profiles enable row level security;

create policy "Clients can read their own profile"
  on client_profiles for select using (user_id = auth.uid());

create policy "Clients can update their own profile"
  on client_profiles for update using (user_id = auth.uid());
