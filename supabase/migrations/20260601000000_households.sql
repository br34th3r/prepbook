-- Multi-tenant households: turns the single shared household into a SaaS where
-- users sign up, create households (becoming owner), and join others via an
-- invite code with owner approval.
--
-- Security model:
--   * RLS is MEMBERSHIP-based: a user may touch data for any household they
--     belong to. The "active household" filter lives in the app layer.
--   * Privileged writes (creating a household + owner row, approving a request)
--     go through SECURITY DEFINER functions so they can bypass RLS safely.

-- ---------------------------------------------------------------------------
-- Tenancy tables
-- ---------------------------------------------------------------------------

create table households (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  invite_code text not null unique,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table household_members (
  household_id uuid not null references households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  -- Display snapshot so members can be listed without reading auth.users.
  email text,
  display_name text,
  joined_at timestamptz not null default now(),
  primary key (household_id, user_id)
);

create index household_members_user_id_idx on household_members (user_id);

create table household_join_requests (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  -- Snapshot of the requester so the owner can see who is asking to join.
  requester_email text,
  requester_name text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  decided_by uuid references auth.users(id)
);

-- At most one outstanding (pending) request per user per household.
create unique index household_join_requests_one_pending
  on household_join_requests (household_id, user_id)
  where status = 'pending';

create index household_join_requests_household_idx
  on household_join_requests (household_id);

-- ---------------------------------------------------------------------------
-- Add household_id to the top-level data tables. Tables are empty at migration
-- time (seed runs afterwards), so NOT NULL with no default is safe.
-- Child tables (recipe_ingredients, recipe_tags, grocery_*) scope via parent.
-- ---------------------------------------------------------------------------

alter table recipes
  add column household_id uuid not null references households(id) on delete cascade;
alter table scheduled_meals
  add column household_id uuid not null references households(id) on delete cascade;
alter table shopping_trips
  add column household_id uuid not null references households(id) on delete cascade;
alter table ingredients
  add column household_id uuid not null references households(id) on delete cascade;

create index recipes_household_id_idx on recipes (household_id);
create index scheduled_meals_household_id_idx on scheduled_meals (household_id);
create index shopping_trips_household_id_idx on shopping_trips (household_id);
create index ingredients_household_id_idx on ingredients (household_id);

-- Canonical ingredient names are now per-household, not global.
alter table ingredients drop constraint ingredients_name_key;
alter table ingredients add constraint ingredients_household_name_key
  unique (household_id, name);

-- ---------------------------------------------------------------------------
-- Membership helpers. SECURITY DEFINER so policies on data tables can check
-- membership without recursing into household_members' own RLS.
-- ---------------------------------------------------------------------------

create or replace function is_household_member(hid uuid)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1 from public.household_members
    where household_id = hid and user_id = auth.uid()
  );
$$;

create or replace function is_household_owner(hid uuid)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1 from public.household_members
    where household_id = hid and user_id = auth.uid() and role = 'owner'
  );
$$;

-- ---------------------------------------------------------------------------
-- RLS on the tenancy tables
-- ---------------------------------------------------------------------------

alter table households enable row level security;
alter table household_members enable row level security;
alter table household_join_requests enable row level security;

-- Households: members can see theirs; anyone can create one they own; owners edit.
create policy "members read household" on households
  for select to authenticated using (is_household_member(id));
create policy "create own household" on households
  for insert to authenticated with check (created_by = auth.uid());
create policy "owner updates household" on households
  for update to authenticated using (is_household_owner(id)) with check (is_household_owner(id));

-- Members: anyone in the household can see the roster; owners remove members and
-- members can remove themselves. Inserts happen only via SECURITY DEFINER RPCs.
create policy "members read roster" on household_members
  for select to authenticated using (is_household_member(household_id));
create policy "owner or self removes member" on household_members
  for delete to authenticated
  using (is_household_owner(household_id) or user_id = auth.uid());

-- Join requests: a user creates/reads their own; owners read + decide on theirs.
create policy "create own join request" on household_join_requests
  for insert to authenticated with check (user_id = auth.uid());
create policy "read own or owned join requests" on household_join_requests
  for select to authenticated
  using (user_id = auth.uid() or is_household_owner(household_id));
create policy "owner decides join request" on household_join_requests
  for update to authenticated
  using (is_household_owner(household_id)) with check (is_household_owner(household_id));

-- ---------------------------------------------------------------------------
-- Replace the blanket "authd full access" policies with membership scoping.
-- ---------------------------------------------------------------------------

drop policy "authd full access" on recipes;
drop policy "authd full access" on ingredients;
drop policy "authd full access" on recipe_ingredients;
drop policy "authd full access" on scheduled_meals;
drop policy "authd full access" on shopping_trips;
drop policy "authd full access" on grocery_extra_items;
drop policy "authd full access" on grocery_checked;
drop policy "authd full access" on recipe_tags;

-- Top-level tables: scope directly by household_id.
create policy "household access" on recipes
  for all to authenticated
  using (is_household_member(household_id)) with check (is_household_member(household_id));
create policy "household access" on ingredients
  for all to authenticated
  using (is_household_member(household_id)) with check (is_household_member(household_id));
create policy "household access" on scheduled_meals
  for all to authenticated
  using (is_household_member(household_id)) with check (is_household_member(household_id));
