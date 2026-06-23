-- Standard Supabase default privileges, missing from the local bootstrap.
-- PostgREST checks base table grants before RLS is evaluated, so without
-- these, every request (including the RLS-bypassing service_role) gets
-- "permission denied for table ..." regardless of policies defined.
grant usage on schema public to anon, authenticated, service_role;

grant all on all tables in schema public to anon, authenticated, service_role;
grant all on all sequences in schema public to anon, authenticated, service_role;
grant all on all routines in schema public to anon, authenticated, service_role;

alter default privileges in schema public
  grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public
  grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public
  grant all on routines to anon, authenticated, service_role;
