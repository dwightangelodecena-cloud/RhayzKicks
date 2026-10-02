-- RHAYZKICKS — admin-controlled loyalty program + back-credit past orders
-- Run once against a project that already has 002-020 applied.
--
-- Before this, points only came from items.points_value, which defaults to 0
-- and was never set on any product, so every purchase earned 0 points.
-- New rule, per line item, while the program is turned on and the product
-- has items.earns_loyalty = true:
--   * items.points_value > 0  → points_value × quantity (per-product override)
--   * otherwise               → 1 point per loyalty_settings.pesos_per_point
--                               of the line total, rounded down (default ₱100)
-- Redeeming costs loyalty_settings.points_per_voucher (default 100).
-- With the program turned off, purchases earn nothing and redeeming is
-- blocked; balances and existing vouchers are kept.

-- ---------------------------------------------------------------------------
-- 0. loyalty_settings — singleton, same pattern as promo_banner_settings.
-- Everyone can read it (the storefront hides loyalty UI when it's off);
-- only admins can change it.
-- ---------------------------------------------------------------------------

create table if not exists loyalty_settings (
  id                  boolean primary key default true check (id),
  is_enabled          boolean not null default true,
  pesos_per_point     numeric(10, 2) not null default 100 check (pesos_per_point > 0),
  points_per_voucher  integer not null default 100 check (points_per_voucher > 0),
  updated_at          timestamptz not null default now()
);

insert into loyalty_settings (id) values (true) on conflict (id) do nothing;

drop trigger if exists loyalty_settings_set_updated_at on loyalty_settings;
create trigger loyalty_settings_set_updated_at
  before update on loyalty_settings
  for each row execute function set_updated_at();

alter table loyalty_settings enable row level security;

drop policy if exists loyalty_settings_select_public on loyalty_settings;
create policy loyalty_settings_select_public on loyalty_settings for select using (true);
drop policy if exists loyalty_settings_update_admin on loyalty_settings;
create policy loyalty_settings_update_admin on loyalty_settings for update using (is_admin()) with check (is_admin());

-- Per-product switch: admins decide which products earn points at all.
-- Defaults on so existing products start earning at the default rate.
alter table items add column if not exists earns_loyalty boolean not null default true;

-- ---------------------------------------------------------------------------
-- 1. Shared helper so POS and online orders can't drift apart.
-- ---------------------------------------------------------------------------

create or replace function loyalty_points_for_line(p_item_id uuid, p_unit_price numeric, p_quantity integer)
returns integer
language sql
stable
set search_path = public
as $$
  select case
    when not s.is_enabled then 0
    when not i.earns_loyalty then 0
    when coalesce(i.points_value, 0) > 0 then i.points_value * p_quantity
    else floor(coalesce(p_unit_price, 0) * p_quantity / s.pesos_per_point)::integer
  end
  from items i
  cross join loyalty_settings s
  where i.id = p_item_id
$$;

-- ---------------------------------------------------------------------------
-- 1b. redeem_points — same as 002, but honours the on/off switch and the
-- admin-set voucher cost instead of a hardcoded 100.
-- ---------------------------------------------------------------------------

create or replace function redeem_points(p_customer_id uuid, p_template_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_points integer;
  v_cost integer;
  v_enabled boolean;
  v_template_value numeric;
  v_voucher_id uuid;
begin
  if not owns_customer(p_customer_id) then
    raise exception 'not authorized to redeem points for this customer';
  end if;

  select is_enabled, points_per_voucher into v_enabled, v_cost from loyalty_settings where id = true;

  if not coalesce(v_enabled, false) then
    raise exception 'the loyalty program is currently turned off';
  end if;

  select loyalty_points into v_points from customers where id = p_customer_id for update;

  if v_points < v_cost then
    raise exception 'insufficient points: have %, need %', v_points, v_cost;
  end if;

  select value into v_template_value from voucher_templates where id = p_template_id and is_active = true;

  if v_template_value is null then
    raise exception 'voucher option % is not available', p_template_id;
  end if;

  update customers set loyalty_points = loyalty_points - v_cost where id = p_customer_id;

  insert into vouchers (customer_id, template_id, value, source)
  values (p_customer_id, p_template_id, v_template_value, 'points_redemption')
  returning id into v_voucher_id;

  return v_voucher_id;
end;
$$;

-- Records what each online order awarded — used for the back-credit below
-- and so an order's points can be shown/audited later.
alter table online_orders add column if not exists points_earned integer;

-- ---------------------------------------------------------------------------
-- 2. mark_online_order_paid — same as 012, but earns via the helper and
-- stamps points_earned on the order.
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
begin
  select * into v_order from online_orders where id = p_order_id for update;

  if v_order.id is null then
    raise exception 'online order % not found', p_order_id;
  end if;

  if v_order.status <> 'pending' then
    return; -- already processed — webhook retry, no-op
  end if;

  for v_item in select * from online_order_items where order_id = p_order_id
  loop
    update inventory
    set quantity_on_hand = quantity_on_hand - v_item.quantity
    where sku = v_item.sku
    returning quantity_on_hand into v_quantity_after;

    insert into stock_movements (sku, type, quantity_change, quantity_after, reason, sale_id, staff_id)
    values (v_item.sku, 'sale', -v_item.quantity, v_quantity_after, 'Online order ' || v_order.order_number, null, null);

    v_points_earned := v_points_earned + coalesce(loyalty_points_for_line(v_item.item_id, v_item.unit_price, v_item.quantity), 0);
  end loop;

  update online_orders
  set status = 'paid',
      paid_at = now(),
      payment_reference = coalesce(p_payment_reference, payment_reference),
      payment_method = coalesce(p_payment_method, payment_method),
      points_earned = v_points_earned
  where id = p_order_id;

  update customers
  set loyalty_points = loyalty_points + v_points_earned,
      total_purchases = total_purchases + v_order.total
  where id = v_order.customer_id;

  delete from cart_items where customer_id = v_order.customer_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. create_sale (POS) — same as 002, but earns via the helper.
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

    v_points_earned := v_points_earned + coalesce(loyalty_points_for_line(
      (v_item ->> 'item_id')::uuid,
      (v_item ->> 'unit_price')::numeric,
      (v_item ->> 'quantity')::int
    ), 0);
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
-- 4. Back-credit online orders that were paid before this rule existed.
-- Every product had points_value = 0 until now, so those orders earned 0;
-- they get the full new-rule amount. points_earned IS NULL marks "not yet
-- credited", so re-running this block can't double-award. (No POS sales
-- existed when this was written, so only online orders are back-credited.)
-- ---------------------------------------------------------------------------

do $$
declare
  v_order record;
  v_points integer;
begin
  for v_order in
    select id, customer_id from online_orders
    where status in ('paid', 'fulfilled') and points_earned is null
    for update
  loop
    select coalesce(sum(loyalty_points_for_line(item_id, unit_price, quantity)), 0)
    into v_points
    from online_order_items
    where order_id = v_order.id;

    update online_orders set points_earned = v_points where id = v_order.id;

    if v_points > 0 then
      update customers set loyalty_points = loyalty_points + v_points where id = v_order.customer_id;
    end if;
  end loop;
end;
$$;
