# Build Spec — Self-Hosted Meal & Grocery Planner

## 1. Overview

A self-hosted web app for two people (a household) to manage recipes, plan weekly meals, auto-generate grocery lists, and schedule recurring grocery shops. Runs entirely on a mini PC on the local network. No external services beyond what is bundled.

**Working name:** `mealplan` (rename freely).

## 2. Goals & Non-Goals

**Goals**

- Store and manage recipes (ingredients, quantities, steps, tags).
- Plan meals on a weekly calendar (assign recipes to date + meal slot).
- Auto-generate a grocery list from planned meals, aggregating duplicate ingredients.
- Schedule grocery shops — both a recurring "regular shop" and ad-hoc trips with a chosen date/time. The grocery list scopes to the period a shop covers.
- Two-user shared access on the local network.

**Non-Goals (v1)**

- Nutrition tracking / calorie counting.
- Mobile native apps (responsive web is enough).
- Cross-unit conversion (e.g. grams ⇄ cups). See §6.3 simplification.
- Public internet exposure / multi-household tenancy.

## 3. Tech Stack

- **Framework:** Next.js (App Router, TypeScript).
- **Styling:** TailwindCSS. Use a small component layer (shadcn/ui optional but allowed).
- **Database / backend:** Local Supabase stack (Postgres, Auth, Storage, PostgREST) via the Supabase CLI (`supabase start`, Docker-based).
- **Data access:** `@supabase/supabase-js` from the Next.js app. Use Row Level Security; queries go through Supabase client (server components / route handlers using the service or anon key appropriately).
- **Auth:** Supabase Auth, email + password. Two pre-seeded accounts. No public sign-up.
- **State/data fetching:** React Server Components where possible; `@tanstack/react-query` for client-side mutations/caching where interactivity needs it.

## 4. Architecture & Deployment

- Everything runs on the mini PC. Two processes: the Supabase stack (Docker) and the Next.js app.
- Provide a `docker-compose.yml` that runs the Next.js app as a container, plus a `Makefile` (or npm scripts) so the full stack comes up with one command. Supabase is managed by its CLI (`supabase start`) — document running it alongside, or document wrapping it in compose.
- App binds to `0.0.0.0` so both users can reach it from other devices on the LAN (e.g. `http://<minipc-ip>:3000`).
- All secrets/keys in `.env.local`; provide `.env.example`.
- Data persistence: Supabase's Docker volumes. Document a simple `pg_dump` backup script in the README.

## 5. Data Model

Postgres schema (Supabase migrations under `supabase/migrations`). Use `uuid` PKs (`gen_random_uuid()`), `timestamptz` timestamps, and enable RLS on all tables.

```sql
-- Authenticated household members share all data. RLS: any authenticated user can read/write.

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
  recurrence_rule text,             -- e.g. "WEEKLY:SAT" — simple custom format, see §6.4
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
```

RLS policy pattern for shared household data:

```sql
alter table recipes enable row level security;
create policy "authd full access" on recipes
  for all to authenticated using (true) with check (true);
-- repeat equivalent policy for every table
```

## 6. Feature Specifications

### 6.1 Recipes

- List view: searchable/filterable by name and tag, with thumbnail.
- Detail view: ingredients (qty + unit + note), instructions, servings, prep/cook time, tags, source link.
- Create/edit form: add ingredient rows (autocomplete against `ingredients`, create new ingredient inline if not found). Optional image upload to Supabase Storage.
- Delete with confirm.

### 6.2 Meal Scheduling

- Weekly calendar view (Mon–Sun), with rows for each `meal_slot` and a column per day.
- Assign a recipe to a (date, slot) cell — picker/search modal. Set planned servings (default from recipe).
- Drag-to-move or simple edit is acceptable; basic edit/remove is the minimum.
- Navigate between weeks. "This week" shortcut.

### 6.3 Grocery List Generation

