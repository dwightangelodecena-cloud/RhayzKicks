-- RHAYZKICKS — Loyalty program incremental migration
-- Run this once in the Supabase SQL editor, in one pass, against a project
-- that already has schema.sql + policies.sql applied. It only adds what's
-- new — schema.sql and policies.sql have already been updated in the repo to
-- show the full current picture, but re-running them from scratch would
-- collide with tables that already exist, so this file is what you actually
-- paste in for an existing project.

-- ---------------------------------------------------------------------------
-- Customer self-service accounts + per-item loyalty points
-- ---------------------------------------------------------------------------

alter table customers add column auth_user_id uuid unique references auth.users (id) on delete set null;
alter table items add column points_value integer not null default 0;

create policy customers_select_self on customers for select using (auth_user_id = auth.uid());
create policy customers_insert_self on customers for insert with check (auth_user_id = auth.uid());
create policy customers_update_self on customers for update
  using (auth_user_id = auth.uid())
  with check (
    auth_user_id = auth.uid()
    and loyalty_points = (select c.loyalty_points from customers c where c.id = customers.id)
    and total_purchases = (select c.total_purchases from customers c where c.id = customers.id)
    and is_active = (select c.is_active from customers c where c.id = customers.id)
  );

-- ---------------------------------------------------------------------------
-- owns_customer helper
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
-- wishlist_items
-- ---------------------------------------------------------------------------

create table wishlist_items (
  id           uuid primary key default gen_random_uuid(),
  customer_id  uuid not null references customers (id) on delete cascade,
  item_id      uuid not null references items (id) on delete cascade,
  created_at   timestamptz not null default now(),
  unique (customer_id, item_id)
);

create index wishlist_items_customer_id_idx on wishlist_items (customer_id);

alter table wishlist_items enable row level security;

create policy wishlist_items_select_own on wishlist_items for select using (owns_customer(customer_id));
create policy wishlist_items_select_staff on wishlist_items for select using (is_active_staff());
create policy wishlist_items_insert_own on wishlist_items for insert with check (owns_customer(customer_id));
create policy wishlist_items_delete_own on wishlist_items for delete using (owns_customer(customer_id));

-- ---------------------------------------------------------------------------
-- cart_items
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

alter table cart_items enable row level security;

create policy cart_items_select_own on cart_items for select using (owns_customer(customer_id));
create policy cart_items_select_staff on cart_items for select using (is_active_staff());
create policy cart_items_insert_own on cart_items for insert with check (owns_customer(customer_id));
create policy cart_items_update_own on cart_items for update using (owns_customer(customer_id));
create policy cart_items_delete_own on cart_items for delete using (owns_customer(customer_id));

-- ---------------------------------------------------------------------------
-- voucher_templates — the reusable catalog of voucher options
-- ---------------------------------------------------------------------------

create table voucher_templates (
  id           uuid primary key default gen_random_uuid(),
  label        text not null,
  value        numeric(10, 2) not null,
  is_active    boolean not null default true,
  created_by   uuid references staff (id),
  created_at   timestamptz not null default now()
);

alter table voucher_templates enable row level security;

create policy voucher_templates_select_active on voucher_templates for select using (is_active = true);
create policy voucher_templates_select_staff on voucher_templates for select using (is_active_staff());
create policy voucher_templates_insert on voucher_templates for insert with check (is_admin());
create policy voucher_templates_update on voucher_templates for update using (is_admin());

-- ---------------------------------------------------------------------------
-- vouchers
-- ---------------------------------------------------------------------------

create table vouchers (
  id                 uuid primary key default gen_random_uuid(),
  code               text not null unique default ('RK-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))),
  customer_id        uuid not null references customers (id) on delete cascade,
  template_id        uuid references voucher_templates (id),
  value              numeric(10, 2) not null,
  source             text not null check (source in ('points_redemption', 'admin_grant')),
  issued_by          uuid references staff (id),
  redeemed           boolean not null default false,
  redeemed_at        timestamptz,
  redeemed_sale_id   uuid references sales (id),
  created_at         timestamptz not null default now()
);

create index vouchers_customer_id_idx on vouchers (customer_id);

alter table vouchers enable row level security;

create policy vouchers_select_own on vouchers for select using (owns_customer(customer_id));
create policy vouchers_select_staff on vouchers for select using (is_active_staff());
create policy vouchers_admin_insert on vouchers for insert
  with check (is_admin() and source = 'admin_grant' and issued_by = auth.uid());
create policy vouchers_update_staff on vouchers for update using (is_active_staff());

-- ---------------------------------------------------------------------------
-- redeem_points — customer picks a voucher_templates option once they have
-- >= 100 points; security definer so it can decrement loyalty_points despite
-- customers_update_self blocking customers from editing that column directly.
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
-- create_sale — replaces the version from schema.sql: adds p_voucher_id and
-- computes loyalty points automatically from each item's points_value
-- instead of a manual points parameter.
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
