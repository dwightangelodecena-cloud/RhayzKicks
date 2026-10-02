-- RHAYZKICKS — let a product sit in several categories
-- Run once against a project that already has 002-024 applied.
--
-- items.categories holds every category slug a product is listed under
-- (e.g. {running, training}). items.category stays as the product's MAIN
-- category — product pages, recommendations, and older clients keep using
-- it — and a trigger keeps the two consistent:
--   * categories always contains category (added in front if missing)
--   * if category is removed from categories, the first one becomes main
-- Category pages (web storeData, Laravel ProductController) match on
-- categories, so a product shows under every category it's in.

alter table items add column if not exists categories text[] not null default '{}';

update items
set categories = array[category]
where coalesce(array_length(categories, 1), 0) = 0 and coalesce(category, '') <> '';

create or replace function items_sync_categories()
returns trigger
language plpgsql
as $$
begin
  -- Normalise: lowercase, trimmed, no blanks, no duplicates, order kept.
  new.categories := coalesce(array(
    select c from (
      select distinct on (lower(trim(x))) lower(trim(x)) as c, ord
      from unnest(new.categories) with ordinality as t(x, ord)
      where coalesce(trim(x), '') <> ''
      order by lower(trim(x)), ord
    ) d order by ord
  ), '{}');

  if tg_op = 'UPDATE' and new.categories is distinct from old.categories
     and coalesce(new.category, '') = coalesce(old.category, '')
     and not (lower(coalesce(new.category, '')) = any(new.categories))
     and coalesce(array_length(new.categories, 1), 0) > 0 then
    -- Main category was unticked: promote the first remaining one.
    new.category := new.categories[1];
  elsif coalesce(new.category, '') <> '' and not (lower(new.category) = any(new.categories)) then
    new.categories := array_prepend(lower(new.category), new.categories);
  end if;

  if coalesce(new.category, '') = '' and coalesce(array_length(new.categories, 1), 0) > 0 then
    new.category := new.categories[1];
  end if;
  return new;
end;
$$;

drop trigger if exists items_sync_categories on items;
create trigger items_sync_categories
  before insert or update of category, categories on items
  for each row execute function items_sync_categories();

create index if not exists items_categories_idx on items using gin (categories);
