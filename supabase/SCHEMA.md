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
  size/sku, since it's meant to become a real sale). Both apps read and write these tables
  directly for the logged-in customer (gated behind having an account on both), with a Realtime
  subscription (`013_cart_wishlist_realtime.sql`) so an add/remove on one app shows up on the
  other without needing to reopen it — this is the actual shopping cart/wishlist, not a
  per-device cache. Mobile still never checks out (browsing + bag + wishlist + loyalty only); web
  is where a cart becomes a real `online_orders` sale. Staff can also read any customer's cart
  (useful for pulling it up while building a sale at the register).
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

## Staff self-service: signup, account linking, stock adjustments

Added by [`009_staff_self_service.sql`](009_staff_self_service.sql), to support the admin
dashboard's Sales/POS, Inventory, and My Hours tabs (staff role, not just admin):

- **`staff_shifts_update_self`** — a staff member can now update their *own* `staff_shifts` row
  (to set `clock_out`), not just admins. Inserting the clock-in row was already allowed
  (`staff_shifts_insert`); without this policy nobody but an admin could ever close out a shift.
- **`create_staff_account(p_email, p_full_name, p_phone, p_role, p_employee_id)`** — admin-only,
  `security definer`. Bridges the chicken-and-egg gap where `staff_insert` requires `is_admin()`
  but the new hire needs an `auth.users` row before anyone can reference their id: they sign up
  themselves at `/staff/signup` (creates the `auth.users` row, no `staff` row yet — inert until
  linked), then an admin calls this function with their email to look them up in `auth.users`
  (not otherwise queryable by client code) and insert the matching `staff` row.
- **`adjust_stock(p_sku, p_quantity_change, p_type, p_reason)`** — atomic restock/adjustment/
  damaged/return, same one-call-one-transaction reasoning as `create_sale()`. Not `security
  definer` — the caller's own `is_active_staff()` grants already cover both writes
  (`inventory_update`, `stock_movements_insert`); this just makes them atomic.

## Admin safeguards + password-based staff creation

Added by [`010_staff_admin_safeguards.sql`](010_staff_admin_safeguards.sql) and the
[`create-staff-account`](functions/create-staff-account/index.ts) Edge Function.

- **`staff_prevent_last_admin_change` / `staff_prevent_last_admin_delete`** — triggers on `staff`
  that block any update/delete which would leave zero active `role = 'admin'` rows. Without this,
  demoting or deactivating the only admin locks everyone out permanently: `staff_update` and
  `staff_delete` both require `is_admin()`, so once nobody passes that check, nobody can ever
  promote anyone back through the app — the only way out is a direct SQL editor edit (which runs
  as `postgres` and bypasses RLS). The admin dashboard's Staff tab also disables the role/deactivate
  controls on your own row and on the last remaining admin as a first line of defense; the triggers
  are the actual backstop, since they apply no matter where the change comes from.
- **`create-staff-account`** (Edge Function, not SQL) — lets an admin set a new hire's password
  directly from the Staff tab instead of requiring `/staff/signup` first. Creating an arbitrary
  `auth.users` row needs the `service_role` key, which must never reach client code, so this has to
  run server-side. The function re-checks the caller is an active admin (via their own request's
  auth header, RLS-scoped) before touching anything, then uses the service role to create the auth
  user and insert the matching `staff` row in one call — rolling back the auth user if the `staff`
  insert fails, so there's never an orphaned login with no roster entry. Deploy it with:
  ```sh
  supabase login
  supabase link --project-ref <your-project-ref>
  supabase functions deploy create-staff-account
  ```
  `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` are provided automatically in
  the Edge Function runtime — no manual secret configuration needed. The Staff tab's "Already signed
  up" mode (calling `create_staff_account()` from `009_staff_self_service.sql`) still works without
  deploying anything, for anyone who'd rather self-serve at `/staff/signup`.

## Online checkout: online_orders, online_order_items, PayMongo

Added by [`011_online_orders.sql`](011_online_orders.sql) plus two Edge Functions. Lets the web
storefront's "Checkout" button (`web/src/components/CartDrawer.tsx`) actually take a payment,
instead of the placeholder message it showed before ("checkout happens in-store").

**Why a separate table from `sales`**: a POS sale (`create_sale()`) is always instantly completed
by a real staff member — `sales.staff_id` is `not null` on purpose. An online order has a
payment-pending lifecycle that never applies to a POS sale (`pending` → `paid` → `fulfilled`, or
`cancelled`), so it gets its own tables rather than loosening that constraint. The two aren't
reconciled into one combined revenue report yet — see "Not built yet" below.

- **`online_orders`** / **`online_order_items`** — mirrors `sales`/`sold_items`'s shape
  (order number, line items with a snapshotted `unit_price`), but nothing here is writable by the
  customer directly. Every row is created and transitioned only by the two Edge Functions below,
  using the `service_role` key (bypasses RLS) — the RLS on these tables is deliberately
  **read-only** for customers (`owns_customer`) and staff (`is_active_staff()`), because the price
  actually charged has to be resolved from the live catalog server-side, never trusted from
  whatever the browser's cached cart says.
