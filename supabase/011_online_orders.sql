-- RHAYZKICKS — online checkout (PayMongo)
-- Run once against a project that already has 002-010 applied.
--
-- Separate from `sales`/`sold_items` (the in-store POS ledger) on purpose:
-- an online order has a payment-pending lifecycle a POS sale never does (a
-- POS sale is always instantly completed by a staff member), and giving it
-- its own tables avoids loosening `sales.staff_id not null` — every POS sale
-- still means a real staff member rang it up. Reconciling the two into one
-- combined revenue report is listed under "Not built yet" in SCHEMA.md.
--
-- Nothing here is writable by the customer directly — every row is created
-- and transitioned by the create-paymongo-checkout / paymongo-webhook Edge
-- Functions (using the service_role key, which bypasses RLS). This is
-- deliberate: an order's price must be resolved from the live catalog on the
-- server, never trusted from client input, since it's about to be charged
-- for real. Customers only ever read their own orders.

-- ---------------------------------------------------------------------------
-- online_orders (header) + online_order_items (line items)
-- ---------------------------------------------------------------------------

create table online_orders (
  id                 uuid primary key default gen_random_uuid(),
  order_number       text not null unique default ('RK-ON-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))),
  customer_id        uuid not null references customers (id),
  status             text not null default 'pending' check (status in ('pending', 'paid', 'cancelled', 'fulfilled')),
  payment_provider   text not null default 'paymongo',
  payment_reference  text, -- PayMongo checkout session id
  payment_method     text, -- populated from the webhook once known (e.g. 'gcash', 'card')
  subtotal           numeric(12, 2) not null,
  total              numeric(12, 2) not null,
  paid_at            timestamptz,
  fulfilled_at       timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index online_orders_customer_id_idx on online_orders (customer_id, created_at desc);
create index online_orders_payment_reference_idx on online_orders (payment_reference);

create trigger online_orders_set_updated_at
  before update on online_orders
  for each row execute function set_updated_at();

create table online_order_items (
  id           uuid primary key default gen_random_uuid(),
  order_id     uuid not null references online_orders (id) on delete cascade,
  item_id      uuid not null references items (id),
  variant_id   uuid not null references item_variants (id),
  sku          text not null references item_variants (sku),
  quantity     integer not null check (quantity > 0),
  unit_price   numeric(10, 2) not null, -- snapshotted server-side at order creation, never client-supplied
  line_total   numeric(12, 2) generated always as (quantity * unit_price) stored
);

create index online_order_items_order_id_idx on online_order_items (order_id);

-- ---------------------------------------------------------------------------
-- RLS — read-only for customers (owns_customer, same helper as vouchers/cart),
-- staff can read everything and mark orders fulfilled after pickup/shipment.
-- Insert/update to 'paid' only ever happens via the service_role key from the
-- Edge Functions, which bypasses RLS entirely — there is deliberately no
-- insert policy for the authenticated/anon roles here.
-- ---------------------------------------------------------------------------

alter table online_orders enable row level security;

create policy online_orders_select_own on online_orders for select using (owns_customer(customer_id));
create policy online_orders_select_staff on online_orders for select using (is_active_staff());
create policy online_orders_update_staff on online_orders for update using (is_active_staff())
  with check (status in ('fulfilled', 'cancelled'));

alter table online_order_items enable row level security;

create policy online_order_items_select_own on online_order_items for select using (
  exists (select 1 from online_orders o where o.id = online_order_items.order_id and owns_customer(o.customer_id))
);
create policy online_order_items_select_staff on online_order_items for select using (is_active_staff());

-- ---------------------------------------------------------------------------
-- online_orders_detail — same denormalized-name-via-join pattern as
-- sales_detail, for the admin dashboard.
-- ---------------------------------------------------------------------------

create view online_orders_detail with (security_invoker = true) as
  select
    oo.*,
    c.full_name as customer_name,
    c.phone as customer_phone
  from online_orders oo
  join customers c on c.id = oo.customer_id;

-- ---------------------------------------------------------------------------
-- stock_movements.staff_id becomes nullable — an online sale isn't rung up by
-- any staff member, so attributing it to one would be a fake audit trail.
-- Existing POS-triggered inserts (create_sale, adjust_stock) always pass a
-- real staff_id and are unaffected.
-- ---------------------------------------------------------------------------

alter table stock_movements alter column staff_id drop not null;

-- ---------------------------------------------------------------------------
-- mark_online_order_paid — called by the paymongo-webhook function (via the
-- service_role key) once PayMongo confirms payment. One call = one
-- transaction for the same reason create_sale() is: inventory decrement +
-- stock_movements + loyalty points + cart clear either all happen or none do.
-- Idempotent on purpose — PayMongo may retry the same webhook event, and this
-- must not double-decrement stock or double-award points if it does.
-- ---------------------------------------------------------------------------

create or replace function mark_online_order_paid(p_order_id uuid, p_payment_reference text, p_payment_method text default null)
returns void
language plpgsql
as $$
declare
  v_order online_orders%rowtype;
  v_item online_order_items%rowtype;
  v_quantity_after integer;
  v_points_earned integer := 0;
  v_item_points integer;
begin
  select * into v_order from online_orders where id = p_order_id for update;

  if v_order.id is null then
    raise exception 'online order % not found', p_order_id;
  end if;

  if v_order.status <> 'pending' then
    return; -- already processed — webhook retry, no-op
  end if;

  update online_orders
  set status = 'paid',
      paid_at = now(),
      payment_reference = coalesce(p_payment_reference, payment_reference),
      payment_method = coalesce(p_payment_method, payment_method)
  where id = p_order_id;

  for v_item in select * from online_order_items where order_id = p_order_id
  loop
    update inventory
    set quantity_on_hand = quantity_on_hand - v_item.quantity
    where sku = v_item.sku
    returning quantity_on_hand into v_quantity_after;

    insert into stock_movements (sku, type, quantity_change, quantity_after, reason, sale_id, staff_id)
    values (v_item.sku, 'sale', -v_item.quantity, v_quantity_after, 'Online order ' || v_order.order_number, null, null);

    select points_value into v_item_points from items where id = v_item.item_id;
    v_points_earned := v_points_earned + coalesce(v_item_points, 0) * v_item.quantity;
  end loop;

  if v_points_earned > 0 then
    update customers set loyalty_points = loyalty_points + v_points_earned where id = v_order.customer_id;
  end if;

  delete from cart_items where customer_id = v_order.customer_id;
end;
$$;
