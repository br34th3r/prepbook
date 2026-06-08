-- Seed data for local development.
-- Applied by `supabase db reset`.
--
-- Sign-up is now public (visit /signup). These two demo accounts share one
-- pre-made household ("The Demo House") so the app isn't empty on first run:
--   alice@home.local / password123  (owner)
--   bob@home.local   / password123  (member)
-- Invite code for the demo household: DEMO1234
-- Change these before exposing anything beyond your LAN.

-- ---------------------------------------------------------------------------
-- Auth users
-- ---------------------------------------------------------------------------

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data,
  confirmation_token, recovery_token, email_change_token_new, email_change
)
values
  (
    '00000000-0000-0000-0000-000000000000',
    'a0000000-0000-0000-0000-000000000001',
    'authenticated', 'authenticated', 'alice@home.local',
    crypt('password123', gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}', '{"name":"Alice"}',
    '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'a0000000-0000-0000-0000-000000000002',
    'authenticated', 'authenticated', 'bob@home.local',
    crypt('password123', gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}', '{"name":"Bob"}',
    '', '', '', ''
  );

insert into auth.identities (
  id, provider_id, user_id, identity_data, provider,
  last_sign_in_at, created_at, updated_at
)
values
  (
    gen_random_uuid(),
    'a0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000001',
    '{"sub":"a0000000-0000-0000-0000-000000000001","email":"alice@home.local","email_verified":true,"phone_verified":false}',
    'email', now(), now(), now()
  ),
  (
    gen_random_uuid(),
    'a0000000-0000-0000-0000-000000000002',
    'a0000000-0000-0000-0000-000000000002',
    '{"sub":"a0000000-0000-0000-0000-000000000002","email":"bob@home.local","email_verified":true,"phone_verified":false}',
    'email', now(), now(), now()
  );

-- ---------------------------------------------------------------------------
-- Demo household + memberships
-- ---------------------------------------------------------------------------

insert into households (id, name, invite_code, created_by) values
  (
    '33333333-0000-0000-0000-000000000001',
    'The Demo House',
    'DEMO1234',
    'a0000000-0000-0000-0000-000000000001'
  );

