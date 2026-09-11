-- 018_online_order_delivery_stage.sql
--
-- Manual delivery-stage tracking for online orders, staff-driven — like a
-- lightweight Shopee/TikTok Shop tracker: Packed & Ready -> Picked Up From
-- Store -> Received. Reaching 'received' auto-completes the order (sets
-- status = 'fulfilled'), matching the existing "Mark Fulfilled" terminal
-- state so nothing downstream (AccountPage badges, revenue reporting) needs
-- to learn a new terminal status.
--
-- Kept separate from `status` (pending/paid/cancelled/fulfilled) rather than
-- widening that enum — status stays the payment/lifecycle field, this is
-- purely the physical-fulfillment tracker layered on top of a 'paid' order.

alter table online_orders
  add column delivery_stage text not null default 'preparing'
    check (delivery_stage in ('preparing', 'packed', 'picked_up', 'received')),
  add column packed_at timestamptz,
  add column picked_up_at timestamptz,
  add column received_at timestamptz;

create or replace function online_orders_stamp_delivery_stage()
returns trigger
language plpgsql
as $$
begin
  if new.delivery_stage is distinct from old.delivery_stage then
    if new.delivery_stage = 'packed' then
      new.packed_at := coalesce(new.packed_at, now());
    elsif new.delivery_stage = 'picked_up' then
      new.picked_up_at := coalesce(new.picked_up_at, now());
    elsif new.delivery_stage = 'received' then
      new.received_at := coalesce(new.received_at, now());
      new.status := 'fulfilled';
      new.fulfilled_at := coalesce(new.fulfilled_at, now());
    end if;
  end if;
  return new;
end;
$$;

create trigger online_orders_stamp_delivery_stage
  before update on online_orders
  for each row execute function online_orders_stamp_delivery_stage();

-- Widen the staff update policy: it previously only allowed a resulting
-- status of 'fulfilled' or 'cancelled', which would reject a staff update
-- that only changes delivery_stage (e.g. 'preparing' -> 'packed') while
-- status is still 'paid' — RLS re-validates the whole resulting row on
-- every update, not just the changed columns.
drop policy if exists online_orders_update_staff on online_orders;
create policy online_orders_update_staff on online_orders for update
  using (is_active_staff())
  with check (status in ('paid', 'fulfilled', 'cancelled'));
