-- RHAYZKICKS — Staff self-service migration
-- Run once against a project that already has schema.sql + policies.sql
-- (and 002-008) applied.
--
-- Three additions needed to let staff actually use the day-to-day admin
-- tools (Sales/POS, Inventory, My Hours) without an admin doing everything
-- for them:
--
--   1. staff_shifts_update_self — a staff member can close out their own
--      shift (set clock_out) instead of only admins being able to update
--      any shift row.
--   2. create_staff_account() — admin-only RPC that turns "someone already
--      signed up via /staff/signup" into an actual staff row, by email
--      lookup against auth.users (which client code can't query directly).
--   3. adjust_stock() — atomic restock/adjustment/damage/return, mirroring
--      how create_sale() already bundles an inventory update + a
--      stock_movements row into one transaction instead of two separate
--      round trips.

-- ---------------------------------------------------------------------------
-- 1. Let a staff member close their own shift
-- ---------------------------------------------------------------------------

create policy staff_shifts_update_self on staff_shifts for update
  using (staff_id = auth.uid())
  with check (staff_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 2. create_staff_account — links an existing auth.users row (created via
-- the public /staff/signup form) into the staff table. security definer
-- because auth.users isn't queryable by the anon/authenticated roles at
-- all; the is_admin() check up front is what keeps this from being a
-- privilege escalation — only an admin can call it, and it only ever
-- inserts a normal 'staff' or 'admin' row, nothing bypasses what
-- staff_insert already intends.
-- ---------------------------------------------------------------------------

create or replace function create_staff_account(
  p_email text,
  p_full_name text,
  p_phone text,
  p_role text,
  p_employee_id text default ''
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
begin
  if not is_admin() then
    raise exception 'not authorized to create staff accounts';
  end if;

  if p_role not in ('staff', 'admin') then
    raise exception 'invalid role %', p_role;
  end if;

  select id into v_user_id from auth.users where lower(email) = lower(p_email);

  if v_user_id is null then
    raise exception 'no account found for %. Ask them to sign up at /staff/signup first.', p_email;
  end if;

  if exists (select 1 from staff where id = v_user_id) then
    raise exception 'this account is already a staff member';
  end if;

  insert into staff (id, full_name, email, phone, role, employee_id)
  values (v_user_id, p_full_name, p_email, p_phone, p_role, p_employee_id);

  return v_user_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. adjust_stock — one call = one transaction for restocks/adjustments,
-- same reasoning as create_sale(). Not security definer: the caller's own
-- is_active_staff() permissions already cover both writes (inventory_update,
-- stock_movements_insert) — this just makes them atomic instead of two
-- separate client round trips that could leave inventory and the movement
-- log disagreeing if the second write failed.
-- ---------------------------------------------------------------------------

create or replace function adjust_stock(
  p_sku text,
  p_quantity_change integer,
  p_type text,
  p_reason text default ''
)
returns integer
language plpgsql
as $$
declare
  v_staff_id uuid := auth.uid();
  v_quantity_after integer;
begin
  if p_type not in ('restock', 'adjustment', 'damaged', 'return') then
    raise exception 'invalid stock movement type %', p_type;
  end if;

  update inventory
  set quantity_on_hand = quantity_on_hand + p_quantity_change,
      last_restocked_at = case when p_type = 'restock' then now() else last_restocked_at end,
      updated_by = v_staff_id
  where sku = p_sku
  returning quantity_on_hand into v_quantity_after;

  if v_quantity_after is null then
    raise exception 'no inventory row for sku %', p_sku;
  end if;

  insert into stock_movements (sku, type, quantity_change, quantity_after, reason, staff_id)
  values (p_sku, p_type, p_quantity_change, v_quantity_after, p_reason, v_staff_id);

  return v_quantity_after;
end;
$$;
