# Launch gate #10 — checkout evidence pack

Checked Mon Oct 19, 2026, ~11:05–11:20 AM CT, against `master` at `0af2cda`.
Read-only. No database restored, no env var changed, no Stripe or Printify call made, nothing deployed.

**Verdict: NO-GO for live sales.** One code blocker (B1) would charge customers without recording a paid order. The production database is paused and lacks the commerce schema.

## How this was checked

| Source | What it showed |
|---|---|
| Supabase connector, project `vfgbvnfhvjmkmfmianpb` (`printme-ai`) | Status `INACTIVE` (paused). `list_migrations` times out, so the schema can't be read until it's restored. |
| Vercel `printme-ai` (`prj_vzSgRBzVFzssleqC4iRg93stQRU3`), env var **names and targets only** | Listed below. All values are type `sensitive`; none were decrypted. |
| `https://www.printme.ai/api/health` | `{"status":"ok"}`; `/shop` 200. The storefront runs without the DB. |
| Source on `master` | Code paths cited per row. |
| `tests/e2e/launch-gate.spec.ts` (this PR) | Local dry run, results below. |
| Stripe, Printify, Resend dashboards | **Not checked.** Stripe is disconnected from the bot. Printify and Resend aren't connected. |

## Checkout dependencies and current state

| # | Dependency | Used by | Current state | Evidence |
|---|---|---|---|---|
| 1 | Supabase project `printme-ai` | carts, orders, webhooks, storage | **Paused (INACTIVE)** | Supabase connector, Oct 19 |
| 2 | Commerce schema (migrations 002–012: `commerce_checkout_sessions`, `commerce_webhook_events`, `fulfillment_jobs`, `fulfillment_attempts`, `commerce_notification_outbox`, guest-cart snapshot columns, RPCs `complete_stripe_checkout_payment` etc.) | `lib/commerce/checkout/supabase-*.ts`, `fulfillment/supabase-store.ts` | **Not applied** as of the last readable audit (Oct 11: only the 12 original tables). Can't re-verify while paused. | `docs/revenue-activation-2026-10-11.md`, `migrations/README.md` |
| 3 | Original tables `carts`, `cart_items`, `orders`, `order_items`, `products`, `product_variants`, `profiles`, `user_uploads`, `generated_designs` | catalog, cart, studio | Present on Oct 11; unreadable now | same |
| 4 | Storage buckets `user-uploads` (private) and `designs` (public) | artwork persistence | Present on Oct 11; unreadable now | same |
| 5 | Checkout gates `COMMERCE_CHECKOUT_ENABLED` + `COMMERCE_PERSISTENCE_ENABLED` | `checkout/availability.ts`, `stripe-gateway.ts` | **Off in production** (neither set). Preview has only `COMMERCE_CHECKOUT_ENABLED`. | Vercel env names |
| 6 | Stripe secret key | `stripe-gateway.ts` | `STRIPE_SECRET_KEY` set for production and preview. `STRIPE_MODE` unset, so it defaults to **test** and requires `sk_test_`. Whether the stored key is test or live is unknown. | Vercel env names; code |
| 7 | Stripe live release flag `STRIPE_LIVE_RELEASE_APPROVED` | `stripe-gateway.ts`, webhook route | Unset (live mode blocked) | Vercel env names |
| 8 | Stripe webhook endpoint + `STRIPE_WEBHOOK_SECRET` | `app/api/webhooks/stripe/route.ts` | Secret set for **production only**, not preview. On Sep 20 there was no live-mode endpoint registered (issue #10). Not re-checked. | Vercel env names; issue #10 |
| 9 | Stripe Tax (`automatic_tax: enabled`) | `stripe-gateway.ts` | Unknown. Needs Stripe Tax set up on the PrintMe account, or session creation fails. | code |
| 10 | Printify token + shop | fulfillment | `PRINTIFY_API_TOKEN`, `PRINTIFY_SHOP_ID` set (prod + preview). | Vercel env names |
| 11 | `PRINTIFY_FULFILLMENT_MODE` | `fulfillment/service.ts` | Unset in production, so it defaults to `disabled` (safe). Preview has it set. | Vercel env names; code |
| 12 | `PRINTIFY_AUTO_SUBMIT_LIVE_ORDERS`, `PRINTIFY_CREATE_DRAFT_IN_LIVE_MODE` | — | Set in prod + preview, but **no code reads them** (only docs). Stale; don't rely on them as a safety switch. | `rg` over `app/` and `lib/` |
| 13 | `PRINTIFY_WEBHOOK_SECRET` | `app/api/webhooks/printify/route.ts` | **Unset** | Vercel env names |
| 14 | Transactional email (`RESEND_API_KEY`, `TRANSACTIONAL_FROM_EMAIL`, `SUPPORT_EMAIL`) | `lib/notifications/email-service.ts` | **Unset.** The dry run logs `CONFIGURATION_ERROR: RESEND_API_KEY is not configured`, so no order confirmation goes out. | Vercel env names; test log |
| 15 | Ops/admin (`COMMERCE_OPERATIONS_SECRET`, `ADMIN_EMAILS`) | admin order approve/dry-run routes | **Unset** | Vercel env names |
| 16 | `NEXT_PUBLIC_APP_URL` | Stripe success/cancel URLs | Set (production only) | Vercel env names |

## Blockers

**B1. Paid orders would fail to record (code bug, launch-blocking).**
`SecureCheckoutService` creates the pending order with `total = subtotal` (`create_pending` in `migrations/005_add_secure_checkout.sql`, and the same in `docs/launch/01_CANONICAL_LAUNCH_MIGRATION_vfgbvnfhvjmkmfmianpb.sql`: `shipping 0, tax 0, total p_subtotal`). The Stripe session then adds a shipping rate (`shippingFeeCents`) and `automatic_tax`. `complete_stripe_checkout_payment` rejects any `amount_total <> orders.total`.
Result: on any real order with shipping or tax, Stripe takes the money, the webhook returns 500, and the order stays unpaid and unfulfilled.
Reproduced locally: a $34.00 tee plus $3.99 quoted shipping gives a paid event of 3799 → `500 {"error":"Stripe event processing failed."}`; the order stays unpaid. The existing e2e tests pass only because they send `amount_total = subtotal`.
Fix (coding task): store the quoted shipping on the pending order and reconcile tax from the session (`total_details.amount_tax`, `amount_shipping`) before comparing, or compare against `subtotal + shipping + tax` read from Stripe. Update the harness and RPC together. The `BLOCKER` test in `launch-gate.spec.ts` is marked `test.fail` and will start reporting once this is fixed.

**B1 fix (PR `fix/b1-checkout-totals`, not applied to any database):** `attach_commerce_stripe_session` now records the shipping fee that was put on the Stripe session (`orders.shipping`, `total = subtotal + shipping`). `complete_stripe_checkout_payment` takes Stripe's `amount_subtotal`, `amount_shipping`, `amount_tax` and `amount_discount`. It accepts the payment only if the subtotal and shipping match the order, the amounts add up to `amount_total`, there is no discount and tax is in range, and then it records the tax and the paid total. The same SQL is in `migrations/013_fix_checkout_paid_totals.sql` and in the canonical launch migration. The webhook (`payment-totals.ts`) and the e2e harness apply the same rules. The B1 test is now a normal test, with extra cases at subtotal + shipping + tax and for mismatched payments.

**B2. Database paused, commerce schema missing.** See rows 1–2. Restoring the DB is Rubin's call. Migrations need a reviewed plan, not a replay by file prefix (`migrations/README.md` lists conflicting duplicates).

**B3. Webhook doesn't check `livemode`.** A signed event is processed whatever its `livemode` value. Separate test/live signing secrets are the only guard. Low risk, but add a check that `event.livemode` matches `STRIPE_MODE`.

**B3 fix (branch `integration/checkout-b1-b3`, not deployed):** the webhook returns 400 before touching the database when `event.livemode` disagrees with `STRIPE_MODE` (unset counts as test). The same branch also makes the shipping rate tax-exclusive (`txcd_92010001`), restricts all eight commerce RPCs to `service_role` (migration 014), and refuses a second PaymentIntent for an already-paid order (013). See `docs/CLAUDE_CHECKOUT_HANDOFF.md`.

**B4. No email, no Printify webhook secret, no ops secret** (rows 13–15).

**B5. Open issue-#10 P0 items not verified here:** official Printify shipping rates per provider, Stripe Tax setup, merchant public details (issue #10 says they still show Rubix AI), and a real Printify draft from a paid test order.

## Dry-run test results (this PR)

`npx playwright test tests/e2e/launch-gate.spec.ts` (local `next dev`, e2e harness, `sk_test_local_e2e_only`, Printify `dry-run`). Stripe Checkout is intercepted, and browser calls to `api.stripe.com` and `api.printify.com` are aborted. The spec refuses to run if `baseURL` isn't localhost.

| Test | mobile 390 | tablet 768 | desktop 1440 |
|---|---|---|---|
| Production-shaped config (no persistence flag) refuses checkout → 503 `CHECKOUT_DISABLED` | pass | pass | pass |
| Webhook rejects missing / wrong-secret / tampered signature → 400 | pass | pass | pass |
| Paid webhook = subtotal → 1 dry-run order, duplicate ignored, 0 Printify writes | pass | pass | pass |
| BLOCKER B1: paid amount incl. shipping accepted (expected to fail) | fails as expected | fails as expected | fails as expected |

Also run: `tests/e2e/shop-v2.spec.ts` 6/6 pass, `npx vitest run` 188 passed / 3 skipped, `npx tsc --noEmit` clean.

## Go-live checklist (in order; each item needs evidence)

1. [ ] **Rubin:** restore `printme-ai` in Supabase, and decide on the plan (see decisions).
2. [ ] Agent: read-only schema audit of the restored DB (`scripts/verify-supabase-schema.mjs`, `pg_policies`); write a reconciled migration plan.
3. [ ] Agent: fix B1 and B3 in a PR, with tests at subtotal, subtotal+shipping and subtotal+shipping+tax. (B1 and B3: fixed on `integration/checkout-b1-b3`, PR open, not merged.)
4. [ ] **Rubin:** approve and apply the reviewed migrations, after a backup.
5. [ ] **Rubin (Stripe dashboard):** confirm PrintMe account public details, enable Stripe Tax for physical goods, and register a **test-mode** webhook endpoint for `checkout.session.completed` + `checkout.session.async_payment_succeeded`. Put its signing secret in Vercel preview.
6. [ ] **Rubin:** set up Resend (verified sender domain) and add `RESEND_API_KEY`, `TRANSACTIONAL_FROM_EMAIL`, `SUPPORT_EMAIL`, `COMMERCE_OPERATIONS_SECRET`, `ADMIN_EMAILS`, `PRINTIFY_WEBHOOK_SECRET`.
7. [ ] Preview only: `COMMERCE_CHECKOUT_ENABLED=true`, `COMMERCE_PERSISTENCE_ENABLED=true`, `STRIPE_MODE=test`, `PRINTIFY_FULFILLMENT_MODE=draft`. Run one Stripe **test-card** order end to end: one paid order row, one webhook event processed, a confirmation email delivered, one Printify **draft** (not submitted), amounts matching to the cent.
8. [ ] Agent: run the full Playwright suite plus this spec on preview; collect screenshots and logs.
9. [ ] **Rubin:** order one physical sample through the draft; check print quality and the actual shipping cost.
10. [ ] **Rubin:** live switch. Register a live webhook endpoint with the live secret, then set `STRIPE_MODE=live`, `sk_live_` key, `STRIPE_LIVE_RELEASE_APPROVED=true`, both commerce flags, and Printify mode `draft` (manual release) for the first orders.
11. [ ] Remove stale `PRINTIFY_AUTO_SUBMIT_LIVE_ORDERS` / `PRINTIFY_CREATE_DRAFT_IN_LIVE_MODE`, or wire them into code.

## Decisions for Rubin

- **Go or no-go on fall sales.** Halloween is Oct 31. Even with fast decisions, steps 1–9 above need roughly several working sessions plus sample shipping time (inference). A Halloween live launch looks unrealistic. Thanksgiving/holiday is plausible.
- **Restore the database** (free; it was auto-paused for inactivity). On the free plan it will pause again after about a week idle. Upgrade to Pro (about $25/mo) if checkout goes live; a store DB can't pause.
- **Approve the B1/B3 fix PR** (agent work, no prod change).
- **Stripe:** confirm which account and key mode `STRIPE_SECRET_KEY` holds, and turn on Stripe Tax.
- **Email provider:** Resend (the code is written for it) and sender domain.
- **Fulfillment policy:** manual review of Printify drafts for the first N orders (recommended).
