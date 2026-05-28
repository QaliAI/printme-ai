# Migrations

Applied to Supabase project `vfgbvnfhvjmkmfmianpb` (printme-ai).

Order of execution:
1. `initial_schema` — all tables (profiles, style_presets, user_uploads, generated_designs, products, product_variants, carts, cart_items, orders, order_items, webhook_events) including Printify mockup cache columns
2. `rls_policies_and_checkout` — checkout_sessions table + RLS enable + initial policies
3. `seed_style_presets` — 12 AI style presets
4. `storage_buckets_and_policies` — `user-uploads` (private) + `designs` (public) + RLS policies
5. `auto_create_profile_trigger` — auto-create profile + cart on user signup
6. `updated_at_triggers` — touch updated_at column on UPDATE
7. `seed_products_and_variants` — 8 products mapped to Printify blueprints, 29 variants
8. `security_hardening` — fix RLS gaps, search_path, listing leak, RPC EXECUTE
9. `performance_optimization` — RLS init-plan, dedupe policies, FK indexes

To verify: `node scripts/test-supabase-setup.mjs` (or run a Supabase advisor).

To replay against a fresh project, apply migrations in numbered order via the
Supabase dashboard SQL editor or via the Supabase CLI.
