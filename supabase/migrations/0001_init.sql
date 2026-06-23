create extension if not exists "pgcrypto";

create table businesses (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null unique references auth.users(id) on delete cascade,
  name text not null,
  public_slug text not null unique,
  whatsapp_number text not null,
  timezone text not null,
  calendar_provider text not null default 'google',
  google_refresh_token_encrypted text not null,
  dedicated_calendar_id text not null,
  calendar_status text not null default 'connected',
  last_checked_at timestamptz,
  processing_started_at timestamptz,
  batch_size int not null default 3,
  batch_interval_minutes int not null default 30,
  min_notice_hours int not null default 24,
  min_confirm_lead_hours int not null default 12,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint confirm_lead_less_than_notice check (min_confirm_lead_hours < min_notice_hours),
  constraint calendar_status_valid check (calendar_status in ('connected', 'disconnected'))
);

create table clients (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  name text not null,
  email text not null,
  phone text not null,
  created_at timestamptz not null default now()
);
create index clients_business_id_idx on clients(business_id);

create table appointments (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  google_event_id text not null,
  summary text,
  start_time timestamptz not null,
  end_time timestamptz not null,
  status text not null,
  synced_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint appointments_status_valid check (status in ('confirmed', 'cancelled')),
  unique (business_id, google_event_id)
);
create index appointments_business_id_idx on appointments(business_id);

create table waitlist_entries (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  client_id uuid not null references clients(id) on delete cascade,
  time_windows jsonb not null,
  status text not null default 'pending_verification',
  email_verification_token text,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  updated_at timestamptz not null default now(),
  constraint waitlist_status_valid check (
    status in ('pending_verification', 'active', 'filled', 'expired', 'removed')
  )
);
create index waitlist_entries_business_status_idx on waitlist_entries(business_id, status);
create index waitlist_entries_client_id_idx on waitlist_entries(client_id);

create table notifications (
  id uuid primary key default gen_random_uuid(),
  waitlist_entry_id uuid not null references waitlist_entries(id) on delete cascade,
  appointment_id uuid references appointments(id) on delete cascade,
  type text not null,
  channel text not null default 'email',
  status text not null default 'sent',
  token text unique,
  batch_number int,
  sent_at timestamptz not null default now(),
  responded_at timestamptz,
  constraint notifications_type_valid check (
    type in ('slot_offer', 'owner_added', 'owner_removed', 'expiry', 'email_verification')
  ),
  constraint notifications_channel_valid check (channel in ('email')),
  constraint notifications_status_valid check (
    status in ('sent', 'confirmed', 'declined', 'expired', 'superseded')
  )
);
create index notifications_waitlist_entry_id_idx on notifications(waitlist_entry_id);
create index notifications_appointment_status_idx on notifications(appointment_id, status);

alter table businesses enable row level security;
alter table clients enable row level security;
alter table appointments enable row level security;
alter table waitlist_entries enable row level security;
alter table notifications enable row level security;

create policy "Owners can view their own business" on businesses
  for select using (owner_user_id = auth.uid());
create policy "Owners can update their own business" on businesses
  for update using (owner_user_id = auth.uid());

create policy "Owners can view their clients" on clients
  for select using (business_id in (select id from businesses where owner_user_id = auth.uid()));

create policy "Owners can view their appointments" on appointments
  for select using (business_id in (select id from businesses where owner_user_id = auth.uid()));

create policy "Owners can view their waitlist entries" on waitlist_entries
  for select using (business_id in (select id from businesses where owner_user_id = auth.uid()));
create policy "Owners can update their waitlist entries" on waitlist_entries
  for update using (business_id in (select id from businesses where owner_user_id = auth.uid()));
create policy "Owners can insert waitlist entries" on waitlist_entries
  for insert with check (business_id in (select id from businesses where owner_user_id = auth.uid()));

create policy "Owners can view their notifications" on notifications
  for select using (
    waitlist_entry_id in (
      select id from waitlist_entries where business_id in (
        select id from businesses where owner_user_id = auth.uid()
      )
    )
  );
