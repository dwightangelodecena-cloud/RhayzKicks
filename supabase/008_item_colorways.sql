-- RHAYZKICKS — Explicit colorways
-- Run this once in the Supabase SQL editor, after 007_product_gallery.sql.
--
-- Until now a "colorway" only existed implicitly, as whatever `color` string
-- happened to be typed into a size/stock Variant or a gallery photo. There
-- was no way to register a colorway (or give it a swatch thumbnail) before a
-- variant existed. This adds item_colorways as the source of truth for a
-- product's colorway list:
--   - color        the colorway name, e.g. "Triple Black"
--   - swatch_url   a single dedicated thumbnail used for the colorway
--                  switcher button on the product page (distinct from the
--                  multi-angle photos in item_images, which keep working
--                  exactly as before)
--   - sort_order   display order in the admin + storefront switcher
--
-- item_variants.color and item_images.color stay plain text (no FK) so
-- existing rows keep working untouched — the admin UI is what enforces new
-- values come from item_colorways going forward.

create table item_colorways (
  id          uuid primary key default gen_random_uuid(),
  item_id     uuid not null references items (id) on delete cascade,
  color       text not null,
  swatch_url  text,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  unique (item_id, color)
);

create index item_colorways_item_id_idx on item_colorways (item_id, sort_order);

alter table item_colorways enable row level security;

create policy item_colorways_select_public on item_colorways for select using (true);
create policy item_colorways_insert_staff on item_colorways for insert with check (is_active_staff());
create policy item_colorways_update_staff on item_colorways for update using (is_active_staff());
create policy item_colorways_delete_admin on item_colorways for delete using (is_admin());

-- Backfill: every distinct (item_id, color) that already exists on a variant
-- becomes a registered colorway, so products created before this migration
-- don't lose their colors in the admin UI.
insert into item_colorways (item_id, color, sort_order)
select distinct item_id, color, 0
from item_variants
on conflict (item_id, color) do nothing;
