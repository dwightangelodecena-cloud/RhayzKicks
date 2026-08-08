-- RHAYZKICKS — Row Level Security policies for Supabase
-- Successor to firebase/firestore.rules. Run after schema.sql.
--
-- Same permission model as the original Firestore rules:
--   - any active staff member can do day-to-day read/create/update work
--   - only admins can manage the staff roster, delete records, or void/refund sales
--
-- Bootstrapping note: the very first staff row can't be inserted through these
-- policies (nobody is staff yet to pass is_active_staff()). Insert it once via
-- the Supabase SQL editor (which runs as postgres/service_role and bypasses RLS),
-- matching the old README step "seed an initial admin" for Firestore.

-- ---------------------------------------------------------------------------
-- Helper functions (equivalent to firestore.rules' isStaff/isActiveStaff/isAdmin)
-- ---------------------------------------------------------------------------

-- security definer is required here, not optional: staff's own RLS policies
-- (below) call is_active_staff()/is_admin() to decide whether a query against
-- staff is allowed at all. Without security definer, evaluating this
-- function's internal "select ... from staff" would itself need to re-check
-- those same policies — calling is_active_staff() again — recursing until
-- Postgres hits "stack depth limit exceeded". security definer runs the
-- internal lookup as the function owner (bypassing RLS for this one read),
-- breaking the loop. This doesn't widen what a caller can do — the function
-- still only ever returns a boolean.
create or replace function is_active_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from staff where id = auth.uid() and is_active = true
  );
$$;

create or replace function is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from staff where id = auth.uid() and is_active = true and role = 'admin'
  );
$$;

-- ---------------------------------------------------------------------------
-- staff — everyone active can read the roster (needed for "sold by" names);
-- only admins manage it.
-- ---------------------------------------------------------------------------

alter table staff enable row level security;

create policy staff_select on staff for select using (is_active_staff());
create policy staff_insert on staff for insert with check (is_admin());
create policy staff_update on staff for update using (is_admin());
create policy staff_delete on staff for delete using (is_admin());

-- ---------------------------------------------------------------------------
-- customers — active staff read/create/update; only admins delete.
-- ---------------------------------------------------------------------------

alter table customers enable row level security;

create policy customers_select on customers for select using (is_active_staff());
create policy customers_insert on customers for insert with check (is_active_staff());
create policy customers_update on customers for update using (is_active_staff());
create policy customers_delete on customers for delete using (is_admin());

-- Self-service: a signed-up customer can see/manage their own profile. These
-- are additional *permissive* policies (OR'd with the staff ones above), so
-- staff access is unaffected — a customer session just never satisfies
-- is_active_staff(), so only the self_* policies end up binding for them.
create policy customers_select_self on customers for select using (auth_user_id = auth.uid());
create policy customers_insert_self on customers for insert with check (auth_user_id = auth.uid());
-- A customer can edit their own profile fields, but not their own points
-- balance, purchase total, or active flag — those only change via
-- redeem_points()/create_sale() (as staff) or the staff policy above.
create policy customers_update_self on customers for update
  using (auth_user_id = auth.uid())
  with check (
    auth_user_id = auth.uid()
    and loyalty_points = (select c.loyalty_points from customers c where c.id = customers.id)
    and total_purchases = (select c.total_purchases from customers c where c.id = customers.id)
    and is_active = (select c.is_active from customers c where c.id = customers.id)
  );

-- ---------------------------------------------------------------------------
-- items / item_variants — same pattern as customers.
-- ---------------------------------------------------------------------------

alter table items enable row level security;

create policy items_select on items for select using (is_active_staff());
create policy items_select_public on items for select using (is_active = true); -- storefront is public, no staff login required to browse
create policy items_insert on items for insert with check (is_active_staff());
create policy items_update on items for update using (is_active_staff());
create policy items_delete on items for delete using (is_admin());

alter table item_variants enable row level security;

create policy item_variants_select on item_variants for select using (is_active_staff());
create policy item_variants_select_public on item_variants for select using (is_active = true);
create policy item_variants_insert on item_variants for insert with check (is_active_staff());
create policy item_variants_update on item_variants for update using (is_active_staff());
create policy item_variants_delete on item_variants for delete using (is_admin());

-- ---------------------------------------------------------------------------
-- inventory — staff adjust on sale/restock; only admins delete a stock record.
-- stock_movements is an audit log — staff can create, but not edit history.
-- ---------------------------------------------------------------------------

alter table inventory enable row level security;

create policy inventory_select on inventory for select using (is_active_staff());
create policy inventory_select_public on inventory for select using (true); -- stock levels power "in stock"/low-stock display on the storefront
create policy inventory_insert on inventory for insert with check (is_active_staff());
create policy inventory_update on inventory for update using (is_active_staff());
create policy inventory_delete on inventory for delete using (is_admin());

alter table stock_movements enable row level security;

create policy stock_movements_select on stock_movements for select using (is_active_staff());
create policy stock_movements_insert on stock_movements for insert with check (is_active_staff());
create policy stock_movements_update on stock_movements for update using (is_admin());
create policy stock_movements_delete on stock_movements for delete using (is_admin());

-- ---------------------------------------------------------------------------
-- sales — financial records. Staff create/read; only admins void/refund
-- (update); nobody hard-deletes a sale (no delete policy = default deny).
-- ---------------------------------------------------------------------------

alter table sales enable row level security;

create policy sales_select on sales for select using (is_active_staff());
create policy sales_insert on sales for insert with check (is_active_staff());
create policy sales_update on sales for update using (is_admin());

alter table sold_items enable row level security;

create policy sold_items_select on sold_items for select using (is_active_staff());
create policy sold_items_insert on sold_items for insert with check (is_active_staff());
create policy sold_items_update on sold_items for update using (is_admin());
create policy sold_items_delete on sold_items for delete using (is_admin());

-- ---------------------------------------------------------------------------
-- wishlist_items / cart_items — owned by the customer; staff get select-all
-- so they can see a customer's cart while building a sale on the web (that's
-- the whole point of it being shared data instead of on-device only).
-- ---------------------------------------------------------------------------

