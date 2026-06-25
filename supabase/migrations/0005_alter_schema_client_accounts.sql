-- Pre-launch: no real production data — wipe before altering.
-- Cascade removes waitlist_entries and notifications automatically.
truncate clients cascade;

-- Move identity columns to client_profiles.
-- Dropping email and phone automatically drops the two unique indexes
-- added in migration 0003 (clients_business_id_email_idx and
-- clients_business_id_phone_idx), since those indexes include these columns.
alter table clients drop column name;
alter table clients drop column email;
alter table clients drop column phone;

-- Link each clients row to a platform-level account.
alter table clients
  add column user_id uuid not null
  references client_profiles(user_id) on delete cascade;

-- One client record per (business, account).
create unique index clients_business_id_user_id_idx on clients(business_id, user_id);

-- Clients can view their own per-business records.
create policy "Clients can view their own client records"
  on clients for select using (user_id = auth.uid());

-- Per-entry email verification is retired; account-level verification
-- (client_profiles.verified_at) replaces it.
alter table waitlist_entries drop column email_verification_token;
alter table waitlist_entries drop column verified_at;

alter table waitlist_entries drop constraint waitlist_status_valid;
alter table waitlist_entries add constraint waitlist_status_valid check (
  status in ('active', 'filled', 'expired', 'removed')
);
