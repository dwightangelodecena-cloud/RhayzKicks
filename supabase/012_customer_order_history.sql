-- RHAYZKICKS — let customers see their own order history
-- Run once against a project that already has 002-011 applied.
--
-- Before this, a customer had zero visibility into their own purchases:
-- `sales`/`sold_items` were staff-only (is_active_staff()), and
-- `customers.total_purchases` only ever summed `sales`, so a paid online
-- order never showed up in "Total Purchases" on the account page even
-- though it did award loyalty points. Both are gaps this closes.

-- ---------------------------------------------------------------------------
-- 1. Customers can read their own sales/sold_items (in-store purchases),
-- same owns_customer() pattern as vouchers/cart_items/online_orders.
-- Staff/admin access is unchanged.
-- ---------------------------------------------------------------------------

create policy sales_select_own on sales for select using (owns_customer(customer_id));
create policy sold_items_select_own on sold_items for select using (
  exists (select 1 from sales s where s.id = sold_items.sale_id and owns_customer(s.customer_id))
);

-- ---------------------------------------------------------------------------
-- 2. mark_online_order_paid also bumps total_purchases, mirroring what the
-- sales_bump_customer_totals trigger does for POS sales — additive here
-- rather than a recompute since this function already runs inside the
-- 'pending' status guard that keeps it idempotent.
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

  update customers
  set loyalty_points = loyalty_points + v_points_earned,
      total_purchases = total_purchases + v_order.total
  where id = v_order.customer_id;

  delete from cart_items where customer_id = v_order.customer_id;
end;
$$;
