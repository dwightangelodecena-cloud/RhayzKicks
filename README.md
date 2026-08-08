# RHAYZKICKS

Shoe shop management system: React (web) + Flutter (mobile), sharing one Supabase (Postgres)
backend.

## Folder structure

```
RHAYZKICKS/
  supabase/                    Postgres schema, RLS policies (source of truth)
    SCHEMA.md                  Full data model documentation
    schema.sql                 Tables, views, triggers, create_sale() function
    policies.sql                Row Level Security policies
  web/                          React + Vite + TypeScript app
    src/supabase.ts             Supabase client init (reads config from .env.local)
    src/types/database.types.ts
    .env.example                 Copy to .env.local and fill in
  Rhayzkicks Mobile/            Flutter app (package name: rhayzkicks_mobile)
    lib/supabase_config.dart    Supabase URL/key — fill in after creating the project
    lib/models/database_models.dart   Dart mirror of the schema
```

Keep `supabase/SCHEMA.md`, `web/src/types/database.types.ts`, and
`Rhayzkicks Mobile/lib/models/database_models.dart` in sync whenever the schema changes.

## What's done

- Postgres schema designed: `customers`, `items` (+ `item_variants`), `inventory`
  (+ `stock_movements`), `sales`, `sold_items`, `staff` — see `supabase/SCHEMA.md` for why it's
  normalized (joins/views) instead of Firestore-style denormalized fields
- Row Level Security policies: active staff can do day-to-day work, only admins manage
  staff/delete records/void sales
- `create_sale()` Postgres function for atomic sale writes (sale + line items + stock
  decrement + audit log, all in one transaction)
- Loyalty program: customers sign up/log in themselves on both apps; wishlist and cart (mobile
  browsing/wishlist/cart only — no payment ever happens on mobile, all purchases and voucher
  redemption happen on the web); loyalty points earned automatically per item purchased
  (`items.points_value`, set per model by staff/admin); a `voucher_templates` catalog admins
  curate, which customers pick from once they hit 100 points (`redeem_points()`), and which
  admins can also grant ad-hoc any time — see `supabase/SCHEMA.md` for the full design
- React app scaffolded, `@supabase/supabase-js` installed and wired to read config from env vars
- Flutter app scaffolded, `supabase_flutter` added to `pubspec.yaml`
- TypeScript and Dart model classes for every table

## What you need to do (things only you can do)

1. **Create the Supabase project** — [supabase.com/dashboard](https://supabase.com/dashboard),
   "New project". This needs your own account, so I can't do it for you.
2. **Run the schema**: open the project's SQL editor and run `supabase/schema.sql`, then
   `supabase/policies.sql` (in that order). If you already ran those two before the loyalty
   program existed, run `supabase/002_loyalty_program.sql` on top instead of re-running the
   first two (it's the incremental script, safe to run once against an already-live project).
   If you already ran `002_loyalty_program.sql` too, also run
   `supabase/003_fix_rls_recursion.sql` — it patches a "stack depth limit exceeded" bug found in
   `create_sale()` (see `supabase/SCHEMA.md`).
3. **Web app config**: in the Supabase dashboard, go to Project Settings > API Keys, copy the
   project URL and publishable key into `web/.env.local` (copy `web/.env.example` first).
4. **Mobile app config**: fill in the same project URL and publishable key in
   `Rhayzkicks Mobile/lib/supabase_config.dart`.
5. **Windows only, to build/run the Flutter app**: enable Developer Mode
   (Settings > For developers > Developer Mode) — required for Flutter's plugin symlinks. I
   didn't change this system setting myself; enable it if/when you're ready to run the app.
6. **Seed an initial admin**: after step 2, create your first user in
   **Authentication > Users** in the Supabase dashboard, then run in the SQL editor:
   ```sql
   insert into staff (id, full_name, email, role, is_active)
   values ('<that user's UUID>', 'Your Name', 'you@example.com', 'admin', true);
   ```
   The RLS policies require this row to exist before any staff/admin actions work.

## Running the apps

```bash
# Web
cd web
npm run dev

# Mobile
cd "Rhayzkicks Mobile"
flutter run
```