insert into household_members (household_id, user_id, role, email, display_name) values
  ('33333333-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'owner',  'alice@home.local', 'Alice'),
  ('33333333-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002', 'member', 'bob@home.local',   'Bob');

-- ---------------------------------------------------------------------------
-- Ingredients (canonical names + grocery categories), scoped to the household
-- ---------------------------------------------------------------------------

insert into ingredients (id, household_id, name, category, default_unit)
select v.id, '33333333-0000-0000-0000-000000000001'::uuid, v.name, v.category, v.unit
from (values
  ('11111111-0000-0000-0000-000000000001'::uuid, 'chicken breast', 'meat',    'g'),
  ('11111111-0000-0000-0000-000000000002'::uuid, 'olive oil',      'pantry',  'tbsp'),
  ('11111111-0000-0000-0000-000000000003'::uuid, 'garlic',         'produce', 'clove'),
  ('11111111-0000-0000-0000-000000000004'::uuid, 'onion',          'produce', 'unit'),
  ('11111111-0000-0000-0000-000000000005'::uuid, 'spaghetti',      'pantry',  'g'),
  ('11111111-0000-0000-0000-000000000006'::uuid, 'canned tomatoes','pantry',  'g'),
  ('11111111-0000-0000-0000-000000000007'::uuid, 'parmesan',       'dairy',   'g'),
  ('11111111-0000-0000-0000-000000000008'::uuid, 'egg',            'dairy',   'unit'),
  ('11111111-0000-0000-0000-000000000009'::uuid, 'bacon',          'meat',    'g'),
  ('11111111-0000-0000-0000-00000000000a'::uuid, 'milk',           'dairy',   'ml'),
  ('11111111-0000-0000-0000-00000000000b'::uuid, 'flour',          'pantry',  'g'),
  ('11111111-0000-0000-0000-00000000000c'::uuid, 'butter',         'dairy',   'g'),
  ('11111111-0000-0000-0000-00000000000d'::uuid, 'bell pepper',    'produce', 'unit'),
  ('11111111-0000-0000-0000-00000000000e'::uuid, 'rice',           'pantry',  'g'),
  ('11111111-0000-0000-0000-00000000000f'::uuid, 'soy sauce',      'pantry',  'tbsp'),
  ('11111111-0000-0000-0000-000000000010'::uuid, 'salt',           'pantry',  'tsp'),
  ('11111111-0000-0000-0000-000000000011'::uuid, 'black pepper',   'pantry',  'tsp'),
  ('11111111-0000-0000-0000-000000000012'::uuid, 'basil',          'produce', 'g')
) as v(id, name, category, unit);

-- ---------------------------------------------------------------------------
-- Sample recipes
-- ---------------------------------------------------------------------------

insert into recipes (id, household_id, name, description, instructions, servings, prep_minutes, cook_minutes, source_url, created_by)
values
  (
    '22222222-0000-0000-0000-000000000001',
    '33333333-0000-0000-0000-000000000001',
    'Spaghetti al Pomodoro',
    'A simple weeknight tomato pasta.',
    E'1. Boil the spaghetti in salted water.\n2. Gently fry garlic in olive oil.\n3. Add canned tomatoes and simmer 15 min.\n4. Toss pasta with sauce, basil and parmesan.',
    2, 10, 20, 'https://example.com/pomodoro',
    'a0000000-0000-0000-0000-000000000001'
  ),
  (
    '22222222-0000-0000-0000-000000000002',
    '33333333-0000-0000-0000-000000000001',
    'Spaghetti Carbonara',
    'Classic Roman pasta with egg, bacon and parmesan.',
    E'1. Boil the spaghetti.\n2. Fry the bacon until crisp.\n3. Whisk eggs with parmesan.\n4. Combine off the heat so the egg thickens but does not scramble.',
    2, 10, 15, 'https://example.com/carbonara',
    'a0000000-0000-0000-0000-000000000001'
  ),
  (
    '22222222-0000-0000-0000-000000000003',
    '33333333-0000-0000-0000-000000000001',
    'Chicken Fried Rice',
    'Quick fried rice with chicken and vegetables.',
    E'1. Cook rice and let it cool.\n2. Brown the chicken in oil.\n3. Add pepper and onion, then rice.\n4. Stir through soy sauce and a scrambled egg.',
    2, 15, 15, null,
    'a0000000-0000-0000-0000-000000000002'
  );

insert into recipe_ingredients (recipe_id, ingredient_id, quantity, unit, note) values
  -- Pomodoro
  ('22222222-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000005', 200, 'g',     null),
  ('22222222-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000002', 2,   'tbsp',  null),
  ('22222222-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000003', 2,   'clove', 'sliced'),
  ('22222222-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000006', 400, 'g',     null),
  ('22222222-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000007', 30,  'g',     'grated'),
  ('22222222-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000012', 10,  'g',     'torn'),
  -- Carbonara
  ('22222222-0000-0000-0000-000000000002', '11111111-0000-0000-0000-000000000005', 200, 'g',     null),
  ('22222222-0000-0000-0000-000000000002', '11111111-0000-0000-0000-000000000009', 120, 'g',     'diced'),
  ('22222222-0000-0000-0000-000000000002', '11111111-0000-0000-0000-000000000008', 2,   'unit',  null),
  ('22222222-0000-0000-0000-000000000002', '11111111-0000-0000-0000-000000000007', 40,  'g',     'grated'),
  -- Chicken Fried Rice
  ('22222222-0000-0000-0000-000000000003', '11111111-0000-0000-0000-00000000000e', 200, 'g',     null),
  ('22222222-0000-0000-0000-000000000003', '11111111-0000-0000-0000-000000000001', 250, 'g',     'diced'),
  ('22222222-0000-0000-0000-000000000003', '11111111-0000-0000-0000-00000000000d', 1,   'unit',  'sliced'),
  ('22222222-0000-0000-0000-000000000003', '11111111-0000-0000-0000-000000000004', 1,   'unit',  'diced'),
  ('22222222-0000-0000-0000-000000000003', '11111111-0000-0000-0000-000000000008', 1,   'unit',  null),
  ('22222222-0000-0000-0000-000000000003', '11111111-0000-0000-0000-00000000000f', 2,   'tbsp',  null);

insert into recipe_tags (recipe_id, tag) values
  ('22222222-0000-0000-0000-000000000001', 'pasta'),
  ('22222222-0000-0000-0000-000000000001', 'vegetarian'),
  ('22222222-0000-0000-0000-000000000001', 'quick'),
  ('22222222-0000-0000-0000-000000000002', 'pasta'),
  ('22222222-0000-0000-0000-000000000002', 'quick'),
  ('22222222-0000-0000-0000-000000000003', 'rice'),
  ('22222222-0000-0000-0000-000000000003', 'quick');