alter table wishlist_items enable row level security;

create policy wishlist_items_select_own on wishlist_items for select using (owns_customer(customer_id));
create policy wishlist_items_select_staff on wishlist_items for select using (is_active_staff());
create policy wishlist_items_insert_own on wishlist_items for insert with check (owns_customer(customer_id));
create policy wishlist_items_delete_own on wishlist_items for delete using (owns_customer(customer_id));

alter table cart_items enable row level security;

create policy cart_items_select_own on cart_items for select using (owns_customer(customer_id));
create policy cart_items_select_staff on cart_items for select using (is_active_staff());
create policy cart_items_insert_own on cart_items for insert with check (owns_customer(customer_id));
create policy cart_items_update_own on cart_items for update using (owns_customer(customer_id));
create policy cart_items_delete_own on cart_items for delete using (owns_customer(customer_id));

-- ---------------------------------------------------------------------------
-- voucher_templates — the catalog of voucher options. Anyone can see the
-- active ones (that's what populates the customer's 100-point redemption
-- pop-up); only admins curate the list.
-- ---------------------------------------------------------------------------

alter table voucher_templates enable row level security;

create policy voucher_templates_select_active on voucher_templates for select using (is_active = true);
create policy voucher_templates_select_staff on voucher_templates for select using (is_active_staff());
create policy voucher_templates_insert on voucher_templates for insert with check (is_admin());
create policy voucher_templates_update on voucher_templates for update using (is_admin());

-- ---------------------------------------------------------------------------
-- vouchers — a customer can see their own (never insert/update directly —
-- only redeem_points() or an admin grant creates one). Staff see all (needed
-- to apply a voucher at checkout via create_sale()). Admins grant ad-hoc
-- vouchers; staff can update (create_sale() marks a voucher redeemed as the
-- calling staff member, not via security definer).
-- ---------------------------------------------------------------------------

alter table vouchers enable row level security;

create policy vouchers_select_own on vouchers for select using (owns_customer(customer_id));
create policy vouchers_select_staff on vouchers for select using (is_active_staff());
create policy vouchers_admin_insert on vouchers for insert
  with check (is_admin() and source = 'admin_grant' and issued_by = auth.uid());
create policy vouchers_update_staff on vouchers for update using (is_active_staff());

-- ---------------------------------------------------------------------------
-- vendors — active staff read/create/update; only admins delete. Added by
-- 004_vendor_management.sql.
-- ---------------------------------------------------------------------------

alter table vendors enable row level security;

create policy vendors_select on vendors for select using (is_active_staff());
create policy vendors_insert on vendors for insert with check (is_active_staff());
create policy vendors_update on vendors for update using (is_active_staff());
create policy vendors_delete on vendors for delete using (is_admin());

-- ---------------------------------------------------------------------------
-- purchase_orders — active staff read/create/update; only admins delete.
-- purchase_order_items line items follow the sold_items posture: staff can
-- read/insert, only admins edit/delete after the fact.
-- ---------------------------------------------------------------------------

alter table purchase_orders enable row level security;

create policy purchase_orders_select on purchase_orders for select using (is_active_staff());
create policy purchase_orders_insert on purchase_orders for insert with check (is_active_staff());
create policy purchase_orders_update on purchase_orders for update using (is_active_staff());
create policy purchase_orders_delete on purchase_orders for delete using (is_admin());

