# Checkout handoff: B1 + B3 integration (Oct 19, 2026)

Branch `integration/checkout-b1-b3`, cut from `master` at `83f9090` (mascot homepage, PR #26).
**Nothing was deployed, merged to `master`, applied to a database, or switched on.** Checkout is still off in production: `COMMERCE_CHECKOUT_ENABLED` and `COMMERCE_PERSISTENCE_ENABLED` are unset there, and the Supabase project `vfgbvnfhvjmkmfmianpb` was last seen paused (INACTIVE).

## What the branch contains

| Commit | What | How it got here |
|---|---|---|
| `ea6b9d8` | PR #24: launch gate #10 evidence and the dry-run `launch-gate.spec.ts` | Original commit, unchanged |
| `a83c026` | PR #25: B1 fix, checkout totals include shipping and tax (migration 013) | Original commit, unchanged |
| `d3e63dc` | `git merge --no-ff origin/fix/b1-checkout-totals` into current master | Merge only. No conflicts: none of the PR's files changed on master after `0af2cda` |
| next commit | The fixes below, tests, this document | New |

No rebase, cherry-pick or force push. The homepage, the Q4 collection and storefront components are untouched. The diff against master is limited to checkout, webhook, harness, SQL, tests and docs.

## Fixes in the new commit

1. **B3: webhook `livemode` check.** `isStripeEventModeMismatch` (`lib/commerce/checkout/stripe-webhook.ts`). `app/api/webhooks/stripe/route.ts` returns 400 after signature verification and before any database write when `event.livemode` disagrees with `STRIPE_MODE` (unset = test, as in the gateway).
2. **Shipping tax behavior.** The Stripe shipping rate now sets `tax_behavior: 'exclusive'` and `tax_code: 'txcd_92010001'` (`stripe-gateway.ts`). Before, it was unset and fell back to the account's Stripe Tax default. If that default were "inclusive", Stripe would carve tax out of the $3.99 shipping and `amount_shipping` would still match. Exclusive is consistent with the line items and with how 013 reconciles totals.
3. **Already-paid / double-charge guard** in `complete_stripe_checkout_payment` (013, and the identical block in the canonical launch migration):
   - same PaymentIntent on an already-paid order (a new event id for the same payment): marks the event processed and returns the order id. It does **not** rewrite the order, so a later fulfillment status is never reset to `paid`.
   - different PaymentIntent on an already-paid order: raises `order already paid by another payment`. The webhook returns 500, the event stays `failed` and replayable, and the order is unchanged. A human must refund the second charge in Stripe.
   - The e2e harness (`lib/commerce/testing/e2e-harness.ts`) mirrors both rules.
4. **Commerce RPCs callable only by `service_role`.** Migrations 005, 006, 007 and 012 revoked EXECUTE from `PUBLIC` only. Supabase's default privileges also grant it to `anon` and `authenticated`, so the anon key could have called `create_commerce_pending_order`, the webhook event functions, `lock_fulfillment_job` and `apply_printify_order_transition` through PostgREST. New `migrations/014_restrict_commerce_rpcs_to_service_role.sql`, plus the same statements as section 014 of the canonical launch migration. Every app caller already uses the service-role client (`lib/supabase/admin.ts`), so nothing in the app loses access.
5. Docs: B3 status in `LAUNCH_GATE_10_EVIDENCE.md`, 014 in `migrations/README.md`, and a "DO NOT RUN" header on the stale `docs/MIGRATIONS_002_TO_009_BUNDLE.sql`.

## Tests

All runs are local and synthetic: the e2e harness replaces Supabase, Stripe Checkout is intercepted, Printify runs in dry-run, and webhook events are signed with a local test secret. No Stripe, Printify or Supabase call was made.

| Check | Before the fixes (`d3e63dc`) | After |
|---|---|---|
| `npx tsc --noEmit` | clean | clean |
| `npx vitest run` | 200 passed, 3 skipped | **215 passed, 3 skipped** (48 files, 2 skipped) |
| `npm run lint` | — | 0 errors, 30 warnings (none in changed files) |
| `npm run build` | — | passes, 78/78 pages |
| Playwright `launch-gate` + `shop-v2` + `revenue-activation` (desktop, tablet, mobile) | 31 passed, 2 failed (mobile shop-v2; see below) | **39 passed, 0 failed** (`--workers=2`) |
| Playwright `launch-gate` alone | 18 | **24 passed** (adds 2 cases × 3 viewports) |

Flaky, not regressions: in a fully parallel run, mobile `shop-v2` checkout and the first `page.goto` of the launch gate time out while `next dev` compiles a route for the first time. The same tests failed the same way on the `master` baseline. They pass in isolation (shop-v2 mobile checkout passed 4/4 with `--repeat-each=4`) and with `--workers=2`.

New coverage:

| Case | Where |
|---|---|
| Subtotal; subtotal + shipping; subtotal + shipping + tax | `launch-gate.spec.ts` (existing, from PR #25) |
| Missing or inconsistent Stripe totals, discount, tax out of range, subtotal/shipping mismatch | `payment-totals.test.ts`, `checkout.test.ts`, `launch-gate.spec.ts` |
| Duplicate webhook (same event id) | `checkout.test.ts`, `launch-gate.spec.ts` |
| Same payment, new event id: no change, no second dry run | `launch-gate.spec.ts` (new) |
| Second PaymentIntent for a paid order: refused, order unchanged | `launch-gate.spec.ts` (new), SQL static test |
| `livemode` mismatch: 400, order unpaid, no dry run | `checkout-hardening.test.ts`, `launch-gate.spec.ts` (new) |
| Failed or unpaid events (`async_payment_failed`, `expired`, unpaid `completed`, `payment_intent.payment_failed`) never mark paid | `checkout-hardening.test.ts` (new) |
| Shipping rate is tax-exclusive with `txcd_92010001` | `checkout-hardening.test.ts` (new; Stripe client mocked) |
| Checkout disabled: no Stripe session; production-shaped config refuses checkout | `checkout-hardening.test.ts`, `launch-gate.spec.ts` |
| Every SECURITY DEFINER RPC in `migrations/` and the canonical file revokes `anon`/`authenticated` and grants `service_role`; 014 = canonical section 014 | `checkout-hardening.test.ts` (new) |
| Fulfillment retry idempotency (completed jobs deduplicated, no duplicate production submit) | `fulfillment.test.ts` (existing) |

I checked that the new tests catch the problem: with the shipping `tax_code` removed and 014 deleted, three of the new unit tests fail.

## Remaining defects (not fixed here)

- **Refunds and disputes are not handled.** No webhook handles `charge.refunded` or `charge.dispute.created`. A refund made in the Stripe dashboard leaves the order `paid`, and fulfillment can still proceed. Until this exists, cancel the Printify draft by hand when refunding. Only email templates (`sendOrderRefunded`) and lifecycle states exist.
- **Async payment failure is silent.** `checkout.session.async_payment_failed` is acknowledged; the order stays unpaid and the customer gets no email. Card-only checkout makes this rare.
- **Replay analytics.** A new event id for an already-paid payment returns the order id, so the route tracks `purchase` again. The confirmation email is deduplicated by Resend (`Idempotency-Key: order-confirmed-<orderId>`).
- **Double charge needs a human.** The guard stops a second charge from being recorded, but it does not refund it. Watch for `failed` rows in `commerce_webhook_events` with `order already paid by another payment`.
- **Tax bound is loose.** Tax is only checked to be `0 ≤ tax ≤ subtotal + shipping`. Stripe computes it; we don't recompute it.
- Launch-gate B4 and B5 are still open: email, Printify webhook and ops secrets unset; Stripe Tax registration; merchant public details; official Printify shipping rates.

## Database release plan (not executed)

Nothing below has been run. Restoring the project, choosing a plan and applying SQL are owner decisions.

### Source of truth

Apply **one** file: `docs/launch/01_CANONICAL_LAUNCH_MIGRATION_vfgbvnfhvjmkmfmianpb.sql`. It contains, in a single transaction, sections 002–009 and 011, plus the 012 fulfillment/outbox changes, the 013 attach/complete functions with the already-paid guard, and the 014 grants. Do not replay `migrations/*.sql` by prefix, and do not run `docs/MIGRATIONS_002_TO_009_BUNDLE.sql`. That bundle predates 013/014, so it would bring back B1 and the anon-callable RPCs.

### Dependencies and conflicts

| Item | Note |
|---|---|
| Base schema | Needs the original 12 tables (`orders`, `carts`, `cart_items`, `products`, `product_variants`, `profiles`, …) from the original nine migrations. Present on Oct 11, unverified since. |
| Duplicate prefixes | `002`, `003`, `004`, `005` and `006` each have two files; the canonical file merges each pair. |
| `003_add_orders_stripe_session_id_unique.sql` | Names a column that doesn't exist on the restored schema (`stripe_session_id` vs `stripe_checkout_session_id`). The canonical file uses the right one. |
| `005_create_analytics_events.sql` vs `010_add_analytics_events.sql` | Both create `analytics_events` (`IF NOT EXISTS`). The canonical file has one copy; 010 is not needed. |
| `001_add_mockup_cache.sql` | Not in the canonical file. Check `generated_designs` for the mockup cache columns during the audit. |
| 013 drops old signatures | `attach_commerce_stripe_session(UUID,UUID,TEXT,TEXT)` and the 7-argument `complete_stripe_checkout_payment` are dropped, so PostgREST sees one function per name. Deploy the app code from this branch **with** the migration: the old app code calls the old signatures. |
| `lock_fulfillment_job` | Defined twice in the canonical file (006, then 012) with the same signature. Section 014 runs after both, so the final grant applies. |

### Expected objects after apply

- **Tables (37):** `analytics_events`, `approved_product_variants`, `cart_items`, `carts`, `catalog_blueprints`, `catalog_print_placements`, `catalog_print_providers`, `catalog_provider_variants`, `catalog_shipping_profiles`, `catalog_sync_runs`, `collection_designs`, `collections`, `commerce_checkout_sessions`, `commerce_design_assets`, `commerce_design_versions`, `commerce_designs`, `commerce_drops`, `commerce_notification_outbox`, `commerce_preview_results`, `commerce_product_configurations`, `commerce_webhook_events`, `curated_designs`, `design_assets`, `design_product_adaptations`, `design_product_compatibility`, `design_product_defaults`, `design_versions`, `drop_designs`, `fulfillment_attempts`, `fulfillment_jobs`, `merchandising_products`, `order_items`, `orders`, `product_configuration_snapshots`, `retail_prices`, `studio_design_audit_log`, `studio_design_metrics`. Several already exist and are altered, not created.
- **Views:** `commerce_published_collections`, `commerce_published_designs`, `commerce_published_drops`.
- **Triggers:** `orders_create_fulfillment_job`, `commerce_design_versions_immutable`, `curated_designs_archive_instead_of_delete`, `design_versions_preserve_purchased`, `order_items_configuration_snapshot_immutable`, `product_configuration_snapshots_immutable`.
- **RPCs (service_role only):** `create_commerce_pending_order`, `attach_commerce_stripe_session` (5 args), `complete_stripe_checkout_payment` (11 args), `begin_commerce_webhook_event`, `claim_failed_commerce_webhook_event`, `finish_commerce_webhook_event`, `lock_fulfillment_job`, `apply_printify_order_transition`.

### Steps

1. **Owner:** restore the project in Supabase. Decide on the plan: free tier pauses again after about a week idle, and a live store needs Pro.
2. Read-only audit of the restored DB: `node --env-file=.env.local scripts/verify-supabase-schema.mjs`, `pg_policies`, and `list_migrations`. Compare with the "Expected objects" list and record the differences.
3. **Backup:** take a database backup (Dashboard → Database → Backups, or `pg_dump` of `public`) and record its time before any SQL runs.
4. **Owner approval:** the reviewed canonical file, the audit result, and the backup time.
5. Apply the canonical file in the SQL editor. It is one transaction, so on error nothing is applied.
6. Run the verification queries below and save the output as evidence.
7. Deploy this branch's code to **preview** only, then do launch-gate steps 5–8 in `LAUNCH_GATE_10_EVIDENCE.md`.

### Verification queries

```sql
-- 1. RPC signatures (expect the 8 functions; attach has 5 args, complete has 11)
SELECT p.proname, pg_get_function_identity_arguments(p.oid) AS args, p.prosecdef
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace AND n.nspname = 'public'
WHERE p.proname IN ('create_commerce_pending_order','attach_commerce_stripe_session',
  'complete_stripe_checkout_payment','begin_commerce_webhook_event',
  'claim_failed_commerce_webhook_event','finish_commerce_webhook_event',
  'lock_fulfillment_job','apply_printify_order_transition')
ORDER BY 1;

-- 2. No commerce RPC callable by anon/authenticated (expect 0 rows for these names)
SELECT p.proname, r.rolname
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace AND n.nspname = 'public'
CROSS JOIN (VALUES ('anon'), ('authenticated')) AS r(rolname)
WHERE p.prosecdef AND p.prorettype <> 'trigger'::regtype
  AND has_function_privilege(r.rolname, p.oid, 'EXECUTE');

-- 3. service_role can call them (expect true for every row)
SELECT p.proname, has_function_privilege('service_role', p.oid, 'EXECUTE')
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace AND n.nspname = 'public'
WHERE p.prosecdef AND p.prorettype <> 'trigger'::regtype;

-- 4. The already-paid guard is in the live function (expect true)
SELECT pg_get_functiondef('complete_stripe_checkout_payment(text,text,text,text,jsonb,integer,text,integer,integer,integer,integer)'::regprocedure)
  LIKE '%order already paid by another payment%';

-- 5. Tables, RLS and the fulfillment trigger
SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' ORDER BY 1;
SELECT tgname FROM pg_trigger WHERE tgname = 'orders_create_fulfillment_job';
```

### Rollback

- **Before cut-over (no orders yet):** restore the backup from step 3. That is the clean rollback.
- **013 only:** see the comments at the end of `migrations/013_fix_checkout_paid_totals.sql`. This brings B1 back, so it also needs the app code reverted.
- **014 only:** `GRANT EXECUTE ... TO anon, authenticated` per signature (bottom of 014). Not recommended: it re-exposes the RPCs to the public anon key.
- After real orders exist, do not restore over them. Fix forward.

## Activation blockers

1. Database paused, and the commerce schema is not applied (B2).
2. This branch is not merged or deployed. Production still runs `master` (`83f9090`) without the B1/B3 fixes, which is safe only because checkout is off.
3. Stripe: which account and key mode `STRIPE_SECRET_KEY` holds is unknown; Stripe Tax is not confirmed; no test-mode webhook endpoint or preview `STRIPE_WEBHOOK_SECRET`.
4. Email (Resend), `PRINTIFY_WEBHOOK_SECRET`, `COMMERCE_OPERATIONS_SECRET` and `ADMIN_EMAILS` are unset (B4).
5. Refund handling (see remaining defects).
6. No physical sample order yet (B5).

## Owner checklist

- [ ] Review and merge this PR (the agent does not merge or deploy).
- [ ] Restore Supabase `vfgbvnfhvjmkmfmianpb`; choose Free or Pro.
- [ ] Approve the release plan above after the read-only audit; take the backup; apply the canonical file; keep the verification output.
- [ ] Stripe dashboard: confirm the account and public details, turn on Stripe Tax for physical goods, register a **test-mode** endpoint for `checkout.session.completed` and `checkout.session.async_payment_succeeded`, and put its secret in Vercel **preview**.
- [ ] Resend domain and keys; Printify webhook secret; ops secret; admin emails.
- [ ] Preview only: `COMMERCE_CHECKOUT_ENABLED=true`, `COMMERCE_PERSISTENCE_ENABLED=true`, `STRIPE_MODE=test`, `PRINTIFY_FULFILLMENT_MODE=draft`. Run one test-card order end to end.
- [ ] Decide how refunds are handled before live sales (manual process, or a follow-up PR for `charge.refunded`).
- [ ] Only then: live keys, `STRIPE_LIVE_RELEASE_APPROVED=true`, live webhook endpoint, Printify `draft` with manual release for the first orders.
