-- RHAYZKICKS — archive products that have history; richer delivery view
-- Run once against a project that already has 002-023 applied.
--
-- 1. Deleting a product failed with a foreign-key error whenever it had any
--    stock history, in-store sales, online orders or purchase orders — those
--    rows must keep pointing at the product so past orders stay intact.
--    delete_or_archive_item() now deletes a product outright when nothing
--    references it, and otherwise ARCHIVES it: hidden from the storefront,
--    the admin product list, Inventory and the Sales screen, while order
--    history keeps working. restore_archived_item() undoes an archive.
-- 2. online_orders_detail gains the voucher discount (022) and the
--    customer's delivery address, for the Delivery tab.

alter table items add column if not exists archived_at timestamptz;

-- Inventory tab, dashboard stock numbers and low-stock alerts read this view;
-- archived products drop out of all of them.
create or replace view inventory_detail with (security_invoker = true) as
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
  join items it on it.id = iv.item_id
  where it.archived_at is null;

-- Security invoker: runs with the caller's RLS, so only admins (items_delete /
-- inventory_delete are is_admin()) can actually delete or archive.
create or replace function delete_or_archive_item(p_item_id uuid)
returns text
language plpgsql
set search_path = public
as $$
declare
  v_count integer;
begin
  if not is_admin() then
    raise exception 'only admins can delete products';
  end if;

  begin
    -- Inventory rows block deleting variants (no cascade), so clear them
    -- first; if any stock movement / sale / order still references the
    -- product, the FK error rolls this whole block back.
    delete from inventory where sku in (select sku from item_variants where item_id = p_item_id);
    delete from items where id = p_item_id;
    get diagnostics v_count = row_count;
    if v_count = 0 then
      raise exception 'product % not found', p_item_id;
    end if;
    return 'deleted';
  exception when foreign_key_violation then
    null; -- has history: fall through to archiving
  end;

  update items set archived_at = now(), is_active = false where id = p_item_id;
  update item_variants set is_active = false where item_id = p_item_id;
  return 'archived';
end;
$$;

create or replace function restore_archived_item(p_item_id uuid)
returns void
language plpgsql
set search_path = public
as $$
begin
  if not is_admin() then
    raise exception 'only admins can restore products';
  end if;
  update items set archived_at = null where id = p_item_id;
  update item_variants set is_active = true where item_id = p_item_id;
end;
$$;

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
    oo.received_at,
    oo.discount,
    oo.voucher_id,
    c.street as customer_street,
    c.city as customer_city,
    c.province as customer_province,
    c.zip_code as customer_zip_code
  from online_orders oo
  join customers c on c.id = oo.customer_id;
