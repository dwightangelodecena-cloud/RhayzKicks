# RHAYZKICKS — Supabase (Postgres) Schema

Backend: **Supabase** (hosted Postgres + Auth + Row Level Security). Shared by the React web
app and the Flutter mobile app — same project, same tables, same RLS policies.

Successor to the old Firestore schema (`firebase/SCHEMA.md`, now removed). The collections map
to tables as follows, normalized into a relational model instead of Firestore's
document/subcollection + denormalized-field approach:

| Old Firestore collection | New Postgres table |
|---|---|
| `staff` (doc id = Firebase Auth uid) | `staff` (id = Supabase Auth `auth.users.id`) |
| `customers` | `customers` (`address` map flattened into `street`/`city`/`province`/`zip_code` columns) |
| `items` | `items` |
| `items/{id}/variants` (subcollection) | `item_variants` (own table, `item_id` foreign key) |
| `inventory` (doc id = sku) | `inventory` (`sku` primary key, foreign key to `item_variants.sku`) |
| `inventory/{sku}/stockMovements` (subcollection) | `stock_movements` (own table, `sku` foreign key) |
| `sales` | `sales` |
| `soldItems` | `sold_items` (`sale_id` foreign key) |
| `counters/sales` (manual counter doc) | `sales_order_seq` (native Postgres sequence) |

## Why relational instead of denormalized

Firestore denormalized fields (`inventory.itemName`, `sales.customerName`, `soldItems.itemName`,
etc.) existed only because Firestore can't join across collections in a query. Postgres can, so
this schema drops those copied fields entirely and instead exposes three views that compute them
live via `join`:

- `inventory_detail` — inventory + item/variant names, brand, size, color
- `sales_detail` — sales + customer name + staff name
- `sold_items_detail` — sold_items + sale date + item name/size/color

Because the views are declared `with (security_invoker = true)`, they run with the querying
user's own RLS permissions rather than the view owner's — always query `*_detail`, never the
raw joined tables, when you want the human-readable version of a row.

`customers.total_purchases` is the one denormalized value kept as a real column (not a view),
because it's a rolling aggregate over potentially many rows — a trigger (`bump_customer_totals`)
recomputes it whenever a sale's `status` changes, so it's always correct without recalculating on
every read.

`inventory.is_low_stock` and `sold_items.line_total` are Postgres **generated columns**
(`quantity_on_hand <= reorder_level` and `quantity * unit_price` respectively) — computed by the
database on write, queryable directly, always consistent. The old schema needed a maintained
boolean specifically because "Firestore can't query on a computed comparison of 2 fields"; Postgres
has no such limitation, generated columns just make it queryable without recomputing per-request.

## Atomic sale writes

The old schema required app code to bundle 1 `sales` doc + N `soldItems` docs + N `inventory`
updates + N `stockMovements` docs + 1 counter increment into a single Firestore transaction. The
Postgres equivalent is the `create_sale(p_staff_id, p_customer_id, p_payment_method, p_discount,
p_tax, p_line_items, p_voucher_id)` function in `schema.sql` — a single function call is
automatically one transaction, so a sale can never partially commit. `p_line_items` is a JSON
array:

```json
[{ "item_id": "...", "variant_id": "...", "sku": "...", "quantity": 2, "unit_price": 100.00 }]
```

Call it from the client via `supabase.rpc('create_sale', { ... })` (web) or
`supabase.rpc('create_sale', params: { ... })` (Flutter). `p_voucher_id` is optional — pass an
active voucher belonging to the customer to apply it as extra discount.

Order numbers (`RK-000123`) are generated automatically as each `sales` row's default value,
pulling from the `sales_order_seq` sequence — no manual counter document needed.

## Loyalty program: customer accounts, wishlist, cart, points & vouchers

Customers can sign up and log in themselves (on both apps), separate from staff accounts:
`customers.auth_user_id` links a row to `auth.users.id` (nullable — a walk-in customer profile
staff jots down the old way still works with no login attached). `owns_customer(p_customer_id)`
is the helper policies use to check "is the current session this customer" the same way
`is_active_staff()`/`is_admin()` check staff.

- **`wishlist_items`** — a customer's saved "I like this" list, by `item_id` (no size needed).
- **`cart_items`** — a customer's "intend to buy" list, by `item_variants.id` (a specific
  size/sku, since it's meant to become a real sale). Staff can read any customer's cart (that's
  the point of storing it in Supabase instead of on-device only — mobile never checks out, so
  staff pull up the cart while building the sale on the web).
