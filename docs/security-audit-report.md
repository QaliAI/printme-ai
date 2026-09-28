# Security & Dependency Audit Report

This report documents the security posture, dependency audit, secret scanning, security headers, and endpoint rate limiting for PrintMe.ai.

> [!IMPORTANT]
> All server-only modules have been verified with `import 'server-only'`. Zero production secrets exist in source tree or commit history.

---

## 1. Dependency Audit (Production vs Development Scopes)

- **Production Scope (`npm audit --omit=dev`)**:
  - Direct Dependencies: **0 Vulnerabilities**.
  - Transitive Dependencies: 3 High severity advisories in `postcss` and `sharp` bundled within `next@16.2.12`.
  - **Action / Decision**: `npm audit fix --force` was **NOT** executed because it would attempt a breaking downgrade of Next.js to 9.3.3.
  - **Accepted Residual Risk**: Transitive advisories in `postcss` and `sharp` apply to CSS stringification and local image processing in dev/build environments, not exposed to remote unauthenticated code execution in the production runtime.

- **Development Scope**:
  - Safe dependencies updated via `npm audit fix` without `--force`.

---

## 2. Server-Only Module Protection

The following backend commerce modules are protected with `import 'server-only'` to prevent leaking business logic or secret keys to client bundles:
- `lib/printify/client.ts`
- `lib/commerce/catalog/catalog-service.ts`
- `lib/commerce/catalog/approved-catalog.ts`
- `lib/commerce/checkout/stripe-gateway.ts`
- `lib/commerce/checkout/stripe-webhook.ts`
- `lib/commerce/fulfillment/service.ts`
- `lib/commerce/fulfillment/payload.ts`
- `lib/commerce/fulfillment/printify-gateway.ts`
- `lib/commerce/fulfillment/supabase-store.ts`
- `lib/commerce/pricing-engine.ts`
- `lib/commerce/shipping-quote.ts`
- `lib/commerce/operations-reconciliation.ts`
- `lib/commerce/operations-auth.ts`

---

## 3. Secret Scanning Audit

- **Tree & History Scan**: Scanned source files, `.env.example`, and git commit history.
- **Result**: Zero exposed production Stripe secret keys (`sk_live_`), Printify API tokens, or Supabase service role keys in repository code or commits.
- **Configured Secrets**: Managed via environment variables (`.env.local` / Vercel Environment Variables).

---

## 4. HTTP Security Headers

Configured in `next.config.ts`:
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Strict-Transport-Security: max-age=31536000; includeSubDomains`
- `X-XSS-Protection: 1; mode=block`

---

## 5. Upload Validation & SVG Sanitization

- File upload endpoints validate MIME types (`image/png`, `image/jpeg`, `image/webp`, `image/svg+xml`).
- Maximum upload size strictly enforced (10MB).
- SVG files sanitized to strip inline `<script>`, `onload`, `javascript:`, and external entity references (`DOCTYPE` / DTD entities) before rendering or storage.

---

## 6. Rate Limiting & Access Protection

- **Catalog APIs**: Governed by `CatalogRequestGate` (max 90 requests per minute).
- **Checkout Endpoints**: Protected with UUID idempotency keys and rate limits.
- **Shipping Quote Endpoints**: Rate-limited per IP/session.
- **Operations & Replay Endpoints**: Require `x-commerce-operations-secret` header verified via `timingSafeEqual`.
