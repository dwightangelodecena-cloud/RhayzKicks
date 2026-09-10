-- 017_list_unclaimed_signups_staff_only.sql
--
-- 016_list_unclaimed_signups.sql listed every auth.users row without a staff
-- row — which is every ordinary customer account too, not just people who
-- used /staff/signup. StaffSignup.tsx now tags its signUp() call with
-- user_metadata.staff_signup = true; narrow the function to only surface
-- those, so customer emails never appear in the admin's staff-linking
-- dropdown.
--
-- Accounts that signed up via /staff/signup before this change won't carry
-- the flag retroactively — the admin UI keeps a manual "enter email" fallback
-- for that case.

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
    where u.raw_user_meta_data->>'staff_signup' = 'true'
      and not exists (select 1 from staff s where s.id = u.id)
    order by u.created_at desc;
end;
$$;
