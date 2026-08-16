-- OFFICE RELAY : table/function privileges for the API roles.
--
-- Row Level Security stays enabled on every table (see 20260816000200_rls.sql);
-- these GRANTs only make the tables reachable for the `authenticated` role, so
-- that RLS policies - not missing privileges - decide what a signed-in user can
-- read or write. `anon` gets no data access at all: OFFICE RELAY is B2B and
-- requires an authenticated organization member.

grant usage on schema public to anon, authenticated;
grant usage on schema extensions to anon, authenticated;

grant select, insert, update, delete on all tables in schema public to authenticated;
grant execute on all functions in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;

alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema public
  grant execute on functions to authenticated;