- **Points**: every item in the catalog has its own `items.points_value`, set per model by
  staff/admin (e.g. "Kobe 5 Lower Merion = 10 pts", "Kobe 4 Daddy Girl = 15 pts"). `create_sale()`
  sums `quantity * points_value` across the line items itself and adds it to
  `customers.loyalty_points` — points are never a client-supplied number, so they can't be
  spoofed from the app.
- **`voucher_templates`** — the reusable catalog of voucher options (label + peso value). An
  admin types a value once (`voucher_templates_insert`, admin-only) and it's saved here so it
  shows up as a choice again later, instead of being retyped from scratch — both in the
  customer's 100-point redemption pop-up and any future ad-hoc grant.
- **`vouchers`** — an issued voucher, `source = 'points_redemption'` (customer-initiated) or
  `'admin_grant'` (admin-initiated, any time, independent of points). `value` is a snapshot of
  the template's value at issue time, so editing/retiring a template later never changes a
  voucher already given out.
- **`redeem_points(p_customer_id, p_template_id)`** — once a customer has ≥100 points, they pick
  a `voucher_templates` option (the pop-up) and this converts 100 points into that voucher. It's
  `security definer`: the customer's own `loyalty_points` needs to decrement, but
  `customers_update_self` (below) blocks a customer from editing that column directly through a
  normal update — this function is the one sanctioned path around that block.
- Applying a voucher at checkout is just passing its id as `create_sale()`'s `p_voucher_id`.

**Column-level protection**: `customers_update_self` lets a customer edit their own profile
fields (name/phone/address) but its `with check` pins `loyalty_points`, `total_purchases`, and
`is_active` to their currently-stored values via a correlated subquery — so a customer can never
raise their own points balance with a raw table update, only through `redeem_points()` or a real
purchase.

For an already-provisioned project, run [`002_loyalty_program.sql`](002_loyalty_program.sql) —
it's the incremental script that adds just this section on top of an existing `schema.sql` +
`policies.sql` deployment (re-running the full files would collide on tables that already exist).

## Vendor management: suppliers & purchase orders

- **`vendors`** — the supplier contact directory (name, contact person, phone, email, address,
  notes). Any active staff member can read/create/update; only admins delete.
- **`purchase_orders`** — a header row per order placed with a vendor: `status`
  (`draft`/`ordered`/`shipped`/`received`/`cancelled`), `order_date`, `expected_date`,
  `received_date`, `total_cost`, `notes`. `po_number` (`PO-000123`) is generated the same way
  `sales.order_number` is, via its own sequence. Deliberately does **not** auto-adjust `inventory`
  on receipt — receiving stock still goes through the existing `stock_movements`/`'restock'` flow,
  so there is exactly one path that changes `quantity_on_hand`.
- **`purchase_order_items`** — line items (`item_id` nullable, for ordering something not yet in
  the catalog; `quantity`; `unit_cost`; `line_total` generated the same way `sold_items.line_total`
  is).
- **`purchase_orders_detail`** — the `sales_detail`-style view joining in `vendor_name` and
  `staff_name` so the UI never has to do that join itself.

For an already-provisioned project, run
[`004_vendor_management.sql`](004_vendor_management.sql).

## Staff time tracking

- **`staff_shifts`** — one row per clock-in/clock-out. `duration_hours` is a generated column
  (`round(extract(epoch from (clock_out - clock_in)) / 3600, 2)`, null while still clocked in),
  mirroring how `inventory.is_low_stock` and `sold_items.line_total` are computed rather than
  maintained by hand. `logged_by` records who entered the row, since a manager may log a shift on
  behalf of someone else at a small shop with one shared register. Any active staff member can
  read/insert; corrections and deletes are admin-only, the same posture as `stock_movements` and
  `sold_items`.
- **`staff_shifts_detail`** — adds `staff_name` via join, same pattern as the other `*_detail`
  views.

For an already-provisioned project, run
[`005_staff_time_tracking.sql`](005_staff_time_tracking.sql).

## Security (Row Level Security)

