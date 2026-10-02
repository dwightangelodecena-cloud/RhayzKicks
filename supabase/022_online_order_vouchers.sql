-- RHAYZKICKS — let customers apply a voucher at online checkout
-- Run once against a project that already has 002-021 applied.
--
-- Flow: create-paymongo-checkout validates the voucher (customer's own,
-- not redeemed, program on), stores it on the pending order with the
-- discount, and charges PayMongo the discounted total. The voucher is only
-- marked redeemed once mark_online_order_paid runs (webhook), so an
-- abandoned checkout doesn't burn it — the next checkout that uses it
-- cancels the stale pending order holding it.
-- A voucher bigger than the bag makes the order free; the edge function
-- then calls mark_online_order_paid directly instead of going to PayMongo.

alter table online_orders add column if not exists voucher_id uuid references vouchers (id);
alter table online_orders add column if not exists discount numeric(12, 2) not null default 0;
alter table vouchers add column if not exists redeemed_online_order_id uuid references online_orders (id);

create index if not exists online_orders_voucher_id_idx on online_orders (voucher_id) where voucher_id is not null;

-- mark_online_order_paid — same as 021, plus: marks the order's voucher
-- redeemed. Points are earned on the item prices (before the voucher), the
-- same way POS sales work.
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

  if v_order.voucher_id is not null then
    update vouchers
    set redeemed = true, redeemed_at = now(), redeemed_online_order_id = p_order_id
    where id = v_order.voucher_id and redeemed = false;
  end if;

  update customers
  set loyalty_points = loyalty_points + v_points_earned,
      total_purchases = total_purchases + v_order.total
  where id = v_order.customer_id;

  delete from cart_items where customer_id = v_order.customer_id;
end;
$$;
