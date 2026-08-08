-- RHAYZKICKS — Storefront content migration
-- Run this once in the Supabase SQL editor, in one pass, against a project that
-- already has schema.sql + policies.sql applied (which already include
-- everything through 005_staff_time_tracking.sql). schema.sql/policies.sql
-- have already been updated in the repo to show the full current picture —
-- this file is what you paste in for an existing project instead of
-- re-running those from scratch.
--
-- What this does:
--   1. Opens public (anonymous) read access to active items/item_variants/
--      inventory. Until now those tables were staff-only (see policies.sql) —
--      fine for a POS tool, but the public storefront needs to read the
--      catalog without a staff login. Write access is untouched: still
--      staff-only via is_active_staff()/is_admin().
--   2. Adds a manual sort_order to items, for admin-controlled display order.
--   3. Adds four new admin-managed content tables — nav_categories,
--      announcements, hero_slides, collections — that back the storefront's
--      navigation, announcement bar, homepage hero carousel, and featured/
--      collections tiles. Previously these were hardcoded in
--      web/src/data/homeMock.ts and web/src/data/catalog.ts.
--   4. Seeds all of the above with the same content that was previously
--      hardcoded, so the storefront looks identical the moment this runs —
--      everything is then editable from the admin CMS.

-- ---------------------------------------------------------------------------
-- 1. Public read access to the catalog
-- ---------------------------------------------------------------------------

create policy items_select_public on items for select using (is_active = true);
create policy item_variants_select_public on item_variants for select using (is_active = true);
create policy inventory_select_public on inventory for select using (true);

-- ---------------------------------------------------------------------------
-- 2. Admin-controlled product display order
-- ---------------------------------------------------------------------------

alter table items add column sort_order integer not null default 0;

-- ---------------------------------------------------------------------------
-- 3. nav_categories — storefront navigation + "Shop by Activity" cards.
-- slug doubles as the items.category value it filters to on /category/:slug,
-- except the reserved slug 'new-releases', which is special-cased in the app
-- to mean "items created in the last 30 days" rather than a category match.
-- ---------------------------------------------------------------------------