alter table purchase_order_items enable row level security;

create policy purchase_order_items_select on purchase_order_items for select using (is_active_staff());
create policy purchase_order_items_insert on purchase_order_items for insert with check (is_active_staff());
create policy purchase_order_items_update on purchase_order_items for update using (is_admin());
create policy purchase_order_items_delete on purchase_order_items for delete using (is_admin());

-- ---------------------------------------------------------------------------
-- staff_shifts — any active staff member can log shifts (their own, or
-- another's if a manager is filling in the register); corrections/deletes are
-- admin-only, same posture as stock_movements and sold_items. Added by
-- 005_staff_time_tracking.sql.
-- ---------------------------------------------------------------------------

alter table staff_shifts enable row level security;

create policy staff_shifts_select on staff_shifts for select using (is_active_staff());
create policy staff_shifts_insert on staff_shifts for insert with check (is_active_staff());
create policy staff_shifts_update on staff_shifts for update using (is_admin());
create policy staff_shifts_delete on staff_shifts for delete using (is_admin());

-- ---------------------------------------------------------------------------
-- nav_categories / announcements / hero_slides / collections — storefront
-- content. Public read of the "live" subset (is_visible/is_active = true) so
-- the storefront never needs a staff session to render; staff manage them,
-- only admins delete. Added by 006_storefront_content.sql.
-- ---------------------------------------------------------------------------

alter table nav_categories enable row level security;

create policy nav_categories_select_public on nav_categories for select using (true);
create policy nav_categories_insert_staff on nav_categories for insert with check (is_active_staff());
create policy nav_categories_update_staff on nav_categories for update using (is_active_staff());
create policy nav_categories_delete_admin on nav_categories for delete using (is_admin());

alter table announcements enable row level security;

create policy announcements_select_public on announcements for select using (is_active = true);
create policy announcements_select_staff on announcements for select using (is_active_staff());
create policy announcements_insert_staff on announcements for insert with check (is_active_staff());
create policy announcements_update_staff on announcements for update using (is_active_staff());
create policy announcements_delete_admin on announcements for delete using (is_admin());

alter table hero_slides enable row level security;

create policy hero_slides_select_public on hero_slides for select using (is_active = true);
create policy hero_slides_select_staff on hero_slides for select using (is_active_staff());
create policy hero_slides_insert_staff on hero_slides for insert with check (is_active_staff());
create policy hero_slides_update_staff on hero_slides for update using (is_active_staff());
create policy hero_slides_delete_admin on hero_slides for delete using (is_admin());

alter table collections enable row level security;

create policy collections_select_public on collections for select using (is_active = true);
create policy collections_select_staff on collections for select using (is_active_staff());
create policy collections_insert_staff on collections for insert with check (is_active_staff());
create policy collections_update_staff on collections for update using (is_active_staff());
create policy collections_delete_admin on collections for delete using (is_admin());

-- ---------------------------------------------------------------------------
-- item_images — per-colorway photo galleries. Same posture as the other
-- content tables above. Added by 007_product_gallery.sql.
-- ---------------------------------------------------------------------------

alter table item_images enable row level security;

create policy item_images_select_public on item_images for select using (true);
create policy item_images_insert_staff on item_images for insert with check (is_active_staff());
create policy item_images_update_staff on item_images for update using (is_active_staff());
create policy item_images_delete_admin on item_images for delete using (is_admin());

-- ---------------------------------------------------------------------------
-- Storage: 'product-images' bucket (see schema.sql for the bucket itself,
-- created via insert into storage.buckets — Storage has no "create bucket"
-- DDL, it's just a row in that table). Public read; staff upload/replace;
-- only admins delete. Qualified as public.is_active_staff()/public.is_admin()
-- since storage.objects lives outside the public schema. Added by
-- 007_product_gallery.sql.
-- ---------------------------------------------------------------------------

create policy product_images_select_public on storage.objects
  for select using (bucket_id = 'product-images');

create policy product_images_insert_staff on storage.objects
  for insert with check (bucket_id = 'product-images' and public.is_active_staff());

create policy product_images_update_staff on storage.objects
  for update using (bucket_id = 'product-images' and public.is_active_staff());

create policy product_images_delete_admin on storage.objects
  for delete using (bucket_id = 'product-images' and public.is_admin());

-- ---------------------------------------------------------------------------
-- inventory_detail / sales_detail / sold_items_detail / purchase_orders_detail
-- / staff_shifts_detail are declared with security_invoker = true (see
-- schema.sql), so they run with the querying user's own permissions and
-- inherit the RLS policies above — no separate policies needed for the views
-- themselves.
-- ---------------------------------------------------------------------------
