# Sprint 1 Results

_Completed on 2026-07-29 on `feature/commerce-foundation-sprint-1`. No deployment, merge, remote migration, production-record change, or live Printify mutation was performed._

## Outcome

Sprint 1 delivers a disabled-by-default `/shop-v2` vertical slice:

`curated design -> recommended product -> proportional instant preview -> switch product -> exact configuration in local cart drawer`

The live homepage and existing checkout UI are unchanged. The route is server-gated by `NEXT_PUBLIC_COMMERCE_V2_ENABLED=true`; `.env.example` defaults it to `false`.

## Architecture findings

- The application is Next.js 16.2.6 App Router with React 19.2.4, TypeScript 5, Tailwind 4, Supabase, Stripe, Cloudinary, and Printify.
- The existing Supabase cart stores relational IDs and quantity but cannot preserve an immutable design/product/provider/variant/placement/preview/price snapshot.
- Checked-in SQL and application queries have material schema drift, so the remote schema cannot safely be inferred from this repository.
- Existing Stripe fulfillment creates a local order and then attempts Printify submission, but its payload and local identifiers do not satisfy the documented existing-product order contract.
- The new commerce slice is isolated under `/shop-v2`; it does not load from the live homepage while the feature is disabled.

Full findings are in `PRINTME_CURRENT_ARCHITECTURE.md`.

## Printify integration findings and result

The former client used incorrect or incomplete endpoint shapes, including shop validation, catalog retrieval, provider/variant scope, `.json` suffixes, order submission, and production transition. It also lacked a required `User-Agent`, runtime response validation, timeouts, structured errors, rate-limit handling, and an explicit server-only boundary.

The replacement adapter:

- uses the current documented v1 paths for shops, blueprints, provider-specific variants, shipping, uploads, products/mockups, orders, and `send_to_production`;
- sends `Authorization` and the required `User-Agent`;
- validates request and response boundaries with Zod;
- distinguishes blueprint, provider, variant, placeholder/position, decoration method, upload, product/mockup, and order concepts;
- times out requests, returns structured errors, honors `Retry-After`, and applies limited backoff only to idempotent GET requests;
- never automatically retries product or order creation;
- is protected by `server-only`.

The official Printify reference was rechecked on 2026-07-29. It still supports v1, while recommending v2 for new features. Sprint 1 retains v1 because the required shops, catalog, upload, product, and order surface is fully documented there and the existing integration is v1-based.

Detailed defects and endpoint mappings are in `PRINTIFY_INTEGRATION_AUDIT.md`.

## Commerce, preview, and cart result

- Canonical models cover `DesignAsset`, `CuratedDesign`, `MerchProduct`, `ProductProvider`, `ProductVariant`, `PrintPlacement`, `PreviewTemplate`, `ProductConfiguration`, and `CartConfigurationSnapshot`.
- `ProductConfiguration` preserves the design/version/asset, merchandising and Printify IDs, position and decoration method, normalized placement, selected color/size, template/view, instant preview render state, optional official mockup, and money fields.
- A renderer adapter and deterministic instant 2D renderer support one authored poster template and one front-facing apparel template.
- Artwork dimensions always derive from the source aspect ratio. Contain/cover, normalized placement, scale, rotation, safe-zone status, and compatible/incompatible product switching are deterministic.
- Five local curated designs open a mobile-first configurator with two products, variants, price, preview, and add-to-cart.
- The isolated versioned local-storage cart retains the complete configuration snapshot and supports edit/remove without silently dropping placement data.

## Verification

### Baseline on untouched `master`

| Command | Exact result |
| --- | --- |
| `npm ci` | Passed; 410 packages installed; audit reported 6 vulnerabilities (1 low, 5 high). |
| `npm run lint` | Failed with 63 findings: 35 errors and 28 warnings. |
| `npx tsc --noEmit` | Passed. |
| `npm run build` | Passed; 30 routes generated, with the pre-existing multiple-lockfile workspace-root warning. |
| `npm test` | Failed because no `test` script existed. |

### Final branch

| Command | Exact result |
| --- | --- |
| `npm ci` | Passed: 446 packages added and 447 audited; 6 vulnerabilities reported (1 low, 5 high), plus optional WASM peer-resolution warnings. |
| `npm test` | Passed: 4 files passed, 1 skipped; 22 tests passed, 1 skipped. The skipped test is the explicitly gated read-only live smoke test. |
| `npm run test:e2e` | Passed: 1 mobile Chromium test at 375 x 812. |
| `npm run typecheck` | Passed with no TypeScript errors. |
| `npm run lint` | Passed with 0 errors and 23 warnings. The remaining warnings are pre-existing image, hook-dependency, and unused-symbol warnings. |
| `npm run build` | Passed; 31 routes generated. The pre-existing multiple-lockfile workspace-root warning remains. |
| `npm start` plus `GET /shop-v2` with the flag absent | Passed: returned HTTP 404, confirming disabled-by-default behavior. |

Next.js 16.2.6 does not print per-route byte sizes in its default build summary. The measurable route impact is one additional static route (`/shop-v2`, 30 to 31 total routes). The homepage does not import the Shop V2 fixture, renderer, or cart modules.

## Test coverage

- Placement math: square, portrait, landscape, transparent PNG, oversized, undersized, centered, moved, scaled, rotated, contain, cover, and safe-zone behavior.
- Configuration: compatible placement preservation, explicit incompatible default, render-key update, and exact local-cart round trip.
- Printify fixtures/contracts: shops, blueprints, providers, variants/placeholders, shipping, upload, product/mockup, and order response validation.
- Printify transport: exact paths, headers, 429/`Retry-After`, safe GET retry, no mutation retry, and malformed-response errors.
- Optional live smoke: shop listing and configured-shop validation only when `PRINTIFY_LIVE_SMOKE_TEST=true`.
- Browser flow at 375 pixels: browse, configure, switch poster to tee, preview update, add to bag, and verify the exact configuration plus edit/remove controls.

