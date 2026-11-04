-- RHAYZKICKS — developer role
-- Run once against a project that already has 010_staff_admin_safeguards.sql applied.
--
-- A third staff role for whoever builds and maintains the system, so they keep
-- support access after the shop is handed over to its owner:
--   * A developer can do everything an admin can (is_admin() is true for them).
--   * Only a developer can make someone a developer, change a developer's role,
--     or delete a developer row. Admins can still deactivate / reactivate a
--     developer — the shop owner can always switch support access off.
--   * Developers don't count toward the "last active admin" safeguard, so the
--     owner always keeps at least one real admin account of their own.
--
-- Changes made without a signed-in user (SQL editor, service_role in Edge
-- Functions) skip the developer check: the SQL editor is how the first
-- developer gets set, and create-staff-account does its own caller check.

alter table staff drop constraint staff_role_check;
alter table staff add constraint staff_role_check check (role in ('staff', 'admin', 'developer'));

create or replace function is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from staff where id = auth.uid() and is_active = true and role in ('admin', 'developer')
  );
$$;

create or replace function is_developer()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from staff where id = auth.uid() and is_active = true and role = 'developer'
  );
$$;

create or replace function protect_developer_role()
returns trigger
language plpgsql
as $$
begin
  if auth.uid() is null or is_developer() then
    return coalesce(new, old);
  end if;

  if tg_op = 'INSERT' and new.role = 'developer' then
    raise exception 'only a developer can add a developer account';
  elsif tg_op = 'UPDATE' and new.role is distinct from old.role
        and (old.role = 'developer' or new.role = 'developer') then
    raise exception 'only a developer can change a developer role';
  elsif tg_op = 'DELETE' and old.role = 'developer' then
    raise exception 'only a developer can delete a developer account';
  end if;

  return coalesce(new, old);
end;
$$;

create trigger staff_protect_developer_role
  before insert or update or delete on staff
  for each row execute function protect_developer_role();

-- create_staff_account (009) — same body, now also accepts 'developer'
-- (the trigger above still blocks it unless the caller is a developer).
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

  if p_role not in ('staff', 'admin', 'developer') then
    raise exception 'invalid role %', p_role;
  end if;

  if p_role = 'developer' and not is_developer() then
    raise exception 'only a developer can add a developer account';
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
