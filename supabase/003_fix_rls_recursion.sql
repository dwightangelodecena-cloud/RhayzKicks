-- RHAYZKICKS — fix "stack depth limit exceeded" from RLS self-reference recursion
-- Run this once in the Supabase SQL editor if you already ran schema.sql/policies.sql
-- and 002_loyalty_program.sql. It re-defines three helper functions as
-- `security definer` — no table/policy changes, just fixes how these three
-- functions execute internally.
--
-- Why this was broken: is_active_staff()/is_admin() query the staff table to
-- decide permissions, but staff's own RLS policies call is_active_staff()/
-- is_admin() to decide whether that very query is allowed — each triggers
-- the other, recursing until Postgres hits its stack depth limit. Same issue
-- for owns_customer() against customers. security definer makes the internal
-- lookup run with the function owner's privileges, bypassing RLS for that
-- one read and breaking the loop. This doesn't change what any of the three
-- functions return, or grant any new write capability — only how the
-- permission check itself is evaluated.

create or replace function is_active_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from staff where id = auth.uid() and is_active = true
  );
$$;

create or replace function is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from staff where id = auth.uid() and is_active = true and role = 'admin'
  );
$$;

create or replace function owns_customer(p_customer_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from customers where id = p_customer_id and auth_user_id = auth.uid()
  );
$$;
