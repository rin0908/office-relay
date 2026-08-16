-- OFFICE RELAY : Row Level Security
-- Organization boundary is enforced in the database, not in the UI.

-- ---------------------------------------------------------------------------
-- helpers
-- ---------------------------------------------------------------------------

-- SECURITY DEFINER so that policies on org_members do not recurse.
create or replace function public.is_org_member(p_org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.org_members m
    where m.org_id = p_org_id
      and m.user_id = auth.uid()
  );
$$;

create or replace function public.current_org_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select m.org_id from public.org_members m where m.user_id = auth.uid();
$$;

-- An item's private details become visible to the recipient organization only
-- after BOTH sides accepted the match.
create or replace function public.can_read_item_private(p_item_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    exists (
      select 1
      from public.items i
      join public.org_members m on m.org_id = i.owner_org_id
      where i.id = p_item_id and m.user_id = auth.uid()
    )
    or exists (
      select 1
      from public.matches mt
      join public.org_members m on m.org_id = mt.recipient_org_id
      where mt.item_id = p_item_id
        and mt.status = 'accepted'
        and mt.startup_accepted_at is not null
        and mt.donor_accepted_at is not null
        and m.user_id = auth.uid()
    );
$$;

grant execute on function public.is_org_member(uuid) to authenticated;
grant execute on function public.current_org_ids() to authenticated;
grant execute on function public.can_read_item_private(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- enable RLS everywhere
-- ---------------------------------------------------------------------------
alter table public.organizations enable row level security;
alter table public.org_members enable row level security;
alter table public.items enable row level security;
alter table public.item_private_details enable row level security;
alter table public.item_media enable row level security;
alter table public.needs enable row level security;
alter table public.service_offers enable row level security;
alter table public.service_wants enable row level security;
alter table public.matches enable row level security;
alter table public.transfers enable row level security;
alter table public.connector_jobs enable row level security;

-- ---------------------------------------------------------------------------
-- organizations : public directory information is readable by any signed-in
-- user, mutations only by members.
-- ---------------------------------------------------------------------------
create policy organizations_select on public.organizations
for select to authenticated using (true);

create policy organizations_update on public.organizations
for update to authenticated
using (public.is_org_member(id))
with check (public.is_org_member(id));

-- inserts go through public.create_organization() (SECURITY DEFINER)

-- ---------------------------------------------------------------------------
-- org_members : you can only see membership rows of your own organizations.
-- ---------------------------------------------------------------------------
create policy org_members_select on public.org_members
for select to authenticated
using (user_id = auth.uid() or public.is_org_member(org_id));

create policy org_members_delete on public.org_members
for delete to authenticated
using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- items : public columns are readable by every signed-in organization,
-- writes are restricted to the owning organization.
-- ---------------------------------------------------------------------------
create policy items_select on public.items
for select to authenticated using (true);

create policy items_insert on public.items
for insert to authenticated
with check (public.is_org_member(owner_org_id));

create policy items_update on public.items
for update to authenticated
using (public.is_org_member(owner_org_id))
with check (public.is_org_member(owner_org_id));

create policy items_delete on public.items
for delete to authenticated
using (public.is_org_member(owner_org_id));

-- ---------------------------------------------------------------------------
-- item_private_details : exact pickup address + contact note.
-- ---------------------------------------------------------------------------
create policy item_private_details_select on public.item_private_details
for select to authenticated
using (public.can_read_item_private(item_id));

create policy item_private_details_insert on public.item_private_details
for insert to authenticated
with check (
  exists (
    select 1 from public.items i
    where i.id = item_id and public.is_org_member(i.owner_org_id)
  )
);

create policy item_private_details_update on public.item_private_details
for update to authenticated
using (
  exists (
    select 1 from public.items i
    where i.id = item_id and public.is_org_member(i.owner_org_id)
  )
)
with check (
  exists (
    select 1 from public.items i
    where i.id = item_id and public.is_org_member(i.owner_org_id)
  )
);

create policy item_private_details_delete on public.item_private_details
for delete to authenticated
using (
  exists (
    select 1 from public.items i
    where i.id = item_id and public.is_org_member(i.owner_org_id)
  )
);

-- ---------------------------------------------------------------------------
-- item_media : photos are part of the public asset information.
-- ---------------------------------------------------------------------------
create policy item_media_select on public.item_media
for select to authenticated using (true);

create policy item_media_insert on public.item_media
for insert to authenticated
with check (
  exists (
    select 1 from public.items i
    where i.id = item_id and public.is_org_member(i.owner_org_id)
  )
);

create policy item_media_update on public.item_media
for update to authenticated
using (
  exists (
    select 1 from public.items i
    where i.id = item_id and public.is_org_member(i.owner_org_id)
  )
)
with check (
  exists (
    select 1 from public.items i
    where i.id = item_id and public.is_org_member(i.owner_org_id)
  )
);

create policy item_media_delete on public.item_media
for delete to authenticated
using (
  exists (
    select 1 from public.items i
    where i.id = item_id and public.is_org_member(i.owner_org_id)
  )
);

-- ---------------------------------------------------------------------------
-- needs / service_offers / service_wants
-- ---------------------------------------------------------------------------
create policy needs_select on public.needs
for select to authenticated using (true);

create policy needs_insert on public.needs
for insert to authenticated with check (public.is_org_member(org_id));

create policy needs_update on public.needs
for update to authenticated
using (public.is_org_member(org_id)) with check (public.is_org_member(org_id));

create policy needs_delete on public.needs
for delete to authenticated using (public.is_org_member(org_id));

create policy service_offers_select on public.service_offers
for select to authenticated using (true);

create policy service_offers_insert on public.service_offers
for insert to authenticated with check (public.is_org_member(org_id));

create policy service_offers_update on public.service_offers
for update to authenticated
using (public.is_org_member(org_id)) with check (public.is_org_member(org_id));

create policy service_offers_delete on public.service_offers
for delete to authenticated using (public.is_org_member(org_id));

create policy service_wants_select on public.service_wants
for select to authenticated using (true);

create policy service_wants_insert on public.service_wants
for insert to authenticated with check (public.is_org_member(org_id));

create policy service_wants_update on public.service_wants
for update to authenticated
using (public.is_org_member(org_id)) with check (public.is_org_member(org_id));

create policy service_wants_delete on public.service_wants
for delete to authenticated using (public.is_org_member(org_id));

-- ---------------------------------------------------------------------------
-- matches : only the two involved organizations can see a match.
-- Accept transitions go through public.accept_match().
-- ---------------------------------------------------------------------------
create policy matches_select on public.matches
for select to authenticated
using (public.is_org_member(donor_org_id) or public.is_org_member(recipient_org_id));

create policy matches_insert on public.matches
for insert to authenticated
with check (public.is_org_member(donor_org_id) or public.is_org_member(recipient_org_id));

create policy matches_update on public.matches
for update to authenticated
using (public.is_org_member(donor_org_id) or public.is_org_member(recipient_org_id))
with check (public.is_org_member(donor_org_id) or public.is_org_member(recipient_org_id));

-- ---------------------------------------------------------------------------
-- transfers : readable by both sides, created automatically by a trigger.
-- ---------------------------------------------------------------------------
create policy transfers_select on public.transfers
for select to authenticated
using (
  exists (
    select 1 from public.matches m
    where m.id = match_id
      and (public.is_org_member(m.donor_org_id) or public.is_org_member(m.recipient_org_id))
  )
);

create policy transfers_update on public.transfers
for update to authenticated
using (
  exists (
    select 1 from public.matches m
    where m.id = match_id
      and (public.is_org_member(m.donor_org_id) or public.is_org_member(m.recipient_org_id))
  )
)
with check (
  exists (
    select 1 from public.matches m
    where m.id = match_id
      and (public.is_org_member(m.donor_org_id) or public.is_org_member(m.recipient_org_id))
  )
);

-- ---------------------------------------------------------------------------
-- connector_jobs
-- ---------------------------------------------------------------------------
create policy connector_jobs_select on public.connector_jobs
for select to authenticated using (public.is_org_member(org_id));

create policy connector_jobs_insert on public.connector_jobs
for insert to authenticated with check (public.is_org_member(org_id));