create policy "household access" on shopping_trips
  for all to authenticated
  using (is_household_member(household_id)) with check (is_household_member(household_id));

-- Child tables: scope through the parent row's household.
create policy "household access" on recipe_ingredients
  for all to authenticated
  using (is_household_member((select household_id from recipes where id = recipe_id)))
  with check (is_household_member((select household_id from recipes where id = recipe_id)));
create policy "household access" on recipe_tags
  for all to authenticated
  using (is_household_member((select household_id from recipes where id = recipe_id)))
  with check (is_household_member((select household_id from recipes where id = recipe_id)));
create policy "household access" on grocery_extra_items
  for all to authenticated
  using (is_household_member((select household_id from shopping_trips where id = trip_id)))
  with check (is_household_member((select household_id from shopping_trips where id = trip_id)));
create policy "household access" on grocery_checked
  for all to authenticated
  using (is_household_member((select household_id from shopping_trips where id = trip_id)))
  with check (is_household_member((select household_id from shopping_trips where id = trip_id)));

-- ---------------------------------------------------------------------------
-- Storage: scope recipe-images by a `<household_id>/...` object path prefix.
-- ---------------------------------------------------------------------------

drop policy "recipe images authd insert" on storage.objects;
drop policy "recipe images authd update" on storage.objects;
drop policy "recipe images authd delete" on storage.objects;

create policy "recipe images household insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'recipe-images'
    and is_household_member(((storage.foldername(name))[1])::uuid)
  );
create policy "recipe images household update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'recipe-images'
    and is_household_member(((storage.foldername(name))[1])::uuid)
  );
create policy "recipe images household delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'recipe-images'
    and is_household_member(((storage.foldername(name))[1])::uuid)
  );

-- ---------------------------------------------------------------------------
-- Privileged flows (SECURITY DEFINER): create household, request/approve/reject.
-- ---------------------------------------------------------------------------

-- Create a household, generate a unique invite code, add the caller as owner.
create or replace function create_household(p_name text)
returns households
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_code text;
  v_household public.households;
  v_email text;
  v_name text;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;
  if coalesce(trim(p_name), '') = '' then
    raise exception 'household name is required';
  end if;

  select email, raw_user_meta_data->>'name' into v_email, v_name
  from auth.users where id = v_uid;

  -- Generate a short, readable, unique code (retry on the rare collision).
  -- pgcrypto lives in the `extensions` schema; qualify it since this function
  -- runs with an empty search_path.
  loop
    v_code := upper(substring(encode(extensions.gen_random_bytes(6), 'hex') from 1 for 8));
    exit when not exists (select 1 from public.households where invite_code = v_code);
  end loop;

  insert into public.households (name, invite_code, created_by)
  values (trim(p_name), v_code, v_uid)
  returning * into v_household;

  insert into public.household_members (household_id, user_id, role, email, display_name)
  values (v_household.id, v_uid, 'owner', v_email, v_name);

  return v_household;
end;
$$;

-- Request to join a household by invite code. Idempotent on a pending request.
create or replace function request_to_join(p_code text)
returns household_join_requests
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_household_id uuid;
  v_request public.household_join_requests;
  v_email text;
  v_name text;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  select id into v_household_id from public.households
  where invite_code = upper(trim(p_code));
  if v_household_id is null then
    raise exception 'invalid invite code';
  end if;

  if exists (
    select 1 from public.household_members
    where household_id = v_household_id and user_id = v_uid
  ) then
    raise exception 'already a member of this household';
  end if;

  -- Reuse an existing pending request if there is one.
  select * into v_request from public.household_join_requests
  where household_id = v_household_id and user_id = v_uid and status = 'pending';
  if found then
    return v_request;
  end if;

  select email, raw_user_meta_data->>'name' into v_email, v_name
  from auth.users where id = v_uid;

  insert into public.household_join_requests
    (household_id, user_id, requester_email, requester_name)
  values (v_household_id, v_uid, v_email, v_name)
  returning * into v_request;

  return v_request;
end;
$$;

-- Owner approves a pending request: mark approved and add the membership.
create or replace function approve_join_request(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_req public.household_join_requests;
begin
  select * into v_req from public.household_join_requests where id = p_request_id;
  if not found then
    raise exception 'request not found';
  end if;
  if not public.is_household_owner(v_req.household_id) then
    raise exception 'only the household owner can approve requests';
  end if;
  if v_req.status <> 'pending' then
    raise exception 'request is not pending';
  end if;

  update public.household_join_requests
  set status = 'approved', decided_at = now(), decided_by = v_uid
  where id = p_request_id;

  insert into public.household_members
    (household_id, user_id, role, email, display_name)
  values (v_req.household_id, v_req.user_id, 'member',
          v_req.requester_email, v_req.requester_name)
  on conflict (household_id, user_id) do nothing;
end;
$$;

-- Owner rejects a pending request.
create or replace function reject_join_request(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_req public.household_join_requests;
begin
  select * into v_req from public.household_join_requests where id = p_request_id;
  if not found then
    raise exception 'request not found';
  end if;
  if not public.is_household_owner(v_req.household_id) then
    raise exception 'only the household owner can reject requests';
  end if;

  update public.household_join_requests
  set status = 'rejected', decided_at = now(), decided_by = v_uid
  where id = p_request_id;
end;
$$;
