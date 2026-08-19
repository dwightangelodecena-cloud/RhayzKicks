-- RHAYZKICKS — broadcast cart_items/wishlist_items changes over Realtime so a
-- customer's bag and wishlist stay in sync between the web storefront and the
-- mobile app. RLS (owns_customer()/is_active_staff()) already scopes who can
-- read these rows; this just turns on postgres_changes for them.

alter publication supabase_realtime add table cart_items;
alter publication supabase_realtime add table wishlist_items;
