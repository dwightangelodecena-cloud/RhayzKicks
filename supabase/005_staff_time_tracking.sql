-- RHAYZKICKS — Staff time tracking incremental migration
-- Run this once in the Supabase SQL editor, in one pass, against a project
-- that already has schema.sql + policies.sql (and 002/003/004) applied.
-- Adds clock-in/clock-out shift records so "hours worked" on the admin
-- dashboard is real data instead of a guess — nothing like this existed in
-- the original schema.

create table staff_shifts (
  id               uuid primary key default gen_random_uuid(),
  staff_id         uuid not null references staff (id) on delete cascade,
  clock_in         timestamptz not null,
  clock_out        timestamptz,
  duration_hours   numeric generated always as (
    case when clock_out is not null
      then round(extract(epoch from (clock_out - clock_in))::numeric / 3600, 2)
      else null
    end
  ) stored,
  logged_by        uuid not null references staff (id), -- who entered this record (self, or a manager logging for someone else)
  notes            text not null default '',
  created_at       timestamptz not null default now()
);

create index staff_shifts_staff_id_idx on staff_shifts (staff_id, clock_in desc);

alter table staff_shifts enable row level security;

-- Any active staff member can log shifts (their own, or another's if a
-- manager is filling in the register). Corrections/deletes are admin-only,
-- same posture as stock_movements and sold_items.
create policy staff_shifts_select on staff_shifts for select using (is_active_staff());
create policy staff_shifts_insert on staff_shifts for insert with check (is_active_staff());
create policy staff_shifts_update on staff_shifts for update using (is_admin());
create policy staff_shifts_delete on staff_shifts for delete using (is_admin());

-- ---------------------------------------------------------------------------
-- staff_shifts_detail — same denormalized-name-via-join pattern as
-- sales_detail/purchase_orders_detail.
-- ---------------------------------------------------------------------------

create view staff_shifts_detail with (security_invoker = true) as
  select
    ss.*,
    st.full_name as staff_name
  from staff_shifts ss
  join staff st on st.id = ss.staff_id;