## Visual result

At 375 x 812, the configurator becomes a bottom-sheet layout with a prominent preview, horizontally reachable product/format controls, and a sticky footer that keeps the current price and primary action visible. The cart drawer shows the configured tee preview, design, product, color, size, quantity, price, full placement snapshot, edit, and remove controls.

At 1440 x 1000, the same configurator uses a centered two-column dialog: the large authored preview is on the left and product, variant, placement, price, and action controls are on the right. Browser inspection reported no console errors; the only warning was the pre-existing duplicate Supabase GoTrue client warning.

## Migration proposed but not executed

`migrations/002_add_cart_configuration_snapshot.sql` additively proposes nullable `configuration_snapshot JSONB` columns on `cart_items` and `order_items`. Existing rows and writers remain valid. The file contains rollback statements that drop only those columns.

The migration was not run locally or remotely. Production adoption requires confirming the actual remote schema, copying the validated cart snapshot into an immutable order snapshot at checkout, and revalidating catalog availability and price server-side.

## Known limitations

- Fixtures are prototype merchandising data, not a claim that provider, variant, price, or shipping data is currently available.
- Instant previews are authored 2D composites, not official Printify mockups or fabric-displacement renders.
- Local storage is not cross-device, multi-user, or checkout-safe.
- `/shop-v2` intentionally cannot create a Printify product/order, send an order to production, or check out.
- Existing Stripe-to-Printify fulfillment remains a production blocker: it uses local IDs, incomplete address data, and a legacy payload shape. The typed adapter rejects that invalid payload before a mutation.
- The existing Printify webhook lacks verified authenticity and idempotency.
- The live read-only Printify smoke test was not enabled because live credentials and explicit authorization were not part of the test run.
- The repository still has 23 non-blocking lint warnings and the multiple-lockfile Next.js workspace-root warning.

## Prioritized Sprint 2 backlog

1. Reconcile the real Supabase schema, review and run the additive snapshot migration through the approved migration process, and add a server-side persistent cart adapter.
2. Rebuild paid-order fulfillment around an existing Printify product ID and provider variant ID, validated postal data, idempotent webhook processing, manual production approval, and failure reconciliation.
3. Add server-side live catalog/price/availability/shipping validation and a controlled official-mockup lifecycle.
4. Authenticate and deduplicate Stripe and Printify webhook events; add replay and partial-failure tests.
5. Connect the exact persisted configuration to checkout and copy it immutably to `order_items`.
6. Add dialog focus trapping/restoration and broader keyboard/screen-reader browser coverage.
7. Resolve the remaining lint warnings, duplicate Supabase browser client warning, and Next.js workspace-root configuration warning.
8. Evaluate advanced authored masks or WebGL only for products that cannot meet acceptance criteria with the 2D adapter.

## Files changed

Environment, tooling, and documentation:

- `.env.example`
- `.gitignore`
- `package.json`
- `package-lock.json`
- `playwright.config.ts`
- `vitest.config.ts`
- `docs/PRINTIFY_INTEGRATION_AUDIT.md`
- `docs/PRINTME_CURRENT_ARCHITECTURE.md`
- `docs/SPRINT_1_PLAN.md`
- `docs/SPRINT_1_RISKS_AND_DECISIONS.md`
- `docs/SPRINT_1_RESULTS.md`

Commerce, Printify, and review route:

- `app/api/printify/mockups/route.ts`
- `app/shop-v2/page.tsx`
- `app/shop-v2/ShopV2Experience.tsx`
- `app/shop-v2/shop-v2.module.css`
- `components/commerce/InstantPreview.tsx`
- `lib/commerce/fixtures.ts`
- `lib/commerce/local-cart.ts`
- `lib/commerce/placement.ts`
- `lib/commerce/templates.ts`
- `lib/commerce/types.ts`
- `lib/printify/client.ts`
- `migrations/002_add_cart_configuration_snapshot.sql`
- `public/shop-v2/poster-base.svg`
- `public/shop-v2/poster-shadow.svg`
- `public/shop-v2/tee-base.svg`
- `public/shop-v2/tee-highlight.svg`
- `public/shop-v2/tee-mask.svg`
- `public/shop-v2/tee-shadow.svg`

Test coverage and fixtures:

- `tests/commerce/configuration.test.ts`
- `tests/commerce/placement.test.ts`
- `tests/e2e/shop-v2.spec.ts`
- `tests/fixtures/printify/blueprints.json`
- `tests/fixtures/printify/order.json`
- `tests/fixtures/printify/product.json`
- `tests/fixtures/printify/providers.json`
- `tests/fixtures/printify/shipping.json`
- `tests/fixtures/printify/shops.json`
- `tests/fixtures/printify/upload.json`
- `tests/fixtures/printify/variants.json`
- `tests/printify/client.test.ts`
- `tests/printify/contracts.test.ts`
- `tests/printify/live-smoke.test.ts`
- `tests/setup/server-only.ts`

Bounded baseline lint fixes:

- `app/admin/designs/page.tsx`
- `app/admin/orders/page.tsx`
- `app/admin/page.tsx`
- `app/admin/products/page.tsx`
- `app/admin/styles/page.tsx`
- `app/api/cart/add-items/route.ts`
- `app/api/webhooks/stripe/route.ts`
- `app/app/designs/page.tsx`
- `app/app/orders/page.tsx`
- `app/auth/signin/page.tsx`
- `app/auth/signup/page.tsx`
- `app/auth/verify-email/page.tsx`
- `components/Input.tsx`
- `lib/types.ts`
