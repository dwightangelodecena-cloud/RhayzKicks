-- RHAYZKICKS — Vendor management incremental migration
-- Run this once in the Supabase SQL editor, in one pass, against a project
-- that already has schema.sql + policies.sql (and 002/003) applied. Adds
-- suppliers, purchase orders, and purchase order line items so the admin
-- dashboard can show upcoming shipments and supplier contacts — none of this
-- existed in the original schema.

-- ---------------------------------------------------------------------------
-- vendors — supplier contact directory.
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

alter table vendors enable row level security;

create policy vendors_select on vendors for select using (is_active_staff());
create policy vendors_insert on vendors for insert with check (is_active_staff());
create policy vendors_update on vendors for update using (is_active_staff());
create policy vendors_delete on vendors for delete using (is_admin());

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

alter table purchase_orders enable row level security;

create policy purchase_orders_select on purchase_orders for select using (is_active_staff());
create policy purchase_orders_insert on purchase_orders for insert with check (is_active_staff());
create policy purchase_orders_update on purchase_orders for update using (is_active_staff());
create policy purchase_orders_delete on purchase_orders for delete using (is_admin());

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

alter table purchase_order_items enable row level security;

create policy purchase_order_items_select on purchase_order_items for select using (is_active_staff());
create policy purchase_order_items_insert on purchase_order_items for insert with check (is_active_staff());
create policy purchase_order_items_update on purchase_order_items for update using (is_admin());
create policy purchase_order_items_delete on purchase_order_items for delete using (is_admin());

-- ---------------------------------------------------------------------------
-- purchase_orders_detail — the relational equivalent of a denormalized
-- "vendor name" / "staff name" field, same pattern as sales_detail.
-- ---------------------------------------------------------------------------

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
