-- RHAYZKICKS — broadcast customers row changes over Realtime so the
-- storefront can pop a "you earned loyalty points" notice the moment
-- mark_online_order_paid (PayMongo webhook) or create_sale (POS) awards
-- points. RLS (customers_select_self / staff policies) already scopes who
-- receives which rows; this just turns on postgres_changes for the table.
-- Run once against a project that already has 002-019 applied.

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'customers'
  ) then
    alter publication supabase_realtime add table customers;
  end if;
end;
$$;