- For a given shopping trip, compute the list from all `scheduled_meals` whose `meal_date` falls in the trip's coverage window (see §6.4).
- For each meal, scale each `recipe_ingredient.quantity` by `scheduled_meals.servings / recipes.servings`.
- Aggregate across all meals by `(ingredient_id, unit)` — sum quantities.
- **Simplification:** do NOT convert between units. If the same ingredient appears in two different units across recipes, show two separate lines. Note this in the UI subtly.
- Group the displayed list by ingredient `category`.
- Merge in `grocery_extra_items` for the trip.
- Each line has a check-off toggle (persist to `grocery_checked` for derived lines, `grocery_extra_items.checked` for manual). Checked state is per-trip.
- Allow adding manual extra items to the trip's list.

### 6.4 Shopping Trips / Regular Shop

- A "Shops" view listing upcoming and past trips.
- Create a trip with a chosen date + time (`trip_at`).
- A trip can be marked recurring with a simple rule: weekly on a chosen weekday (store as `WEEKLY:<3-letter-day>`, e.g. `WEEKLY:SAT`). On marking a recurring trip `done`, auto-create the next occurrence one week later (keep logic simple; full RRULE is out of scope).
- **Coverage window:** a trip covers meals from the day after the previous trip's date up to and including this trip's date. (Rationale: you shop, then that food covers you until the next shop.) For the first/earliest trip, the window starts from today. Implement this window calculation in a shared helper and unit-test it.
- Trip detail page = the grocery list for that trip (§6.3) plus status controls (planned/done/skipped).

## 7. Routes / Pages (App Router)

- `/login` — Supabase Auth email/password.
- `/` — dashboard: this week's plan summary + next shop + quick links.
- `/recipes` — list. `/recipes/new`, `/recipes/[id]`, `/recipes/[id]/edit`.
- `/plan` — weekly meal calendar.
- `/shops` — trips list. `/shops/new`, `/shops/[id]` (grocery list + status).
- Protect all routes except `/login` via middleware checking the Supabase session.

## 8. UI / UX

- Clean, responsive, works on phone and desktop (you'll use it in the kitchen and shop). Tailwind, mobile-first.
- Persistent nav: Dashboard, Recipes, Plan, Shops.
- Grocery list optimised for phone use: big tappable check rows, grouped by aisle/category, sticky category headers.
- Light/dark mode optional, not required.

## 9. Setup & Local Dev

Provide and document:

- `npm install`, `supabase start`, `supabase db reset` (applies migrations + seed).
- `supabase/seed.sql`: two auth users (or document creating them via CLI), a handful of common `ingredients` with categories, and 2–3 sample recipes so the app isn't empty.
- `.env.example` with `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and any server-side key.
- `README.md`: full run-from-scratch instructions on a fresh mini PC, how to reach the app over LAN, and a `pg_dump` backup snippet.

## 10. Build Phases (do in order, working app at each step)

1. **Scaffold:** Next.js + TS + Tailwind, Supabase local init, env wiring, base layout + nav.
2. **Auth:** login page, route protection middleware, seeded users.
3. **Schema + migrations + seed:** all tables, RLS, seed data.
4. **Recipes:** full CRUD with ingredient autocomplete + image upload.
5. **Meal plan:** weekly calendar, assign/edit/remove meals.
6. **Shops:** trips CRUD, recurrence, coverage-window helper (with tests).
7. **Grocery list:** generation/aggregation/scaling, category grouping, check-off, manual extras.
8. **Dashboard + polish:** summary widgets, responsive pass, README + backup script.

## 11. Acceptance Criteria

- Two seeded users can log in; unauthenticated users are redirected to `/login`.
- A recipe with N servings, scheduled at M servings, contributes ingredient quantities scaled by M/N to the grocery list.
- Two recipes sharing an ingredient in the same unit produce one summed grocery line; different units produce separate lines.
- Creating a trip dated next Saturday generates a grocery list covering exactly the meals planned in its coverage window.
- Marking a recurring trip `done` creates the next weekly occurrence.
- Check-off state persists per trip across reloads.
- App is reachable from a second device on the LAN.

## 12. Assumptions (override if wrong)

- Single shared household; both users see/edit everything (no per-user private data).
- No public internet exposure; LAN-only, so auth is light-touch but present.
- Quantities are entered consistently enough that same-unit aggregation is useful; cross-unit conversion deferred.
- Recurrence only needs simple weekly-on-a-weekday for v1.
