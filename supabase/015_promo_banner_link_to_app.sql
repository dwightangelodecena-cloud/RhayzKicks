-- 015_promo_banner_link_to_app.sql
--
-- Points the promo banner's "Join Free" button at the new app-promo landing
-- page (web/src/pages/AppPromoPage.tsx, route /app) instead of the sign-up
-- form, and opens it in a new tab (see PromoBanner.tsx). Only touches the
-- row if it's still on the original default, so a value staff already
-- customized via the admin CMS is left alone.
alter table promo_banner_settings alter column primary_cta_link set default '/app';

update promo_banner_settings
set primary_cta_link = '/app'
where id = true and primary_cta_link = '/join';
