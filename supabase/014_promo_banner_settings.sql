-- 014_promo_banner_settings.sql
--
-- Makes the homepage promo banner (previously hardcoded in PromoBanner.tsx /
-- promo_banner.dart) fully editable from the admin CMS: staff can upload its
-- background image, edit its copy, and show/hide it — mirroring the
-- hero_slides pattern from 006_storefront_content.sql.
--
-- Singleton table: exactly one row, id is always `true`.

create table promo_banner_settings (
  id boolean primary key default true check (id),
  is_active boolean not null default true,
  image_url text,
  label text not null default 'Members Only',
  headline text not null default 'LIMITED DROPS EVERY WEEK',
  subtext text not null default 'Get early access to the most anticipated releases. Join Rhayz Kicks Members and never miss a drop again.',
  primary_cta_label text not null default 'Join Free',
  primary_cta_link text not null default '/join',
  secondary_cta_label text,
  secondary_cta_link text,
  updated_at timestamptz not null default now()
);

insert into promo_banner_settings (id) values (true);

create trigger promo_banner_settings_set_updated_at
  before update on promo_banner_settings
  for each row execute function set_updated_at();

alter table promo_banner_settings enable row level security;

create policy promo_banner_settings_select_public on promo_banner_settings for select using (true);
create policy promo_banner_settings_update_staff on promo_banner_settings for update using (is_active_staff()) with check (is_active_staff());
