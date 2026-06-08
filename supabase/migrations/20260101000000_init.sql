-- Mealplan schema: recipes, meal scheduling, shopping trips, grocery lists.
-- Single shared household: every authenticated user can read/write everything.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table recipes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  instructions text,              -- markdown, ordered steps
  servings int not null default 2,
  prep_minutes int,
  cook_minutes int,
  source_url text,
  image_path text,                -- Supabase Storage path, nullable
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table ingredients (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,      -- canonical name, e.g. "chicken breast"
  category text,                  -- for grocery grouping: produce, dairy, meat, pantry, etc.
  default_unit text               -- g, ml, unit, tbsp, etc.
);

create table recipe_ingredients (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references recipes(id) on delete cascade,
  ingredient_id uuid not null references ingredients(id),
  quantity numeric not null,
  unit text not null,             -- the unit for this recipe line
  note text                       -- e.g. "finely chopped"
);

create type meal_slot as enum ('breakfast', 'lunch', 'dinner', 'snack');

create table scheduled_meals (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references recipes(id) on delete cascade,
  meal_date date not null,
  slot meal_slot not null,
  servings int not null default 2,  -- planned servings; scales ingredient quantities
  note text,
  created_at timestamptz not null default now()
);

create table shopping_trips (
  id uuid primary key default gen_random_uuid(),
  trip_at timestamptz not null,     -- chosen date + time of the shop
  is_recurring boolean not null default false,
  recurrence_rule text,             -- e.g. "WEEKLY:SAT" — simple custom format
  status text not null default 'planned', -- planned | done | skipped
  note text,
  created_at timestamptz not null default now()
);

-- Manual additions to a shop's list that aren't derived from recipes
create table grocery_extra_items (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid references shopping_trips(id) on delete cascade,
  label text not null,
  quantity numeric,
  unit text,
  category text,
  checked boolean not null default false
);

-- Tracks check-off state of derived (recipe-sourced) grocery lines per trip
create table grocery_checked (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references shopping_trips(id) on delete cascade,
  ingredient_id uuid not null references ingredients(id),
  unit text not null,
  checked boolean not null default false,
  unique (trip_id, ingredient_id, unit)
);

create table recipe_tags (
  recipe_id uuid references recipes(id) on delete cascade,
  tag text not null,
  primary key (recipe_id, tag)
);

-- Helpful indexes for the common query paths.
create index recipe_ingredients_recipe_id_idx on recipe_ingredients (recipe_id);
create index scheduled_meals_meal_date_idx on scheduled_meals (meal_date);
create index grocery_extra_items_trip_id_idx on grocery_extra_items (trip_id);
create index grocery_checked_trip_id_idx on grocery_checked (trip_id);
create index recipe_tags_tag_idx on recipe_tags (tag);

-- ---------------------------------------------------------------------------
-- updated_at trigger for recipes
-- ---------------------------------------------------------------------------

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger recipes_set_updated_at
  before update on recipes
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security: authenticated household members get full access.
-- ---------------------------------------------------------------------------

alter table recipes enable row level security;
alter table ingredients enable row level security;
alter table recipe_ingredients enable row level security;
alter table scheduled_meals enable row level security;
alter table shopping_trips enable row level security;
alter table grocery_extra_items enable row level security;
alter table grocery_checked enable row level security;
alter table recipe_tags enable row level security;

create policy "authd full access" on recipes
  for all to authenticated using (true) with check (true);
create policy "authd full access" on ingredients
  for all to authenticated using (true) with check (true);
create policy "authd full access" on recipe_ingredients
  for all to authenticated using (true) with check (true);
create policy "authd full access" on scheduled_meals
  for all to authenticated using (true) with check (true);
create policy "authd full access" on shopping_trips
  for all to authenticated using (true) with check (true);
create policy "authd full access" on grocery_extra_items
  for all to authenticated using (true) with check (true);
create policy "authd full access" on grocery_checked
  for all to authenticated using (true) with check (true);
create policy "authd full access" on recipe_tags
  for all to authenticated using (true) with check (true);

-- ---------------------------------------------------------------------------
-- Storage: recipe-images bucket. Public read (display), authd write/update/delete.
-- The bucket itself is created via supabase/config.toml.
-- ---------------------------------------------------------------------------

create policy "recipe images authd insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'recipe-images');

create policy "recipe images authd update" on storage.objects
  for update to authenticated
  using (bucket_id = 'recipe-images');

create policy "recipe images authd delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'recipe-images');