create table nav_categories (
  id           uuid primary key default gen_random_uuid(),
  slug         text not null unique,
  label        text not null,
  image_url    text not null default '',
  sort_order   integer not null default 0,
  is_visible   boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create trigger nav_categories_set_updated_at
  before update on nav_categories
  for each row execute function set_updated_at();

alter table nav_categories enable row level security;

create policy nav_categories_select_public on nav_categories for select using (true);
create policy nav_categories_insert_staff on nav_categories for insert with check (is_active_staff());
create policy nav_categories_update_staff on nav_categories for update using (is_active_staff());
create policy nav_categories_delete_admin on nav_categories for delete using (is_admin());

insert into nav_categories (slug, label, sort_order) values
  ('new-releases', 'New Releases', 1),
  ('lifestyle', 'Lifestyle', 2),
  ('running', 'Running', 3),
  ('basketball', 'Basketball', 4),
  ('training', 'Training', 5),
  ('limited', 'Limited', 6),
  ('apparel', 'Apparel', 7),
  ('accessories', 'Accessories', 8);

-- ---------------------------------------------------------------------------
-- 4. announcements — rotating messages in the top announcement bar.
-- ---------------------------------------------------------------------------

create table announcements (
  id           uuid primary key default gen_random_uuid(),
  message      text not null,
  sort_order   integer not null default 0,
  is_active    boolean not null default true,
  created_at   timestamptz not null default now()
);

alter table announcements enable row level security;

create policy announcements_select_public on announcements for select using (is_active = true);
create policy announcements_select_staff on announcements for select using (is_active_staff());
create policy announcements_insert_staff on announcements for insert with check (is_active_staff());
create policy announcements_update_staff on announcements for update using (is_active_staff());
create policy announcements_delete_admin on announcements for delete using (is_admin());

insert into announcements (message, sort_order) values
  ('New Members Enjoy 15% Off On The Rhayz Kicks App. Join Free Today →', 1),
  ('Free Standard Delivery & 30-Day Free Returns on All Orders →', 2),
  ('Exclusive Early Access For Members. Sign Up & Shop First →', 3);

-- ---------------------------------------------------------------------------
-- 5. hero_slides — homepage hero carousel.
-- ---------------------------------------------------------------------------

create table hero_slides (
  id                    uuid primary key default gen_random_uuid(),
  eyebrow               text not null default '',
  headline              text not null,
  subtext               text not null default '',
  image_url             text not null default '',
  primary_cta_label     text not null default '',
  primary_cta_link      text not null default '/collections',
  secondary_cta_label   text,
  secondary_cta_link    text,
  sort_order            integer not null default 0,
  is_active             boolean not null default true,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create trigger hero_slides_set_updated_at
  before update on hero_slides
  for each row execute function set_updated_at();

alter table hero_slides enable row level security;

create policy hero_slides_select_public on hero_slides for select using (is_active = true);
create policy hero_slides_select_staff on hero_slides for select using (is_active_staff());
create policy hero_slides_insert_staff on hero_slides for insert with check (is_active_staff());
create policy hero_slides_update_staff on hero_slides for update using (is_active_staff());
create policy hero_slides_delete_admin on hero_slides for delete using (is_admin());

insert into hero_slides (eyebrow, headline, subtext, image_url, primary_cta_label, primary_cta_link, secondary_cta_label, secondary_cta_link, sort_order) values
  ('New Drop', 'Own The Streets', 'Exclusive seasonal releases. Member access only.', '/street.png', 'Shop Now', '/collections', 'Explore Collection', '/collections', 1),
  ('Step Boldly', 'Built For Every Move', 'Performance engineered for the relentless.', '/everymove.png', 'Shop Footwear', '/category/running', null, null, 2),
  ('Limited Edition', 'Dominate In Style', 'The latest drops from our signature series.', '/dominate.png', 'View Collection', '/collections', 'Notify Me', '/collections', 3);

-- ---------------------------------------------------------------------------
-- 6. collections — homepage "Featured Collections" tiles + the /collections
-- page. size controls the homepage tile's grid footprint.
-- ---------------------------------------------------------------------------

create table collections (
  id             uuid primary key default gen_random_uuid(),
  slug           text not null unique,
  tag            text not null default '',
  title          text not null,
  description    text not null default '',
  image_url      text not null default '',
  cta_label      text not null default 'Shop Now',
  size           text not null default 'regular' check (size in ('regular', 'wide')),
  show_on_home   boolean not null default true,
  sort_order     integer not null default 0,
  is_active      boolean not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create trigger collections_set_updated_at
  before update on collections
  for each row execute function set_updated_at();

alter table collections enable row level security;

create policy collections_select_public on collections for select using (is_active = true);
create policy collections_select_staff on collections for select using (is_active_staff());
create policy collections_insert_staff on collections for insert with check (is_active_staff());
create policy collections_update_staff on collections for update using (is_active_staff());
create policy collections_delete_admin on collections for delete using (is_admin());

insert into collections (slug, tag, title, description, size, sort_order) values
  ('signature', 'Elevated Essentials', 'The Signature Series', 'Our flagship collection of heritage silhouettes, remastered for modern street culture.', 'wide', 1),
  ('urban', 'Express Your Style', 'Urban Essentials', 'Versatile staples built for city life — from morning commute to late-night sessions.', 'regular', 2),
  ('performance', 'Built To Move', 'Performance Line', 'Technical fabrics and precision engineering for athletes who refuse to slow down.', 'regular', 3),
  ('heritage', 'Limited Release', 'Street Heritage Pack', 'A nod to the streets that shaped us. Each piece tells a story of hustle and grind.', 'regular', 4),
  ('aero', 'Stay Cool, Move Fast', 'Aero Comfort Edit', 'Lightweight construction and breathable design for those who keep moving.', 'regular', 5),
  ('night-run', 'Dark To Dawn', 'Night Run Series', 'Reflective details and sleek silhouettes designed for after-dark performance.', 'regular', 6);

-- ---------------------------------------------------------------------------
-- 7. Seed the product catalog itself, so the storefront isn't empty. Values
-- carried over from the previous web/src/data/catalog.ts mock. Variants/
-- inventory are placeholders — edit freely from the admin Products tab.
-- ---------------------------------------------------------------------------

do $$
declare
  v_item_id uuid;
  v_variant_id uuid;
  v_sku text;
  v_sizes text[];
  v_size text;
  v_i integer := 0;
  rec record;
begin
  for rec in
    select * from (values
      ('Retro High-Top', 'lifestyle', 6095, 1),
      ('Court Classic', 'basketball', 5895, 2),
      ('Street Flex Low', 'lifestyle', 5295, 3),
      ('Runner Pro Plus', 'running', 7195, 4),
      ('Trail Blazer 42', 'running', 6495, 5),
      ('Urban Stepper', 'lifestyle', 5695, 6),
      ('Heritage 95', 'limited', 8195, 7),
      ('Cloud Racer', 'running', 5995, 8),
      ('Flex Trainer X', 'training', 5495, 9),
      ('Hoop King Elite', 'basketball', 7895, 10),
      ('CrossFit Pro', 'training', 6295, 11),
      ('Signature Tee', 'apparel', 1895, 12),
      ('Street Hoodie', 'apparel', 2795, 13),
      ('Track Jogger', 'apparel', 2495, 14),
      ('Performance Cap', 'accessories', 895, 15),
      ('Grip Bag Pro', 'accessories', 1495, 16),
      ('Cushion Crew Socks', 'accessories', 595, 17),
      ('Speed Lace Kit', 'accessories', 395, 18)
    ) as t(name, category, base_price, sort_order)
  loop
    v_i := v_i + 1;

    insert into items (name, brand, category, gender, base_price, sort_order, is_active)
    values (rec.name, 'Rhayz Kicks', rec.category, 'unisex', rec.base_price, rec.sort_order, true)
    returning id into v_item_id;

    v_sizes := case rec.category
      when 'apparel' then array['S', 'M', 'L']
      when 'accessories' then array['One Size']
      else array['US 9', 'US 10', 'US 11']
    end;

    foreach v_size in array v_sizes loop
      v_sku := 'RK-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
      insert into item_variants (item_id, size, color, sku, is_active)
      values (v_item_id, v_size, 'Black / White', v_sku, true)
      returning id into v_variant_id;

      insert into inventory (sku, quantity_on_hand, reorder_level)
      values (v_sku, 20, 5);
    end loop;
  end loop;
end $$;
