# Printify Integration Audit

_Verified against the official [Printify API reference](https://developers.printify.com/) on 2026-07-29._

## Documented relationships

A catalog product is a **blueprint**. A blueprint is fulfilled by one or more **print providers**. A provider exposes its own **variants**, printable **placeholders/positions**, prices, and decoration methods. An uploaded artwork becomes an **uploaded image**. A merchant **product** binds blueprint, provider, variants, print areas, and image placement. Product `images` are the official mockup URLs. An **order** references an existing merchant product and provider variant.

Printify documents normalized placement with the placeholder center at `x=0.5`, `y=0.5`, and image width expressed as scale relative to the placeholder width.

## Required v1 endpoint shapes

| Capability | Documented endpoint |
| --- | --- |
| List shops | `GET /v1/shops.json` |
| List blueprints | `GET /v1/catalog/blueprints.json` |
| Retrieve blueprint | `GET /v1/catalog/blueprints/{blueprint_id}.json` |
| Blueprint providers | `GET /v1/catalog/blueprints/{blueprint_id}/print_providers.json` |
| Provider variants/placeholders | `GET /v1/catalog/blueprints/{blueprint_id}/print_providers/{print_provider_id}/variants.json` |
| Provider shipping | `GET /v1/catalog/blueprints/{blueprint_id}/print_providers/{print_provider_id}/shipping.json` |
| Upload image | `POST /v1/uploads/images.json` |
| Create merchant product | `POST /v1/shops/{shop_id}/products.json` |
| Retrieve product/mockups | `GET /v1/shops/{shop_id}/products/{product_id}.json` |
| Create existing-product order | `POST /v1/shops/{shop_id}/orders.json` |
| Send order to production | `POST /v1/shops/{shop_id}/orders/{order_id}/send_to_production.json` |

All requests must send a `User-Agent`. Current documented limits are 600 requests/minute globally and 100 requests/minute for catalog endpoints; a 429 response indicates rate limiting.

## Defects found

### `lib/printify/client.ts`

- `GET /shops/{shopId}` is not the documented shop validation shape; validation must list `/shops.json` and match the configured ID.
- `/catalog/products?limit=...&offset=...` is not the blueprint endpoint.
- Blueprint retrieval omits `.json`.
- Variant retrieval omits both provider scope and `.json`.
- Order creation omits `.json`.
- `/orders/{id}/confirm` is undocumented; the production transition is `/send_to_production.json`.
- The shipping method is modeled as an order GET, while catalog shipping and order shipping calculation are different documented resources.
- Request/response boundaries are untyped, use broad `any`, and are not validated.
- No `User-Agent`, timeout, structured error, 429 handling, retry policy, or backoff exists.
- The module can be imported by client code because it lacks an explicit server-only guard.

### `app/api/printify/mockups/route.ts`

- Reimplements authenticated transport rather than using the shared client.
- Omits `User-Agent`, timeouts, schema validation, rate-limit handling, and safe GET retries.
- Picks the first provider and first variant without checking availability, placeholder position, or decoration compatibility.
- Hardcodes `front`.
- Creates up to eight merchant draft products concurrently on every uncached request, increasing catalog pollution and rate-limit risk.
- Fire-and-forget cache writes/cleanup are not guaranteed to complete in a serverless runtime.
- Returns upstream error text to callers through `details`.

### Stripe webhook fulfillment

- The existing payload uses `recipient`, `variant_ids`, and `files`; the documented existing-product order uses `address_to`, singular `variant_id`, and an actual Printify `product_id`.
- It passes local Supabase UUIDs as Printify product/variant identifiers.
- Required postal fields are sent as empty strings.
- `submitOrder` immediately attempts an undocumented confirm call.
- Printify failures are swallowed after the local order is created, leaving manual reconciliation as an undocumented operational requirement.

### Other risks

- The Printify webhook does not implement authenticated verification.
- Helper scripts duplicate transport and one script reports token length. No Sprint 1 test will execute those scripts.
- Existing cached mockup records do not preserve provider, variant, placement, template/view, price, or design-version data.

## Sprint 1 decision

Replace the shared client with a typed Zod-validated server adapter. Keep mutation methods available but never call product creation, order creation, or production submission from `/shop-v2`. Refactor the existing mockup route to the new adapter without changing its public response contract. Add fixture contracts and an explicitly gated, read-only smoke test that lists and validates shops only when `PRINTIFY_LIVE_SMOKE_TEST=true`.
