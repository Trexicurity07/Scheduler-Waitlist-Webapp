-- Collected at connect-setup going forward; empty string for existing rows.
alter table businesses add column business_type text not null default '';
