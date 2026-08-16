-- OFFICE RELAY : Supabase Realtime
-- Both dashboards follow match / transfer state changes without a refresh.
-- Realtime evaluates the subscriber's RLS policies for every change, so the
-- policies from 20260816000200_rls.sql also protect the Realtime stream.

alter publication supabase_realtime add table public.matches;
alter publication supabase_realtime add table public.transfers;
alter publication supabase_realtime add table public.items;
alter publication supabase_realtime add table public.needs;
alter publication supabase_realtime add table public.connector_jobs;

-- Realtime needs the full previous row to deliver reliable UPDATE payloads.
alter table public.matches replica identity full;
alter table public.transfers replica identity full;
alter table public.connector_jobs replica identity full;
