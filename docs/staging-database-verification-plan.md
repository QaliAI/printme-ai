# Staging Database Verification Plan & Migration Rollback Guide

This document records the official staging database verification, migration hashes, RLS policy enforcement, and rollback instructions for PrintMe.ai.

> [!CAUTION]
> Production database migrations remain strictly prohibited until explicit manual release gates pass.

---

## 1. Migration Sequence & Hashes

The following migrations must be applied sequentially to the staging database:

| Order | Migration File | SHA-256 Hash | Key Responsibilities |
|---|---|---|---|
| 1 | `002_add_cart_configuration_snapshot.sql` | `299979660180dfa584ed7055e0bb0505b3d219f1e7c4d2ff55c885ae8c5e81c4` | Adds `guest_token_hash`, `configuration_snapshot`, `configuration_hash`, `snapshot_schema_version`, and `snapshot_created_at`. Enforces immutable order snapshots. |
| 2 | `002_add_cart_items_rls_policies.sql` | `138a87ddb1bd5debb4095baa35ff1130a7d9423fb58139a5a614101fe1f2778f` | Enables RLS on `cart_items` and restricts access to cart owners. |
| 3 | `003_add_curated_catalog.sql` | `c0a81ee8c06380fbc3e362586f248ed0f7ec4691b7f185e4cfb73f0cfca3eb7b` | Creates approved products, variants, and provider tables. |
| 4 | `003_add_orders_stripe_session_id_unique.sql` | `5d2ff5b72b0180d7d6293622a5b35d1cdf6d93147a3b48c45ad10c078e87b914` | Adds unique index on `orders(stripe_session_id)` for webhook idempotency. |
| 5 | `004_add_curated_designs.sql` | `19064f23629357e17845423c99ba22db01590bb3a322b58a0a4d30f1e60109e2` | Creates curated design catalog and asset relations. |
| 6 | `004_adjust_orders_status_and_columns.sql` | `5af76beec41960fb05d412678b38ae630a238cd14725339d4873c85322eb15f2` | Adds `error_message`, `order_number`, and updates `orders.status` constraints. |
| 7 | `005_add_secure_checkout.sql` | `d91087ef763d13674ff6ad46472f32f5198906c91411cd09f9d231dab0e375e7` | Adds secure checkout sessions, shipping quote snapshot, and idempotency key locks. |
| 8 | `005_create_analytics_events.sql` | `14aba935ebdd488dac43d801c86efa2690106503f6bae18cb295c8d4638c79a9` | Creates analytics events tracking table with server-side insert policy. |
| 9 | `006_add_fulfillment_jobs.sql` | `0d227d21b24eaf27d8d591fbe46e0bcec30c0375aa4579bf864ffae6f56a02a7` | Creates fulfillment job queue, lock tokens, and state transition constraints. |
| 10 | `006_make_user_id_nullable_for_guests.sql` | `f5b1bcb233a7865cb0664698643d15b34aba0a41dfa0c3fbd782c26a9654fed1` | Makes `user_id` nullable on `carts` and `orders` for guest checkout support. |
| 11 | `007_harden_commerce_webhooks.sql` | `aee54fb802a940f57b5bcacfe1fd14b08fedf67b8f8d1279cedce0befcc69c2c` | Hardens webhook event log table, HMAC verification log, and deduplication index. |
| 12 | `008_unify_design_pipeline.sql` | `e9b01b43ee3b4a45f2d6c35ff5eec615c105cd11b3beafd49fce2b7b969acd91` | Unifies design assets, production asset URLs, and design versioning. |
| 13 | `009_add_printme_studio.sql` | `207ab938842c65518c03f746acf653f95450aa6775559d0d2410c3f644163497` | Creates Studio design draft tables, publishing workflow, and admin authorization. |

---

## 2. Staging Database Feature Verifications

### A. RLS Policies
- `cart_items` table RLS enabled: `auth.uid() = carts.user_id`.
- Guest carts use `guest_token_hash` index for stateless guest cart restoration.
- Service role bypasses RLS for server-side order fulfillment and webhooks.

### B. Guest Cart Restoration
- Guest sessions generate a 256-bit cryptographically random token stored in HTTP-only cookie.
- Server computes `SHA-256(guestToken)` to query and restore `carts` where `guest_token_hash = hash`.
- User login merges guest cart items into authenticated user cart atomically.

### C. Immutable Order Snapshots
- `order_items` table includes `configuration_snapshot` JSONB.
- Trigger `prevent_order_configuration_snapshot_mutation` rejects any `UPDATE` to `configuration_snapshot` on existing order items.
- Order totals, item configurations, placement coordinates, and prices are frozen at checkout creation time.

### D. Webhook Event Deduplication
- `commerce_webhook_events` table contains `UNIQUE (source, event_id)`.
- Concurrent or duplicate Stripe/Printify webhooks return HTTP 200 without re-processing or duplicating order status transitions.

### E. Fulfillment Locks
- `fulfillment_jobs` table includes `lock_token UUID`, `locked_at TIMESTAMPTZ`, and `status`.
- Deterministic state machine enforces monotonic transitions: `pending -> preparing -> draft_created -> manual_review -> submitted -> completed`.

### F. Studio Authorization
- `studio_designs` table checks `auth.jwt() ->> 'role' = 'studio_admin'`.
- Access to `/studio` routes requires valid studio authorization secret or authenticated admin token.

---

## 3. Rollback Instructions

If a rollback is required in the staging environment, apply the corresponding inverse SQL statements:

```sql
-- Rollback 009: PrintMe Studio
DROP TABLE IF EXISTS studio_design_drafts CASCADE;
DROP TABLE IF EXISTS studio_designs CASCADE;

-- Rollback 008: Unified Design Pipeline
ALTER TABLE design_assets DROP COLUMN IF EXISTS production_asset_url;

-- Rollback 007: Webhooks Hardening
DROP TABLE IF EXISTS commerce_webhook_events CASCADE;

-- Rollback 006: Fulfillment Jobs & Nullable User ID
DROP TABLE IF EXISTS fulfillment_jobs CASCADE;

-- Rollback 005: Secure Checkout & Analytics Events
DROP TABLE IF EXISTS checkout_sessions CASCADE;
DROP TABLE IF EXISTS analytics_events CASCADE;

-- Rollback 004: Curated Designs & Orders Status
DROP TABLE IF EXISTS curated_designs CASCADE;

-- Rollback 003: Unique Index & Catalog
DROP INDEX IF EXISTS idx_orders_stripe_session_id_unique;
DROP TABLE IF EXISTS curated_catalog CASCADE;

-- Rollback 002: Cart Snapshot & RLS
DROP TRIGGER IF EXISTS prevent_order_configuration_snapshot_mutation ON order_items;
DROP FUNCTION IF EXISTS order_items_configuration_snapshot_immutable();
ALTER TABLE cart_items DISABLE ROW LEVEL SECURITY;
```