See [`policies.sql`](policies.sql) — same permission model as the old `firestore.rules`: any
active staff member (`staff.is_active = true`) can do day-to-day read/create/update work; only
`role = 'admin'` staff can manage the staff roster, delete records, or void/refund sales (update
a `sales` row's `status`). Nobody can hard-delete a `sales` row — void/refund by changing
`status` instead, matching the old rule.

`staff.id` is a foreign key to `auth.users.id`, so `auth.uid()` inside a policy maps 1:1 to a
staff record, exactly like `request.auth.uid` did against `staff/{uid}` in Firestore.

**Why `is_active_staff()`/`is_admin()`/`owns_customer()` are `security definer`**: each queries a
table (`staff`, `customers`) whose own RLS policies call that same function — without `security
definer`, evaluating the function would re-trigger those policies, calling the function again,
recursing until Postgres hits "stack depth limit exceeded". `security definer` runs the
function's internal lookup with the function owner's privileges, bypassing RLS for that one read
and breaking the loop. It doesn't change what the functions return or grant any new write
capability — see [`003_fix_rls_recursion.sql`](003_fix_rls_recursion.sql) if you deployed before
this fix landed.

**Bootstrapping**: the very first staff row can't be inserted through the RLS policies (nobody
is staff yet to pass `is_active_staff()`). Insert it once via the Supabase SQL editor, which runs
as `postgres`/`service_role` and bypasses RLS — same chicken-and-egg step the old README called
out for Firestore ("seed an initial admin").

## Setup

1. Create a Supabase project at [supabase.com](https://supabase.com/dashboard).
2. In the SQL editor, run `schema.sql` then `policies.sql` (in that order — policies reference
   tables that must already exist).
3. Create your first staff user in **Authentication → Users**, then insert a matching row:
   ```sql
   insert into staff (id, full_name, email, role, is_active)
   values ('<the auth user's UUID>', 'Your Name', 'you@example.com', 'admin', true);
   ```
4. Copy the project URL (**Project Settings → Data API**) and publishable key (**Project
   Settings → API Keys**) into both apps' env config — see the root [README.md](../README.md).

## Storefront content: nav_categories, announcements, hero_slides, collections

Added by [`006_storefront_content.sql`](006_storefront_content.sql). These back everything the
admin CMS edits on the live storefront — nav/"Shop by Activity" cards, the announcement bar, the
homepage hero carousel, and the Featured Collections tiles + `/collections` page — replacing what
used to be hardcoded in the React app (`web/src/data/homeMock.ts`, `web/src/data/catalog.ts`).

`nav_categories.slug` doubles as the `items.category` value `/category/:slug` filters to, except
the reserved slug `new-releases`, which the app special-cases as "items created in the last 30
days" rather than a literal category match — there's no `MainCategory`/`SubCategory` split
anymore, `items.category` is the one taxonomy (e.g. `running`, `basketball`, `lifestyle`).

All four tables are readable by anyone (`is_visible`/`is_active = true` rows only) since the
storefront is public — same reasoning as the new `items_select_public` /
`item_variants_select_public` / `inventory_select_public` policies below, which opened the
catalog itself up to anonymous reads (it was staff-only, fine for a POS tool but not a public
storefront). Writes stay staff-only, deletes admin-only, same posture as everything else.

## Product photos: item_images + the product-images Storage bucket

Added by [`007_product_gallery.sql`](007_product_gallery.sql). Admins upload photos from a file
picker (instead of pasting URLs) into the public `product-images` Storage bucket; each row in
`item_images` is one photo, tagged with `item_id` + `color`. A product with more than one colorway
gets a distinct multi-angle photo set per color — the product page shows a colorway swatch per
distinct `color` and swaps the whole gallery when the customer picks one, the way sneaker sites
like Nike/SNKRS present colorway variants.

Storage policies live in `policies.sql` alongside the table RLS, qualified as
`public.is_active_staff()` / `public.is_admin()` since `storage.objects` isn't in the `public`
schema — same staff-write/admin-delete posture as everything else, public read since the
storefront is public.

## Explicit colorways: item_colorways

Added by [`008_item_colorways.sql`](008_item_colorways.sql). Before this, a colorway only existed
implicitly — as whatever `color` string was typed into a Variant or a gallery photo — so the admin
couldn't register a colorway (or give it a swatch thumbnail) until a size/stock variant already
existed. `item_colorways` is now the source of truth for a product's colorway list: one row per
`(item_id, color)`, with an optional dedicated `swatch_url` used for the colorway switcher button
on the product page (separate from the multi-angle photos in `item_images`, which are unchanged).
The admin's variant-color field is a dropdown sourced from this table instead of free text, so new
variants can't silently create a colorway that was never registered. Existing products keep their
colors — the migration backfills one `item_colorways` row per distinct `(item_id, color)` already
present in `item_variants`. Same public-read/staff-write/admin-delete RLS posture as `item_images`.

## Not built yet

- Multi-branch/warehouse support — `inventory` currently assumes a single location. For multiple
  stores, add a `branch_id` column and change the primary key to `(branch_id, sku)`.
