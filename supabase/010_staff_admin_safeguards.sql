-- RHAYZKICKS — admin lockout safeguard
-- Run once against a project that already has 009_staff_self_service.sql applied.
--
-- Incident this fixes: demoting the only admin to 'staff' (or deactivating
-- them) leaves nobody able to pass is_admin() — and staff_update/staff_delete
-- both require is_admin() — so nobody can ever promote anyone back through
-- the app again. The only way out was a direct SQL editor update (which runs
-- as postgres and bypasses RLS). These triggers block that state from being
-- reachable in the first place, whether the change comes from the admin
-- dashboard or a future direct SQL edit.

create or replace function prevent_last_admin_change()
returns trigger
language plpgsql
as $$
begin
  if old.role = 'admin' and old.is_active = true
     and (new.role <> 'admin' or new.is_active = false) then
    if not exists (
      select 1 from staff
      where role = 'admin' and is_active = true and id <> old.id
    ) then
      raise exception 'cannot remove or deactivate the last active admin';
    end if;
  end if;
  return new;
end;
$$;

create trigger staff_prevent_last_admin_change
  before update on staff
  for each row execute function prevent_last_admin_change();

create or replace function prevent_last_admin_delete()
returns trigger
language plpgsql
as $$
begin
  if old.role = 'admin' and old.is_active = true then
    if not exists (
      select 1 from staff
      where role = 'admin' and is_active = true and id <> old.id
    ) then
      raise exception 'cannot delete the last active admin';
    end if;
  end if;
  return old;
end;
$$;

create trigger staff_prevent_last_admin_delete
  before delete on staff
  for each row execute function prevent_last_admin_delete();
