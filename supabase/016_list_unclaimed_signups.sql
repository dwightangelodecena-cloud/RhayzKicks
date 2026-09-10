-- 016_list_unclaimed_signups.sql
--
-- Backs the "Already signed up" dropdown in the admin Staff tab. Client code
-- can't query auth.users directly (same reason create_staff_account() in
-- 009_staff_self_service.sql is security definer), so this returns just the
-- id/email/created_at of accounts that exist in auth.users but have no
-- matching staff row yet — i.e. people who signed up at /staff/signup and
-- are waiting for an admin to add them to the roster.

create or replace function list_unclaimed_signups()
returns table(id uuid, email text, created_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_admin() then
    raise exception 'not authorized to list pending signups';
  end if;

  return query
    select u.id, u.email::text, u.created_at
    from auth.users u
    where not exists (select 1 from staff s where s.id = u.id)
    order by u.created_at desc;
end;
$$;
