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

Application-owned commerce migrations:

1. `001_add_mockup_cache.sql`
2. `002_add_cart_configuration_snapshot.sql`
3. `003_add_curated_catalog.sql`
4. `004_add_curated_designs.sql`
5. `005_add_secure_checkout.sql`
6. `006_add_fulfillment_jobs.sql`
7. `007_harden_commerce_webhooks.sql`
8. `008_unify_design_pipeline.sql` (Sprint 3 additive, not applied to production)
