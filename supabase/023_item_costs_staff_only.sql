-- RHAYZKICKS — move cost prices out of the public `items` table
-- Run once against a project that already has 002-022 applied.
--
-- items is readable by anyone for active products (items_select_public), and
-- RLS is row-level, so items.cost_price was readable through the public API
-- by any visitor. Costs now live in item_costs, which only active staff can
-- read or write. Admin → Products edits it; the Overview dashboard reads it.

create table if not exists item_costs (
  item_id     uuid primary key references items (id) on delete cascade,
  cost_price  numeric(10, 2) not null default 0 check (cost_price >= 0),
  updated_at  timestamptz not null default now()
);

insert into item_costs (item_id, cost_price)
select id, cost_price from items
on conflict (item_id) do nothing;

drop trigger if exists item_costs_set_updated_at on item_costs;
create trigger item_costs_set_updated_at
  before update on item_costs
  for each row execute function set_updated_at();

alter table item_costs enable row level security;

drop policy if exists item_costs_select_staff on item_costs;
create policy item_costs_select_staff on item_costs for select using (is_active_staff());
drop policy if exists item_costs_insert_staff on item_costs;
create policy item_costs_insert_staff on item_costs for insert with check (is_active_staff());
drop policy if exists item_costs_update_staff on item_costs;
create policy item_costs_update_staff on item_costs for update using (is_active_staff()) with check (is_active_staff());

alter table items drop column if exists cost_price;
