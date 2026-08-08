-- RHAYZKICKS — Postgres schema for Supabase
-- Successor to firebase/SCHEMA.md. Run this in the Supabase SQL editor (or via
-- `supabase db push`) before policies.sql.

-- ---------------------------------------------------------------------------
-- Enum-like check constraints (kept as text + check, not native enums, so
-- adding a new value later is just a constraint change, not a type migration)
-- ---------------------------------------------------------------------------

create extension if not exists pgcrypto; -- gen_random_uuid()

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- staff — one row per Firebase-Auth-equivalent user. id is a Supabase Auth uid
-- (auth.users.id), so request.auth via RLS maps 1:1 to a staff record.
-- ---------------------------------------------------------------------------

create table staff (
  id           uuid primary key references auth.users (id) on delete cascade,
  full_name    text not null,
  email        text not null,
  phone        text not null default '',
  role         text not null default 'staff' check (role in ('staff', 'admin')),
  employee_id  text not null default '',
  date_hired   date not null default current_date,
  is_active    boolean not null default true,
  created_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- customers
-- ---------------------------------------------------------------------------

create table customers (
  id               uuid primary key default gen_random_uuid(),
  auth_user_id     uuid unique references auth.users (id) on delete set null, -- null = no login (walk-in/staff-entered profile)
  full_name        text not null,
  email            text not null default '',
  phone            text not null default '',
  street           text not null default '',
  city             text not null default '',
  province         text not null default '',
  zip_code         text not null default '',
  loyalty_points   integer not null default 0,
  total_purchases  numeric(12, 2) not null default 0, -- maintained by bump_customer_totals() trigger
  is_active        boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create trigger customers_set_updated_at
  before update on customers
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- items (shoe catalog) + item_variants (size/color per item)
-- ---------------------------------------------------------------------------

create table items (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  brand        text not null,
  category     text not null, -- running | basketball | casual | sandals | kids | ...
  gender       text not null default 'unisex' check (gender in ('men', 'women', 'unisex', 'kids')),
  description  text not null default '',
  base_price   numeric(10, 2) not null default 0,
  cost_price   numeric(10, 2) not null default 0,
  points_value integer not null default 0, -- loyalty points earned per unit purchased, set per model by staff/admin
  image_urls   text[] not null default '{}',
  sort_order   integer not null default 0, -- admin-controlled display order on the storefront
  is_active    boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index items_category_active_name_idx on items (category, is_active, name);

create trigger items_set_updated_at
  before update on items
  for each row execute function set_updated_at();

create table item_variants (
  id              uuid primary key default gen_random_uuid(),
  item_id         uuid not null references items (id) on delete cascade,
  size            text not null, -- kept as text, sizing isn't uniform ("9", "9.5", "US 9")
  color           text not null,
  sku             text not null unique,
  price_override  numeric(10, 2), -- null = use items.base_price
  is_active       boolean not null default true
);

create index item_variants_item_id_idx on item_variants (item_id);

-- ---------------------------------------------------------------------------
-- inventory — one row per variant, keyed by sku (barcode-scan lookup at POS)
-- ---------------------------------------------------------------------------

create table inventory (
  sku                text primary key references item_variants (sku),
  quantity_on_hand   integer not null default 0,
  reorder_level      integer not null default 0,
  is_low_stock       boolean generated always as (quantity_on_hand <= reorder_level) stored,
  last_restocked_at  timestamptz,
  updated_at         timestamptz not null default now(),
  updated_by         uuid references staff (id)
);

create index inventory_low_stock_idx on inventory (is_low_stock) where is_low_stock;

create trigger inventory_set_updated_at
  before update on inventory
  for each row execute function set_updated_at();

create table stock_movements (
  id                uuid primary key default gen_random_uuid(),
  sku               text not null references inventory (sku),
  type              text not null check (type in ('restock', 'sale', 'return', 'adjustment', 'damaged')),
  quantity_change   integer not null,
  quantity_after    integer not null,
  reason            text,
  sale_id           uuid, -- references sales(id); FK added after sales exists, see below
  staff_id          uuid not null references staff (id),
  created_at        timestamptz not null default now()
);

create index stock_movements_sku_idx on stock_movements (sku, created_at desc);

-- ---------------------------------------------------------------------------
-- sales (transaction/receipt header) + sold_items (line items)
-- ---------------------------------------------------------------------------

create sequence sales_order_seq;

create table sales (
  id              uuid primary key default gen_random_uuid(),
  order_number    text not null unique default ('RK-' || lpad(nextval('sales_order_seq')::text, 6, '0')),
  customer_id     uuid references customers (id), -- null = walk-in
  staff_id        uuid not null references staff (id),
  sale_date       timestamptz not null default now(),
  subtotal        numeric(12, 2) not null default 0,
  discount        numeric(12, 2) not null default 0,
  tax             numeric(12, 2) not null default 0,
  total           numeric(12, 2) not null default 0,
  payment_method  text not null check (payment_method in ('cash', 'card', 'gcash', 'other')),
  status          text not null default 'completed' check (status in ('completed', 'refunded', 'voided')),
  created_at      timestamptz not null default now()
);

create index sales_customer_date_idx on sales (customer_id, sale_date desc);
create index sales_staff_date_idx on sales (staff_id, sale_date desc);
create index sales_status_date_idx on sales (status, sale_date desc);

alter table stock_movements
  add constraint stock_movements_sale_id_fkey foreign key (sale_id) references sales (id);

create table sold_items (
  id           uuid primary key default gen_random_uuid(),
  sale_id      uuid not null references sales (id) on delete cascade,
  item_id      uuid not null references items (id),
  variant_id   uuid not null references item_variants (id),
  sku          text not null,
  quantity     integer not null,
  unit_price   numeric(10, 2) not null,
  line_total   numeric(12, 2) generated always as (quantity * unit_price) stored
);

create index sold_items_sale_id_idx on sold_items (sale_id);
create index sold_items_item_id_idx on sold_items (item_id);

-- ---------------------------------------------------------------------------
-- owns_customer — true when the currently-authenticated user is the customer
-- identified by p_customer_id (via customers.auth_user_id). Used by the
-- loyalty-program tables below so a customer only ever sees/touches their own
-- wishlist, cart, and vouchers.
--
-- security definer for the same reason as is_active_staff()/is_admin() in
-- policies.sql: customers_update_self's own check references this table, so
-- without security definer the internal lookup here would re-trigger
-- customers' RLS policies and risk the same "stack depth limit exceeded"
-- recursion.
-- ---------------------------------------------------------------------------

create or replace function owns_customer(p_customer_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from customers where id = p_customer_id and auth_user_id = auth.uid()
  );
$$;

-- ---------------------------------------------------------------------------
-- wishlist_items — mobile "I like this" list, no size/variant needed.
-- ---------------------------------------------------------------------------

create table wishlist_items (
  id           uuid primary key default gen_random_uuid(),
  customer_id  uuid not null references customers (id) on delete cascade,
  item_id      uuid not null references items (id) on delete cascade,
  created_at   timestamptz not null default now(),
  unique (customer_id, item_id)
);

create index wishlist_items_customer_id_idx on wishlist_items (customer_id);

-- ---------------------------------------------------------------------------
-- cart_items — mobile "intend to buy" list, keyed to a specific size/sku.
-- Shared with the web app so staff can see it while building a sale at the
-- register — no checkout happens on mobile, this is just what the customer
-- brought to the counter.
-- ---------------------------------------------------------------------------

create table cart_items (
  id            uuid primary key default gen_random_uuid(),
  customer_id   uuid not null references customers (id) on delete cascade,
  variant_id    uuid not null references item_variants (id) on delete cascade,
  quantity      integer not null default 1 check (quantity > 0),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (customer_id, variant_id)
);

create index cart_items_customer_id_idx on cart_items (customer_id);

create trigger cart_items_set_updated_at
  before update on cart_items
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- voucher_templates — the reusable catalog of voucher options. An admin
-- types a value (and label) once; it's saved here so it shows up as a choice
-- both in the customer's 100-point redemption pop-up and any future ad-hoc
-- grant, instead of being retyped from scratch each time.
-- ---------------------------------------------------------------------------

create table voucher_templates (
  id           uuid primary key default gen_random_uuid(),
  label        text not null, -- e.g. "₱100 off"
  value        numeric(10, 2) not null,
  is_active    boolean not null default true, -- admin can retire an option without deleting history
  created_by   uuid references staff (id),
  created_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- vouchers — either self-redeemed from loyalty points (customer picks a
-- template in the 100-point pop-up) or granted directly by an admin
-- (optionally from a template too). Applied at checkout via create_sale()'s
-- p_voucher_id parameter. value is snapshotted from the template at issue
-- time, so editing/retiring a template later never changes vouchers already
-- given out.
-- ---------------------------------------------------------------------------

create table vouchers (
  id                 uuid primary key default gen_random_uuid(),
  code               text not null unique default ('RK-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))),
  customer_id        uuid not null references customers (id) on delete cascade,
  template_id        uuid references voucher_templates (id),
  value              numeric(10, 2) not null,
  source             text not null check (source in ('points_redemption', 'admin_grant')),
  issued_by          uuid references staff (id), -- null for points_redemption (self-service)
  redeemed           boolean not null default false,
  redeemed_at        timestamptz,
  redeemed_sale_id   uuid references sales (id),
  created_at         timestamptz not null default now()
);

create index vouchers_customer_id_idx on vouchers (customer_id);

-- ---------------------------------------------------------------------------
-- redeem_points — customer-triggered: once they have >= 100 points, they pick
-- a voucher_templates option in the app's pop-up and this converts 100 points
-- into that voucher. security definer because the customer needs their own
-- loyalty_points decremented, but customers_update_self (policies.sql) blocks
-- them from editing that column directly — this function is the one
-- sanctioned path.
-- ---------------------------------------------------------------------------

create or replace function redeem_points(p_customer_id uuid, p_template_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_points integer;
  v_template_value numeric;
  v_voucher_id uuid;
begin
  if not owns_customer(p_customer_id) then
    raise exception 'not authorized to redeem points for this customer';
  end if;

  select loyalty_points into v_points from customers where id = p_customer_id for update;

  if v_points < 100 then
    raise exception 'insufficient points: have %, need 100', v_points;
  end if;

  select value into v_template_value from voucher_templates where id = p_template_id and is_active = true;

  if v_template_value is null then
    raise exception 'voucher option % is not available', p_template_id;
  end if;

  update customers set loyalty_points = loyalty_points - 100 where id = p_customer_id;

  insert into vouchers (customer_id, template_id, value, source)
  values (p_customer_id, p_template_id, v_template_value, 'points_redemption')
  returning id into v_voucher_id;

  return v_voucher_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Reporting views — the relational equivalent of Firestore's denormalized
-- display fields (itemName/brand/customerName/etc), computed via join instead
-- of copied at write time, so they can never drift out of sync.
-- ---------------------------------------------------------------------------

create view inventory_detail with (security_invoker = true) as
  select
    inv.sku,
    inv.quantity_on_hand,
    inv.reorder_level,
    inv.is_low_stock,
    inv.last_restocked_at,
    inv.updated_at,
    inv.updated_by,
    iv.item_id,
    iv.id as variant_id,
    iv.size,
    iv.color,
    it.name as item_name,
    it.brand
  from inventory inv
  join item_variants iv on iv.sku = inv.sku
  join items it on it.id = iv.item_id;

create view sales_detail with (security_invoker = true) as
  select
    s.*,
    c.full_name as customer_name,
    st.full_name as staff_name
  from sales s
  left join customers c on c.id = s.customer_id
  join staff st on st.id = s.staff_id;

create view sold_items_detail with (security_invoker = true) as
  select
    si.*,
    s.sale_date,
    it.name as item_name,
    iv.size,
    iv.color
  from sold_items si
  join sales s on s.id = si.sale_id
  join items it on it.id = si.item_id
  join item_variants iv on iv.id = si.variant_id;

-- ---------------------------------------------------------------------------
-- bump_customer_totals — keeps customers.total_purchases in sync whenever a
-- sale is created or its status changes (completed/refunded/voided)
-- ---------------------------------------------------------------------------

create or replace function bump_customer_totals()
returns trigger
language plpgsql
as $$
begin
  if new.customer_id is not null then
    update customers
    set total_purchases = (
      select coalesce(sum(total), 0)
      from sales
      where customer_id = new.customer_id
        and status = 'completed'
    )
    where id = new.customer_id;
  end if;
  return new;
end;
$$;

create trigger sales_bump_customer_totals
  after insert or update of status on sales
  for each row execute function bump_customer_totals();

-- ---------------------------------------------------------------------------
-- create_sale — atomic equivalent of the Firestore multi-doc transaction
-- (1 sales row + N sold_items + N inventory decrements + N stock_movements +
-- optional voucher redemption + optional loyalty points award). A single
-- function call is one transaction in Postgres, so partial writes can't
-- happen. line_items shape:
--   [{"item_id": "...", "variant_id": "...", "sku": "...", "quantity": 2, "unit_price": 100.00}, ...]
-- p_voucher_id: an active voucher belonging to p_customer_id to apply as
-- extra discount (nullable — most sales don't use one).
-- Loyalty points are never a client-supplied input: each item carries its own
-- points_value (set per model by staff/admin in the catalog), and this
-- function sums quantity * points_value across the line items itself, so a
-- sale's point award always matches what was actually bought.
-- ---------------------------------------------------------------------------

create or replace function create_sale(
  p_staff_id uuid,
  p_customer_id uuid,
  p_payment_method text,
  p_discount numeric,
  p_tax numeric,
  p_line_items jsonb,
  p_voucher_id uuid default null
)
returns uuid
language plpgsql
as $$
declare
  v_sale_id uuid;
  v_subtotal numeric := 0;
  v_item jsonb;
  v_quantity_after integer;
  v_discount numeric := p_discount;
  v_voucher_value numeric;
  v_points_earned integer := 0;
  v_item_points integer;
begin
  select coalesce(sum((item ->> 'quantity')::int * (item ->> 'unit_price')::numeric), 0)
  into v_subtotal
  from jsonb_array_elements(p_line_items) as item;

  if p_voucher_id is not null then
    select value into v_voucher_value
    from vouchers
    where id = p_voucher_id and customer_id = p_customer_id and redeemed = false;

    if v_voucher_value is null then
      raise exception 'voucher % is not an active voucher for this customer', p_voucher_id;
    end if;

    v_discount := v_discount + v_voucher_value;
  end if;

  insert into sales (customer_id, staff_id, payment_method, subtotal, discount, tax, total)
  values (
    p_customer_id,
    p_staff_id,
    p_payment_method,
    v_subtotal,
    v_discount,
    p_tax,
    v_subtotal - v_discount + p_tax
  )
  returning id into v_sale_id;

  if p_voucher_id is not null then
    update vouchers
    set redeemed = true, redeemed_at = now(), redeemed_sale_id = v_sale_id
    where id = p_voucher_id;
  end if;

  for v_item in select * from jsonb_array_elements(p_line_items)
  loop
    insert into sold_items (sale_id, item_id, variant_id, sku, quantity, unit_price)
    values (
      v_sale_id,
      (v_item ->> 'item_id')::uuid,
      (v_item ->> 'variant_id')::uuid,
      v_item ->> 'sku',
      (v_item ->> 'quantity')::int,
      (v_item ->> 'unit_price')::numeric
    );

    update inventory
    set quantity_on_hand = quantity_on_hand - (v_item ->> 'quantity')::int,
        updated_by = p_staff_id
    where sku = v_item ->> 'sku'
    returning quantity_on_hand into v_quantity_after;

    insert into stock_movements (sku, type, quantity_change, quantity_after, sale_id, staff_id)
    values (
      v_item ->> 'sku',
      'sale',
      -(v_item ->> 'quantity')::int,
      v_quantity_after,
      v_sale_id,
      p_staff_id
    );

    select points_value into v_item_points from items where id = (v_item ->> 'item_id')::uuid;
    v_points_earned := v_points_earned + coalesce(v_item_points, 0) * (v_item ->> 'quantity')::int;
  end loop;

  if p_customer_id is not null and v_points_earned > 0 then
    update customers
    set loyalty_points = loyalty_points + v_points_earned
    where id = p_customer_id;
  end if;

  return v_sale_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- vendors — supplier contact directory. Added by 004_vendor_management.sql.
-- ---------------------------------------------------------------------------

create table vendors (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  contact_name  text not null default '',
  phone         text not null default '',
  email         text not null default '',
  address       text not null default '',
  notes         text not null default '',
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create trigger vendors_set_updated_at
  before update on vendors
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- purchase_orders (header) + purchase_order_items (line items) — what was
-- ordered from a vendor, when it's expected, and when it actually arrived.
-- Deliberately does not auto-adjust inventory on receipt (unlike create_sale())
-- — receiving stock still goes through the existing stock_movements/'restock'
-- flow, so there's one source of truth for on-hand quantity.
-- ---------------------------------------------------------------------------

create sequence purchase_order_seq;

create table purchase_orders (
  id             uuid primary key default gen_random_uuid(),
  po_number      text not null unique default ('PO-' || lpad(nextval('purchase_order_seq')::text, 6, '0')),
  vendor_id      uuid not null references vendors (id),
  staff_id       uuid not null references staff (id), -- who created/placed the order
  status         text not null default 'draft' check (status in ('draft', 'ordered', 'shipped', 'received', 'cancelled')),
  order_date     date not null default current_date,
  expected_date  date,
  received_date  date,
  total_cost     numeric(12, 2) not null default 0,
  notes          text not null default '',
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index purchase_orders_vendor_idx on purchase_orders (vendor_id, order_date desc);
create index purchase_orders_status_idx on purchase_orders (status, expected_date);

create trigger purchase_orders_set_updated_at
  before update on purchase_orders
  for each row execute function set_updated_at();

create table purchase_order_items (
  id                 uuid primary key default gen_random_uuid(),
  purchase_order_id  uuid not null references purchase_orders (id) on delete cascade,
  item_id            uuid references items (id), -- null = a new/one-off item not in the catalog yet
  description        text not null default '', -- used when item_id is null, or to note size/color breakdown
  quantity           integer not null check (quantity > 0),
  unit_cost          numeric(10, 2) not null default 0,
  line_total         numeric(12, 2) generated always as (quantity * unit_cost) stored
);

create index purchase_order_items_po_idx on purchase_order_items (purchase_order_id);

create view purchase_orders_detail with (security_invoker = true) as
  select
    po.*,
    v.name as vendor_name,
    v.contact_name as vendor_contact_name,
    v.phone as vendor_phone,
    st.full_name as staff_name
  from purchase_orders po
  join vendors v on v.id = po.vendor_id
  join staff st on st.id = po.staff_id;

-- ---------------------------------------------------------------------------
-- staff_shifts — clock-in/clock-out records. Added by 005_staff_time_tracking.sql.
-- ---------------------------------------------------------------------------

create table staff_shifts (
  id               uuid primary key default gen_random_uuid(),
  staff_id         uuid not null references staff (id) on delete cascade,
  clock_in         timestamptz not null,
  clock_out        timestamptz,
  duration_hours   numeric generated always as (
    case when clock_out is not null
      then round(extract(epoch from (clock_out - clock_in))::numeric / 3600, 2)
      else null
    end
  ) stored,
  logged_by        uuid not null references staff (id), -- who entered this record (self, or a manager logging for someone else)
  notes            text not null default '',
  created_at       timestamptz not null default now()
);

create index staff_shifts_staff_id_idx on staff_shifts (staff_id, clock_in desc);

create view staff_shifts_detail with (security_invoker = true) as
  select
    ss.*,
    st.full_name as staff_name
  from staff_shifts ss
  join staff st on st.id = ss.staff_id;

-- ---------------------------------------------------------------------------
-- nav_categories / announcements / hero_slides / collections — storefront
-- content, editable from the admin CMS. Added by 006_storefront_content.sql.
-- Public (anonymous) read of the "live" rows (is_visible/is_active = true);
-- writes stay staff-only. See that file for the seed data a fresh storefront
-- needs to not look empty.
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

create table announcements (
  id           uuid primary key default gen_random_uuid(),
  message      text not null,
  sort_order   integer not null default 0,
  is_active    boolean not null default true,
  created_at   timestamptz not null default now()
);

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

-- ---------------------------------------------------------------------------
-- product-images Storage bucket — lets the admin CMS upload photos from a
-- file picker instead of pasting URLs (products, hero slides, collections,
-- nav category images). Public read; RLS in policies.sql restricts writes to
-- staff/admins. Added by 007_product_gallery.sql.
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- item_images — per-colorway photo galleries (a product with multiple
-- colorways gets a different multi-angle photo set per color). Uploaded via
-- the public 'product-images' Storage bucket above. Added by
-- 007_product_gallery.sql.
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
