# PrintMe.ai — Fall 2026 Baseline & Real State Audit

**Audit Date:** September 23, 2026  
**Repository:** `QaliAI/printme-ai`  
**Production Site:** `https://printme.ai`  
**Active Release Branch:** `launch/fall-2026-storefront`  
**PR:** [PR #11: feat(release): Fall 2026 Merchandise Storefront & Revenue Readiness](https://github.com/QaliAI/printme-ai/pull/11)  
**Current HEAD Commit:** `8745c4b3c26605c19fea7195dd9c66bf04835bd0`  
**Production Master Commit:** `ed8f0a942fc77d36fd24d61742696dfa6266b3dd` (2026-07-31)

---

## 1. Verified Branch, Deployment & Environment State

### Git & Branch Topology
* **`master` (`ed8f0a94`)**: Live on production (`https://printme.ai`). Outdated; lacks commerce migrations 002–009, Fall 2026 catalog, durable artwork hashing, and shipping engine fixes.
* **`launch/fall-2026-storefront` (`8745c4b3`)**: Target release branch for PR #11. Contains all commerce foundations (PR #8), Milestones 0–9, Fall 2026 launch merchandise, The Seasonal Edit (6 original concepts), personalization engine, and admin trend portal.
* **Open PRs**:
  * **PR #11 (OPEN)**: Primary release PR (`launch/fall-2026-storefront`).
  * **PR #8 (DRAFT)**: Superseded by PR #11 which incorporated all of its commerce readiness work.
  * **PR #9 (DRAFT)**: Text thread designer; non-essential for initial fall launch.

### Deployments & Domains
* **Production**: `https://printme.ai` deployed on Vercel from `master` (`ed8f0a94`).
* **Preview**: `https://printme-21yrmcv24-qaliais-projects.vercel.app` (and branch alias `https://printme-ai-git-launch-fall-2026-storefront-qaliais-projects.vercel.app`) running `8745c4b3`. Status: `READY`.

### CI Failures in PR #11 (Run 35559282944)
1. **Unit Test Job**: Failed on Node.js 20 runner due to `@supabase/realtime-js` throwing `Error: Node.js 20 detected without native WebSocket support.` when importing `lib/supabase.ts`.
2. **Playwright Commerce Flows**: Failed on 2 assertions:
   * `homepage-v2.spec.ts`: Expected `/Boo Crew|Sunday Sidekick/` in featured showcase, but new Fall 2026 Seasonal Edit cards took top priority.
   * `discovery-products.spec.ts`: Expected fixed counts (5 for new, 2 for trending) in `/designs/new` and `/designs/trending`, but catalog count expanded with the 6 new seasonal designs.

---

## 2. Printify Orders Forensic Reconciliation

Five orders exist in Printify shop `22066512`, all created on **2026-09-21 between 03:13:22 and 03:14:29 UTC** during testing in commit `3c6928e`:

| Printify Order ID | Type | Evidence & Script Source | Associated PrintMe Order | Associated Stripe Charge | Current Status | Required Merchant Action |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `6ab0a0d202775cc273050a18` | Synthetic Test | `scripts/test-create-printify-order.mjs` (BP 12, Prov 99, Var 18541 Tee) | None (0 rows in prod DB) | None | `payment-not-received` (on-hold) | Leave on hold; do not retry production payment; archive in Printify |
| `6ab0a10a47a11ef84e022921` | Synthetic Test | `scripts/test-all-draft-orders.mjs` Run 1 (BP 68, Prov 1, Var 33719 Mug) | None (0 rows in prod DB) | None | `payment-not-received` (on-hold) | Leave on hold; do not retry production payment; archive in Printify |
| `6ab0a10d7945157654059821` | Synthetic Test | `scripts/test-all-draft-orders.mjs` Run 1 (BP 282, Prov 99, Var 43144 Poster) | None (0 rows in prod DB) | None | `payment-not-received` (on-hold) | Leave on hold; do not retry production payment; archive in Printify |
| `6ab0a113a9428a48570b3941` | Synthetic Test | `scripts/test-all-draft-orders.mjs` Run 2 (BP 68, Prov 1, Var 33719 Mug) | None (0 rows in prod DB) | None | `payment-not-received` (on-hold) | Leave on hold; do not retry production payment; archive in Printify |
| `6ab0a1153e3e8902ac0af4a7` | Synthetic Test | `scripts/test-all-draft-orders.mjs` Run 2 (BP 282, Prov 99, Var 43144 Poster) | None (0 rows in prod DB) | None | `payment-not-received` (on-hold) | Leave on hold; do not retry production payment; archive in Printify |

**Conclusion**: Zero real customer orders exist. All 5 are synthetic developer test drafts submitted without store funds. **Safety rule enforced:** Do not retry payment or release to production.

---

## 3. Database Schema & Migration Analysis

* Live production Supabase project `vfgbvnfhvjmkmfmianpb` has only the May 2026 baseline tables (`orders`, `carts`, `user_uploads`, etc. with 0 rows).
* Migrations directory contains a collision between PR #8 patch files and canonical commerce migrations.
* **Canonical Migration Sequence**:
  1. `001_add_mockup_cache.sql`
  2. `002_add_cart_configuration_snapshot.sql`
  3. `003_add_curated_catalog.sql`
  4. `004_add_curated_designs.sql`
  5. `005_add_secure_checkout.sql`
  6. `006_add_fulfillment_jobs.sql`
  7. `007_harden_commerce_webhooks.sql`
  8. `008_unify_design_pipeline.sql`
  9. `009_add_printme_studio.sql`
  10. `010_add_analytics_events.sql` (renamed from `005_create_analytics_events.sql` to eliminate numbering collision)

---

## 4. Ordered Implementation Checklist

1. **Schema & Node Fixes (P0)**:
   - Polyfill/safe-guard WebSocket in `lib/supabase.ts` so Supabase client never crashes Node 20/22/24 runners.
   - Upgrade GitHub Actions CI workflow to Node 22/24 and eliminate deprecation warnings.
   - Consolidate canonical migration sequence 001–010 and create automated staging schema validation script.

2. **Test Assertions & CI Repairs (P0)**:
   - Fix `tests/e2e/homepage-v2.spec.ts` regex to expect current seasonal showcase designs.
   - Fix `tests/e2e/discovery-products.spec.ts` count assertions to match actual catalog length dynamically or cleanly.

3. **Stripe Checkout Production Hardening (P0)**:
   - Remove any hardcoded `sk_test_` restriction in webhook processing while enforcing explicit `COMMERCE_CHECKOUT_ENABLED` release gate.
   - Ensure server-authoritative shipping, tax, discounts, and item pricing are passed to Stripe Checkout session.
   - Verify guest checkout and order-success page displaying persisted order data.

4. **Printify Catalog & Fulfillment Mapping (P0)**:
   - Verify blueprint, print provider, and variant mappings (Mug BP 68 Prov 1 Var 33719; Poster BP 282 Prov 99 Var 43138/43144; Tee BP 12 Prov 99 Var 18541/18542).
   - Ensure immutable 300 DPI master artwork URL is passed for every paid item.
   - Enforce manual review fulfillment mode as initial launch default.

5. **Transactional Email Notification System (P0)**:
   - Build pluggable `EmailNotificationService` supporting Order Confirmation, Shipped (with tracking), Attention Required, and Delivered.
   - Implement fake mail transport for deterministic testing and Resend/SMTP adapter for production.
   - Wire email dispatch into Stripe paid webhook and Printify shipped webhook.

6. **End-to-End Verification (P0)**:
   - Run unit tests, Playwright tests, typecheck, lint, and build.
   - Run staging trace script: Order -> Payment -> Webhook -> Order Persisted -> Fulfillment Job -> Confirmation Email.
   - Generate `docs/launch/FALL_2026_RELEASE_REPORT.md`.
