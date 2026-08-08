-- RHAYZKICKS — Product photo uploads + per-colorway galleries
-- Run this once in the Supabase SQL editor, after 006_storefront_content.sql.
--
-- What this does:
--   1. Creates a public 'product-images' Storage bucket so the admin CMS can
--      upload photos directly from a file picker instead of pasting URLs —
--      used for products, hero slides, collections, and nav category images.
--   2. Adds item_images: one row per photo, grouped by (item_id, color), so a
--      product with multiple colorways can show a different multi-angle photo
--      set per colorway on the product page (matching how sneaker sites like
--      Nike/SNKRS present colorway swatches + galleries).

-- ---------------------------------------------------------------------------
-- 1. Storage bucket + policies
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

create policy product_images_select_public on storage.objects
  for select using (bucket_id = 'product-images');

create policy product_images_insert_staff on storage.objects
  for insert with check (bucket_id = 'product-images' and public.is_active_staff());

create policy product_images_update_staff on storage.objects
  for update using (bucket_id = 'product-images' and public.is_active_staff());

create policy product_images_delete_admin on storage.objects
  for delete using (bucket_id = 'product-images' and public.is_admin());

-- ---------------------------------------------------------------------------
-- 2. item_images — per-colorway photo galleries
-- ---------------------------------------------------------------------------

create table item_images (
  id          uuid primary key default gen_random_uuid(),
  item_id     uuid not null references items (id) on delete cascade,
  color       text not null,
  image_url   text not null,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now()
);

create index item_images_item_id_idx on item_images (item_id, color, sort_order);

alter table item_images enable row level security;

create policy item_images_select_public on item_images for select using (true);
create policy item_images_insert_staff on item_images for insert with check (is_active_staff());
create policy item_images_update_staff on item_images for update using (is_active_staff());
create policy item_images_delete_admin on item_images for delete using (is_admin());
