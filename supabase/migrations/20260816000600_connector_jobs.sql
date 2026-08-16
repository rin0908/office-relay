-- OFFICE RELAY : Devin Connector Factory job updates
-- The edge function runs with the caller's JWT (never a service_role key), so
-- job progress is written through this SECURITY DEFINER function which
-- re-checks organization membership.

create or replace function public.update_connector_job(
  p_job_id uuid,
  p_status public.connector_job_status default null,
  p_devin_session_id text default null,
  p_devin_session_url text default null,
  p_pull_request_url text default null,
  p_error text default null,
  p_log_entry text default null
)
returns public.connector_jobs
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_job public.connector_jobs;
begin
  select * into v_job from public.connector_jobs where id = p_job_id;
  if v_job.id is null then
    raise exception 'connector job not found';
  end if;
  if not public.is_org_member(v_job.org_id) then
    raise exception 'not authorized for this connector job';
  end if;

  update public.connector_jobs
  set status = coalesce(p_status, status),
      devin_session_id = coalesce(p_devin_session_id, devin_session_id),
      devin_session_url = coalesce(p_devin_session_url, devin_session_url),
      pull_request_url = coalesce(p_pull_request_url, pull_request_url),
      error = case when p_error is null then error else p_error end,
      log = case
        when p_log_entry is null then log
        else log || jsonb_build_object('at', now(), 'message', p_log_entry)
      end,
      updated_at = now()
  where id = p_job_id
  returning * into v_job;

  return v_job;
end;
$$;

grant execute on function public.update_connector_job(
  uuid, public.connector_job_status, text, text, text, text, text
) to authenticated;