- **`mark_online_order_paid(p_order_id, p_payment_reference, p_payment_method)`** — same
  one-call-one-transaction reasoning as `create_sale()`: inventory decrement + `stock_movements` +
  loyalty points + clearing `cart_items` either all happen or none do. Idempotent on purpose —
  PayMongo can retry a webhook, and a retry must not double-decrement stock.
- **`stock_movements.staff_id` is now nullable** — an online sale isn't rung up by any staff
  member, so `mark_online_order_paid` leaves it `null` rather than faking an attribution.
- **`create-paymongo-checkout`** (Edge Function) — the customer's cart (`{itemId, size, color,
  quantity}` only, no prices) is sent here. It re-resolves each line against `items`/
  `item_variants`/`inventory` itself, rejects anything out of stock or no longer active, creates
  the `online_orders`/`online_order_items` rows, then asks PayMongo for a hosted Checkout Session
  and returns its URL for the browser to redirect to.
- **`paymongo-webhook`** (Edge Function) — PayMongo's public callback. Verifies the
  `Paymongo-Signature` header against `PAYMONGO_WEBHOOK_SECRET` (HMAC-SHA256), then calls
  `mark_online_order_paid()`. **The exact payload shape (where `metadata.online_order_id` and the
  payment method live) was written from memory, not verified against a live payload** — the
  webhook extractors search recursively rather than assuming one fixed nesting, but double-check
  against PayMongo's dashboard webhook event log the first time you test a real payment.
- **`/order/success`** (web route) — where PayMongo's `success_url` sends the customer back to;
  polls `online_orders` for a few seconds since the webhook can land just after the redirect, then
  clears their local cart.

### Setting this up

1. Sign up at [paymongo.com](https://dashboard.paymongo.com/signup) — test-mode API keys are
   available immediately, before business verification.
2. From the PayMongo dashboard, grab your **test secret key** (`Developers → API keys`) and create
   a webhook (`Developers → Webhooks`) pointing at
   `https://<project-ref>.supabase.co/functions/v1/paymongo-webhook`, subscribed to
   `checkout_session.payment.paid` — copy its **webhook secret**.
3. Set both as Edge Function secrets:
   ```sh
   supabase secrets set PAYMONGO_SECRET_KEY=sk_test_xxx
   supabase secrets set PAYMONGO_WEBHOOK_SECRET=whsk_xxx
   ```
4. Deploy both functions — the webhook needs `--no-verify-jwt` since PayMongo's request carries no
   Supabase session, only its own signature:
   ```sh
   supabase functions deploy create-paymongo-checkout
   supabase functions deploy paymongo-webhook --no-verify-jwt
   ```
5. Test with PayMongo's [test payment methods](https://developers.paymongo.com/docs/testing) (test
   GCash number, test card 4343434343434345) before going live — then swap in live keys once
   you're ready to accept real payments.

## Customer order history: sales_select_own, sold_items_select_own

Added by [`012_customer_order_history.sql`](012_customer_order_history.sql). Before this, a
customer had no way to see their own purchases at all — `sales`/`sold_items` were staff-only
(`is_active_staff()`), so even though `sales.customer_id` links a POS sale to them, they couldn't
query it. Adds `owns_customer(customer_id)`-based select policies (same pattern as `vouchers`/
`cart_items`/`online_orders`) so `web/src/pages/AccountPage.tsx`'s "My Orders" card can show both
in-store and online purchases in one place.

**Don't use `sales_detail` for this** — it inner-joins `staff` for `staff_name`, and a customer's
own RLS can't see any `staff` rows (`staff_select` requires `is_active_staff()`), so under
`security_invoker = true` the join silently drops every row and the view returns nothing for a
customer even though their `sales` row is now selectable directly. Query `sales` directly instead
when the reader might not be staff.

Also fixes `mark_online_order_paid()` to bump `customers.total_purchases` — it already awarded
loyalty points for a paid online order, but the "Total Purchases" stat only ever summed `sales`
(POS), so online spending wasn't reflected there even though points were.

## Not built yet

- Multi-branch/warehouse support — `inventory` currently assumes a single location. For multiple
  stores, add a `branch_id` column and change the primary key to `(branch_id, sku)`.
- Combined revenue reporting across `sales` (in-store) and `online_orders` (web/mobile checkout) —
  the admin Overview tab's revenue KPIs currently only read `sales`, so paid online orders don't
  show up there yet (they do show under Sales → Online Orders, just not in the top-line numbers).
- Mobile checkout — `Rhayzkicks Mobile` still shows the same "browsing only" placeholder the web
  app used to. The PayMongo flow above is web-only for now; the mobile app would need its own
  client to call `create-paymongo-checkout` and open the returned `checkout_url` in an in-app
  browser/webview.
- Refund/cancel flow for online orders — `online_orders.status` can be set to `cancelled` by staff,
  but nothing automatically restocks inventory or refunds the PayMongo payment when that happens.
