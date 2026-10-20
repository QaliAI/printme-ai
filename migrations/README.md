# Migrations

Canonical project: `vfgbvnfhvjmkmfmianpb` (printme-ai).

The 2026-10-11 read-only audit found only the initial 12 public tables and the
original nine migration-history entries. Later commerce migrations below are
**not verified as applied**. See [the current reconciliation and launch blockers](../docs/revenue-activation-2026-10-11.md).

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

To check REST schema metadata without executing commerce RPCs:
`node --env-file=.env.local scripts/verify-supabase-schema.mjs`.
PostgreSQL catalog inspection is still required to verify RLS and constraints.

Do not replay files by numeric prefix alone: several prefixes are duplicated,
and older guest policies expose every row whose user_id is null. Reconcile a
reviewed migration plan against the restored canonical schema before execution.

Application-owned commerce migrations:

1. `001_add_mockup_cache.sql`
2. `002_add_cart_configuration_snapshot.sql`
3. `003_add_curated_catalog.sql`
4. `004_add_curated_designs.sql`
5. `005_add_secure_checkout.sql`
6. `006_add_fulfillment_jobs.sql`
7. `007_harden_commerce_webhooks.sql`
8. `008_unify_design_pipeline.sql` (Sprint 3 additive, not applied to production)
9. `009_add_printme_studio.sql` (Sprint 3 additive, not applied to production)
10. `010_add_analytics_events.sql`
11. `011_add_commerce_rls_policies.sql`
12. `012_launch_fulfillment_and_notification_outbox.sql`
13. `013_fix_checkout_paid_totals.sql` (blocker B1: paid total includes shipping and tax; refuses a second payment for a paid order; same SQL as the canonical launch migration)
14. `014_restrict_commerce_rpcs_to_service_role.sql` (revokes anon/authenticated EXECUTE on the commerce RPCs from 005–012; same statements as the canonical launch migration's section 014)

`docs/MIGRATIONS_002_TO_009_BUNDLE.sql` is an older bundle without the 013/014
fixes. Do not run it; the canonical launch migration in `docs/launch/` replaces it.

The order/status compatibility patch `004_adjust_orders_status_and_columns.sql`
also supplies `orders.order_number`, which is absent on the restored project.
The old `003_add_orders_stripe_session_id_unique.sql` names a different column
from the restored `stripe_checkout_session_id`; do not apply it blindly.
This list describes source files, not a certified production execution plan.
