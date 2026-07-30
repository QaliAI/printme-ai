# Sprint 1 Risks and Decisions

| Risk | Decision |
| --- | --- |
| Existing cart cannot preserve placement | Use an isolated versioned local-storage cart for `/shop-v2`; propose an additive `configuration_snapshot JSONB` migration with rollback notes. |
| Checked-in SQL does not represent the full remote schema | Do not infer or run remote changes. Keep Sprint 1 persistence local and document the production migration. |
| Existing checkout may create malformed Printify orders | Correct the typed client surface and document the webhook payload defect; do not exercise real checkout or Printify mutations in this sprint. |
| Official mockups require a created Printify product | Sprint 1 instant previews are deterministic local composites. The adapter can retrieve official mockups from an existing product, but `/shop-v2` never creates one. |
| Provider catalog varies over time | Fixtures pin explicit blueprint/provider/variant identifiers as prototype data and are not claims of live availability. Production must validate and refresh them before checkout. |
| Product images do not contain production-grade displacement/masks | Use authored flat 2D templates only. Do not infer fabric displacement from brightness and do not add WebGL. |
| Transparent artwork and product switching can distort placement | Store normalized placement separately from render pixels, always derive dimensions from source aspect ratio, and use explicit compatible-position/default rules. |
| Public feature flag is build-time in Next.js | Default the flag to false in `.env.example`; server-render a not-found response when disabled. A rebuild is required to change a `NEXT_PUBLIC_` value. |
| Existing lint fails repository-wide | Do not hide baseline failures. Fix touched-file errors and, if time permits, the bounded pre-existing blockers required for a green acceptance run. |
| New test tooling increases dependency surface | Add only Vitest and Playwright; no DOM component-test library is needed for this slice. |
| Browser storage is not cross-device or checkout-safe | Version the local payload, validate it on read, and list server persistence plus price/catalog revalidation as Sprint 2 work. |
| Printify rate limiting | Retry only idempotent GET requests, honor `Retry-After`, cap attempts, and never automatically retry product/order creation. |

## Production blockers

- Remote Supabase schema truth is not reproducible from this branch.
- Fixture provider/variant availability and price are not live-validated.
- Existing Stripe-to-Printify fulfillment must be corrected and idempotency-tested before production submission is safe.
- Printify webhook authenticity must be designed from the account’s actual webhook capabilities before trusting fulfillment updates.
