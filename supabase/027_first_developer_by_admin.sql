-- RHAYZKICKS — let an admin add the first developer
-- Run once against a project that already has 026_developer_role.sql applied.
--
-- 026 only let a developer add a developer, which left no way to create the
-- first one from the Staff tab. Now any admin may add a developer while none
-- exists yet; once one does, only developers can add more. Changing a role
-- to or from developer, and deleting a developer, stay developer-only.

create or replace function protect_developer_role()
returns trigger
language plpgsql
as $$
begin
  if auth.uid() is null or is_developer() then
    return coalesce(new, old);
  end if;

  if tg_op = 'INSERT' and new.role = 'developer' then
    if exists (select 1 from staff where role = 'developer') then
      raise exception 'only a developer can add a developer account';
    end if;
  elsif tg_op = 'UPDATE' and new.role is distinct from old.role
        and (old.role = 'developer' or new.role = 'developer') then
    raise exception 'only a developer can change a developer role';
  elsif tg_op = 'DELETE' and old.role = 'developer' then
    raise exception 'only a developer can delete a developer account';
  end if;

  return coalesce(new, old);
end;
$$;

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

  if p_role = 'developer' and not is_developer()
     and exists (select 1 from staff where role = 'developer') then
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
