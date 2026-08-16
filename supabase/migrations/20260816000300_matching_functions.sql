-- OFFICE RELAY : organization bootstrap, matching candidates, accept flow.
--
-- Design note
-- -----------
-- The *composition* of the match score lives in TypeScript
-- (src/lib/matching/*) so that strategies (rules / semantic / geospatial) can
-- be swapped or combined and unit tested. The *math that only Postgres can do*
-- lives here: pgvector cosine similarity and PostGIS distance.

-- ---------------------------------------------------------------------------
-- create_organization : atomically create an organization and its first member
-- ---------------------------------------------------------------------------
create or replace function public.create_organization(
  p_name text,
  p_org_type public.org_type,
  p_public_location text default '',
  p_lat double precision default null,
  p_lng double precision default null
)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_org_id uuid;
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;

  insert into public.organizations (name, org_type, public_location, location)
  values (
    p_name,
    p_org_type,
    coalesce(p_public_location, ''),
    case
      when p_lat is null or p_lng is null then null
      else st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography
    end
  )
  returning id into v_org_id;

  insert into public.org_members (org_id, user_id, role)
  values (v_org_id, auth.uid(), 'owner');

  return v_org_id;
end;
$$;

grant execute on function public.create_organization(text, public.org_type, text, double precision, double precision) to authenticated;

-- ---------------------------------------------------------------------------
-- set_point : helper used by the application to write geography columns
-- without leaking PostGIS syntax into the client.
-- ---------------------------------------------------------------------------
create or replace function public.set_item_location(
  p_item_id uuid,
  p_lat double precision,
  p_lng double precision
)
returns void
language plpgsql
set search_path = public, extensions
as $$
begin
  update public.items
  set location = st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography
  where id = p_item_id;
end;
$$;

create or replace function public.set_need_location(
  p_need_id uuid,
  p_lat double precision,
  p_lng double precision
)
returns void
language plpgsql
set search_path = public, extensions
as $$
begin
  update public.needs
  set location = st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography
  where id = p_need_id;
end;
$$;

grant execute on function public.set_item_location(uuid, double precision, double precision) to authenticated;
grant execute on function public.set_need_location(uuid, double precision, double precision) to authenticated;

-- ---------------------------------------------------------------------------
-- embedding writers (vector cannot be sent as a plain array through PostgREST
-- filters reliably, so we expose explicit RPCs)
-- ---------------------------------------------------------------------------
create or replace function public.set_embedding(
  p_table text,
  p_id uuid,
  p_embedding text
)
returns void
language plpgsql
set search_path = public, extensions
as $$
begin
  if p_table not in ('items', 'needs', 'service_offers', 'service_wants') then
    raise exception 'unsupported table %', p_table;
  end if;

  execute format(
    'update public.%I set embedding = $1::vector where id = $2',
    p_table
  ) using p_embedding, p_id;
end;
$$;

grant execute on function public.set_embedding(text, uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- match_candidates : every cross-organization (item, need) pair that is worth
-- scoring, enriched with pgvector similarity and PostGIS distance.
-- ---------------------------------------------------------------------------
create or replace function public.match_candidates(p_org_id uuid)
returns table (
  item_id uuid,
  need_id uuid,
  donor_org_id uuid,
  recipient_org_id uuid,
  item_title text,
  item_description text,
  item_category text,
  item_quantity integer,
  item_public_location text,
  item_pickup_deadline timestamptz,
  need_title text,
  need_description text,
  need_category text,
  need_quantity integer,
  need_public_location text,
  need_needed_by timestamptz,
  asset_similarity double precision,
  service_similarity double precision,
  donor_service_wants text[],
  recipient_service_offers text[],
  distance_m double precision
)
language sql
stable
security invoker
set search_path = public, extensions
as $$
  with scope as (
    select
      i.id as item_id,
      n.id as need_id,
      i.owner_org_id as donor_org_id,
      n.org_id as recipient_org_id,
      i.title as item_title,
      i.description as item_description,
      i.category as item_category,
      i.quantity as item_quantity,
      i.public_location as item_public_location,
      i.pickup_deadline as item_pickup_deadline,
      n.title as need_title,
      n.description as need_description,
      n.category as need_category,
      n.quantity as need_quantity,
      n.public_location as need_public_location,
      n.needed_by as need_needed_by,
      case
        when i.embedding is null or n.embedding is null then null
        else 1 - (i.embedding <=> n.embedding)
      end as asset_similarity,
      coalesce(i.location, donor.location) as donor_point,
      coalesce(n.location, recipient.location) as recipient_point
    from public.items i
    join public.organizations donor on donor.id = i.owner_org_id
    join public.needs n on n.org_id <> i.owner_org_id
    join public.organizations recipient on recipient.id = n.org_id
    where i.status = 'available'
      and n.status = 'open'
      and (i.owner_org_id = p_org_id or n.org_id = p_org_id)
      and (
        i.category = n.category
        or (
          i.embedding is not null
          and n.embedding is not null
          and (1 - (i.embedding <=> n.embedding)) > 0.55
        )
      )
  )
  select
    s.item_id,
    s.need_id,
    s.donor_org_id,
    s.recipient_org_id,
    s.item_title,
    s.item_description,
    s.item_category,
    s.item_quantity,
    s.item_public_location,
    s.item_pickup_deadline,
    s.need_title,
    s.need_description,
    s.need_category,
    s.need_quantity,
    s.need_public_location,
    s.need_needed_by,
    s.asset_similarity,
    -- Double Semantic Matching : DONOR service wants x STARTUP service offers
    (
      select max(1 - (w.embedding <=> o.embedding))
      from public.service_wants w
      join public.service_offers o
        on o.org_id = s.recipient_org_id
      where w.org_id = s.donor_org_id
        and w.embedding is not null
        and o.embedding is not null
    ) as service_similarity,
    (
      select coalesce(array_agg(w.title || ' ' || w.description), '{}')
      from public.service_wants w where w.org_id = s.donor_org_id
    ) as donor_service_wants,
    (
      select coalesce(array_agg(o.title || ' ' || o.description), '{}')
      from public.service_offers o where o.org_id = s.recipient_org_id
    ) as recipient_service_offers,
    case
      when s.donor_point is null or s.recipient_point is null then null
      else st_distance(s.donor_point, s.recipient_point)
    end as distance_m
  from scope s
  limit 500;
$$;

grant execute on function public.match_candidates(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- save_matches : persist scores computed by the TypeScript matching engine.
-- Runs as the caller, so RLS decides what may be written.
-- ---------------------------------------------------------------------------
create or replace function public.save_matches(p_matches jsonb)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_row jsonb;
  v_count integer := 0;
begin
  for v_row in select * from jsonb_array_elements(coalesce(p_matches, '[]'::jsonb))
  loop
    insert into public.matches (
      item_id, need_id, donor_org_id, recipient_org_id,
      asset_score, quantity_score, service_score, location_score, urgency_score,
      total_score, score_detail
    )
    values (
      (v_row ->> 'item_id')::uuid,
      (v_row ->> 'need_id')::uuid,
      (v_row ->> 'donor_org_id')::uuid,
      (v_row ->> 'recipient_org_id')::uuid,
      (v_row ->> 'asset_score')::numeric,
      (v_row ->> 'quantity_score')::numeric,
      (v_row ->> 'service_score')::numeric,
      (v_row ->> 'location_score')::numeric,
      (v_row ->> 'urgency_score')::numeric,
      (v_row ->> 'total_score')::numeric,
      coalesce(v_row -> 'score_detail', '{}'::jsonb)
    )
    on conflict (item_id, need_id) do update
      set asset_score = excluded.asset_score,
          quantity_score = excluded.quantity_score,
          service_score = excluded.service_score,
          location_score = excluded.location_score,
          urgency_score = excluded.urgency_score,
          total_score = excluded.total_score,
          score_detail = excluded.score_detail
      where public.matches.status = 'proposed';

    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

grant execute on function public.save_matches(jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- accept_match : STARTUP accepts, then DONOR accepts.
-- ---------------------------------------------------------------------------
create or replace function public.accept_match(p_match_id uuid)
returns public.matches
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_match public.matches;
  v_is_donor boolean;
  v_is_recipient boolean;
begin
  select * into v_match from public.matches where id = p_match_id;
  if v_match.id is null then
    raise exception 'match not found';
  end if;

  v_is_donor := public.is_org_member(v_match.donor_org_id);
  v_is_recipient := public.is_org_member(v_match.recipient_org_id);

  if not (v_is_donor or v_is_recipient) then
    raise exception 'not authorized for this match';
  end if;

  if v_match.status = 'rejected' then
    raise exception 'match already rejected';
  end if;

  if v_is_recipient then
    v_match.startup_accepted_at := coalesce(v_match.startup_accepted_at, now());
  end if;

  if v_is_donor then
    if v_match.startup_accepted_at is null then
      raise exception 'STARTUP acceptance is required first';
    end if;
    v_match.donor_accepted_at := coalesce(v_match.donor_accepted_at, now());
  end if;

  if v_match.startup_accepted_at is not null and v_match.donor_accepted_at is not null then
    v_match.status := 'accepted';
  elsif v_match.startup_accepted_at is not null then
    v_match.status := 'pending_donor';
  end if;

  update public.matches
  set startup_accepted_at = v_match.startup_accepted_at,
      donor_accepted_at = v_match.donor_accepted_at,
      status = v_match.status
  where id = p_match_id
  returning * into v_match;

  return v_match;
end;
$$;

create or replace function public.reject_match(p_match_id uuid)
returns public.matches
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_match public.matches;
begin
  select * into v_match from public.matches where id = p_match_id;
  if v_match.id is null then
    raise exception 'match not found';
  end if;

  if not (public.is_org_member(v_match.donor_org_id) or public.is_org_member(v_match.recipient_org_id)) then
    raise exception 'not authorized for this match';
  end if;

  update public.matches set status = 'rejected' where id = p_match_id returning * into v_match;
  return v_match;
end;
$$;

grant execute on function public.accept_match(uuid) to authenticated;
grant execute on function public.reject_match(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Transfer is created automatically when both sides accepted.
-- ---------------------------------------------------------------------------
create or replace function public.create_transfer_on_double_accept()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_deadline timestamptz;
begin
  if new.status = 'accepted'
     and new.startup_accepted_at is not null
     and new.donor_accepted_at is not null
     and (old.status is distinct from 'accepted')
  then
    select i.pickup_deadline into v_deadline from public.items i where i.id = new.item_id;

    insert into public.transfers (match_id, delivery_method, scheduled_at, status)
    values (new.id, 'donor_pickup', coalesce(v_deadline, now() + interval '2 days'), 'scheduled')
    on conflict (match_id) do nothing;

    update public.items set status = 'reserved' where id = new.item_id;
    update public.needs set status = 'fulfilled' where id = new.need_id;
  end if;

  return new;
end;
$$;

create trigger matches_create_transfer
after update on public.matches
for each row execute function public.create_transfer_on_double_accept();
