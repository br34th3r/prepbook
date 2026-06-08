# Prepbook

A self-hosted meal & grocery planner for a two-person household. Manage
recipes, plan meals on a weekly calendar, auto-generate grocery lists from
your plan, and schedule recurring grocery shops. Runs entirely on your LAN —
no external services.

Built with Next.js (App Router) + TailwindCSS + a local Supabase stack
(Postgres, Auth, Storage).

---

## Features

- **Recipes** — ingredients, steps, servings, prep/cook time, tags, source
  link and an optional photo. Ingredient autocomplete with inline creation.
- **Meal plan** — weekly Mon–Sun calendar; assign recipes to a day + meal slot
  with planned servings; navigate weeks.
- **Shops** — schedule grocery trips, including a recurring weekly shop. Each
  trip has a coverage window and its own grocery list.
- **Grocery lists** — auto-generated from planned meals in a trip's window,
  scaled by servings and aggregated per ingredient + unit, grouped by aisle,
  with big tappable check-offs and manual extra items.

---

## Prerequisites

On the mini PC (or any machine):

- [Docker](https://docs.docker.com/get-docker/) (Supabase runs in Docker)
- [Node.js](https://nodejs.org) 20+ and [pnpm](https://pnpm.io) (`corepack enable`)
- [Supabase CLI](https://supabase.com/docs/guides/cli) (`brew install supabase/tap/supabase`
  or see the docs)

---

## Run from scratch

```bash
# 1. Install dependencies
pnpm install            # or: make install

# 2. Start the local Supabase stack (Postgres + Auth + Storage, in Docker)
supabase start          # or: make supabase

# 3. Apply the schema + seed data (tables, RLS, sample recipes, two users)
supabase db reset       # or: make db

# 4. Configure environment
cp .env.example .env.local
#    Then paste the keys printed by `supabase start` into .env.local:
#      NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
#      NEXT_PUBLIC_SUPABASE_ANON_KEY=<Publishable key>
#      SUPABASE_SERVICE_ROLE_KEY=<Secret key>
#    (Re-print them any time with `supabase status`.)

# 5. Run the app
pnpm dev                # or: make dev
```

Open <http://localhost:3000>.

### Accounts & households

Sign-up is public. Visit `/signup` to create an account, then either:

- **Create a household** — you become its owner and get an **invite code** to
  share (see it under **Household** in the nav).
- **Join with a code** — enter someone's invite code. This sends a request the
  household **owner must approve** before you get access.

A user can belong to several households and switch the active one from the nav.
All members of a household share its recipes, plans and grocery lists.

> Public sign-up is enabled via `enable_signup = true` in `supabase/config.toml`.
> Email confirmation is off for local dev (`enable_confirmations = false`).

**Demo data:** `supabase db reset` seeds one household, _The Demo House_
(invite code `DEMO1234`), with two accounts — **change these before real use**:

| Email              | Password      | Role   |
| ------------------ | ------------- | ------ |
| `alice@home.local` | `password123` | owner  |
| `bob@home.local`   | `password123` | member |

---

## Reaching it from another device on the LAN

The dev server already binds to all interfaces. From a phone or laptop on the
same network, browse to `http://<minipc-ip>:3000` (find the IP with
`ipconfig getifaddr en0` on macOS or `hostname -I` on Linux).

Because the browser talks directly to Supabase too, set
`NEXT_PUBLIC_SUPABASE_URL` to the mini PC's LAN IP (not `127.0.0.1`) so other
devices can reach the API:

```bash
# .env.local — use the mini PC's actual IP
NEXT_PUBLIC_SUPABASE_URL=http://192.168.1.50:54321
```

Supabase's local API allows this origin by default for development.

---

## Production-ish: run the app in Docker

Supabase stays under the CLI; the Next.js app runs as a container.

```bash
# In .env.local set HOST_IP to the mini PC's LAN IP, plus the Supabase keys.
export HOST_IP=192.168.1.50
export $(grep -v '^#' .env.local | xargs)   # load keys into the shell

supabase start
docker compose up --build -d                 # or: make up
```

The app is served on port 3000 and reachable at `http://<minipc-ip>:3000`.
Public env vars (`NEXT_PUBLIC_*`) are baked in at build time, so rebuild the
image if you change the host/IP.

---

## Backups

Supabase persists data in its own Docker volumes. To snapshot the database:

```bash
./scripts/backup.sh      # or: make backup
# writes backups/mealplan-<timestamp>.sql.gz
```

Under the hood it runs `pg_dump` inside the Supabase database container:

```bash
docker exec supabase_db_prepbook pg_dump -U postgres -d postgres \
  | gzip > backup.sql.gz
```

Restore with:

```bash
gunzip -c backup.sql.gz \
  | docker exec -i supabase_db_prepbook psql -U postgres -d postgres
```

---

## Development

```bash
pnpm dev          # dev server (Turbopack)
pnpm test         # unit tests (coverage-window + grocery aggregation)
pnpm build        # production build
pnpm lint         # eslint
supabase db reset # re-apply migrations + seed
```

### Project layout

```
app/                 App Router routes
  login/             Auth (email + password)
  (app)/             Authenticated shell (nav + auth guard)
    page.tsx         Dashboard
    recipes/         Recipe CRUD
    plan/            Weekly meal calendar
    shops/           Trips + grocery lists
components/          Client components (forms, board, lists, nav)
lib/                 Domain logic + Supabase clients
  coverage.ts        Trip coverage-window math (unit-tested)
  grocery.ts         Scaling + aggregation (unit-tested)
  dates.ts           Timezone-free date helpers
  supabase/          Server/browser clients + proxy session refresh
proxy.ts             Route protection (Next.js 16 renamed middleware → proxy)
supabase/
  migrations/        Schema + RLS
  seed.sql           Users, ingredients, sample recipes
```

---

## Notes & simplifications

- **No unit conversion.** If the same ingredient appears in two units across
  recipes, the grocery list shows two lines (flagged in the UI).
- **Recurrence** is weekly-on-a-weekday only; marking a recurring shop _done_
  creates next week's shop.
- **Coverage window**: a shop covers meals from the day after the previous
  shop's date through the shop's own date; the earliest shop starts from today.
- LAN-only; auth is light-touch but enforced on every route via `proxy.ts` and
  re-checked in the authenticated layout.
