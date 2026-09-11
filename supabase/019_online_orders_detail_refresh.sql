-- 019_online_orders_detail_refresh.sql
--
-- online_orders_detail (011_online_orders.sql) was defined as `select oo.*, ...`
-- — Postgres expands `*` into a fixed column list at CREATE VIEW time, so the
-- delivery_stage/packed_at/picked_up_at/received_at columns added in
-- 018_online_order_delivery_stage.sql never propagated to the view.
--
-- `create or replace view` only allows appending brand-new columns at the very
-- end of the output list — it cannot tolerate any existing output column
-- shifting position. Naively re-running `oo.*, customer_name, customer_phone`
-- fails because oo.* now expands to include the 4 new columns *before*
-- customer_name/customer_phone, pushing them later and making Postgres think
-- they were renamed (confirmed by testing: "cannot change name of view column
-- customer_name to delivery_stage"). So this spells out the original
-- online_orders columns by name, in their original order, then
-- customer_name/customer_phone (unchanged position), then the 4 new columns
-- appended at the true end.

create or replace view online_orders_detail with (security_invoker = true) as
  select
    oo.id,
    oo.order_number,
    oo.customer_id,
    oo.status,
    oo.payment_provider,
    oo.payment_reference,
    oo.payment_method,
    oo.subtotal,
    oo.total,
    oo.paid_at,
    oo.fulfilled_at,
    oo.created_at,
    oo.updated_at,
    c.full_name as customer_name,
    c.phone as customer_phone,
    oo.delivery_stage,
    oo.packed_at,
    oo.picked_up_at,
    oo.received_at
  from online_orders oo
  join customers c on c.id = oo.customer_id;
