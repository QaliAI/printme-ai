# Pets portrait generation: operational contract

The public Pets page and local photo/style draft work independently of paid generation and commerce. **Generation defaults off and is hard-disabled whenever NODE_ENV or VERCEL_ENV is production, even with every flag and secret present. Digital purchases/downloads remain unavailable.** No OpenAI generation request, hosted database write, paid credit expenditure, production migration, checkout activation or Printify request was performed for this implementation. Tests use synthetic images, injected transport/provider mocks and local PGlite.

## Activation dependencies

Production activation requires a new reviewed code change replacing the hard-disable with proven provider cost controls; changing environment flags alone cannot enable it. The current reservation ceiling is a merchant estimate, not a provider-enforced billing cap. Before any separately authorized, non-production development experiment, every dependency must be verified and its evidence recorded:

1. Separately authorize, rehearse and apply optional `migrations/017_pets_portraits.sql`. It does not require commerce 015 or 016. This release does **not** apply it. Verify service-role RPC execution and denied anonymous/authenticated access. Rehearse concurrent requests through separate PostgreSQL connections; PGlite tests use one connection and cannot prove hosted lock behavior.
2. Verify the existing `user-uploads` bucket is private, has appropriate access policies and supports service-role upload/signing. Readiness explicitly checks `public === false`. Confirm no public-object policy, CDN cache or alternate API exposes `pets/*/original.png`.
3. Verify the exact OpenAI account, edit model, output settings and worst-case charge for four bounded input photos plus one high-quality 1024×1536 PNG. Costs are **unknown until this is done**. `PETS_MAX_GENERATION_COST_CENTS` must be a conservative upper bound per admitted provider operation, including its full input/output usage. It is not a measured price or a provider billing cap. Record model/pricing/date, verify the estimate against usage, configure a provider-side account/project budget where available, and set a deliberately small daily exposure. A model/pricing change requires reviewing that ceiling again. Do not enable when costs cannot be bounded.
4. Configure server-only variables in the separately approved target environment. No variables were changed by this implementation:

| Variable | Required behavior |
|---|---|
| `PETS_GENERATION_ENABLED` | Literal `true` only after approval in non-production development; absent/false disables paid generation. Production always remains disabled by code. |
| `PETS_DAILY_BUDGET_CENTS` | Positive integer daily aggregate reservation limit in UTC. No default price/budget. |
| `PETS_MAX_GENERATION_COST_CENTS` | Positive reviewed per-request worst-case cost reservation; cannot exceed daily budget. No fabricated fallback. |
| `PETS_QUOTA_SECRET` | At least 32 characters of separate server-only random secret; HMACs IPs. Keep stable during a budget day and rotate deliberately. |
| `PETS_OWNER_DAILY_LIMIT` | Positive integer; defaults to 3 per authenticated user or anonymous browser session. |
| `PETS_IP_DAILY_LIMIT` | Positive integer; defaults to 10 across browser sessions sharing the incoming IP. |
| `PETS_GLOBAL_DAILY_LIMIT` | Positive integer; defaults to 100, additionally constrained by monetary budget. |
| `OPENAI_API_KEY` | Correct approved account; never browser-visible. |
| `AI_PROVIDER` | Absent (existing OpenAI default) or `openai`; mock production generation is rejected. |
| `OPENAI_IMAGE_EDIT_MODEL` | Existing provider's approved model, default `gpt-image-2.5-sunburst`; review costs before changing. |
| Supabase URL/service-role key | Existing server configuration; never expose service role to the browser. |

5. Run an explicitly authorized, budgeted staging generation and prove identity preservation, multiple subjects, watermark, private originals, quota, request replay, lost acknowledgement and storage/provider failures. Test-data consent and retention policy must be agreed before sending customer photographs. No real generation is substituted for these checks by synthetic tests.
6. Monitor ledger state and actual provider billing. Assign an operator before enabling unattended generation. The ledger reserves a configured ceiling; it cannot discover hidden pricing changes or external usage under the same provider account. Keep customer payment collection separately disabled until commerce gates pass.

## HTTP interface

- `GET /api/pets/readiness` returns `{enabled, reason}` and establishes a random HttpOnly/SameSite=Lax cookie. Readiness checks configuration, ledger version and private-bucket metadata without generating an image. It is not proof of account balance, current pricing or image quality.
- `POST /api/pets/generations` requires same origin, JSON and a body under 3,100,000 bytes, including streamed bodies. Input: `{requestId: UUID, styleId, subjectCount: 1..4, petName?, caption?, references:[{dataUrl, role:'pet'|'person', label?}]}`. At least one pet reference is required, and subject count must equal reference count. A reference is JPEG/PNG/WebP data, at most 750,000 characters, decoded/checked server-side as a still image with each dimension 256–1536. Maximum four references. No remote source URLs are accepted by this route.
- A successful generation or safe idempotent lookup returns `{jobId,status,previewUrl?,downloadAvailable:false}`. Completed is HTTP 200; reserved/uncertain/failed states return HTTP 202. The client retains the same request ID and job ID. Unknown outcomes are holds, not automatic rerolls. Known database/admission/unavailable errors return an explicit HTTP error before provider admission.
- `GET /api/pets/generations/{jobId}` returns owner-scoped status and the preview route only. Missing and unowned records are indistinguishable. Cookie identity is hashed; a valid Supabase bearer identity uses the authenticated user instead. The anonymous cookie is a bearer capability: losing it loses anonymous job access. Existing output is accessible with generation disabled if its storage/ledger remain available.
- `GET /api/pets/generations/{jobId}/preview` verifies owner and completed state, then signs **only** the canonical watermarked preview for 600 seconds. The redirect is private/no-store with no-referrer. A preview link can be shared until it expires; it is not an unwatermarked entitlement.
- `GET /api/pets/generations/{jobId}/download` always denies with `DIGITAL_PURCHASE_UNAVAILABLE` (403). No caller-supplied order ID/job ID/client paid flag grants a license. Existing physical merchandise checkout is not a digital entitlement ledger.

## Reservation and failure behavior

Migration 017 stores owner/IP/request hashes, UTC budget day, reserved cost, provider request ID, output paths and status. It stores no raw photos, image data URLs, names, captions, email addresses or raw IP addresses. The RPC takes an idempotency advisory lock and a day-wide budget advisory lock before admitting any new request. It checks owner, IP, global count and aggregate cost atomically across server workers. Only the RPC may admit/finish jobs; anonymous/authenticated roles have neither RPC execution nor table access.

The same owner/request ID with the same request hash returns the existing job and **never** calls the provider again. A changed payload with the same request ID is a conflict. A reserved job older than five minutes becomes uncertain on idempotent lookup; it is never automatically reclaimed. All failed/uncertain requests retain the entire monetary reservation and quota count for that UTC day. There is no automatic credit refund or retry API.

The existing OpenAI provider performs one ordered multi-reference edit with `n=1`, opaque background and 1024×1536 output. It retries only explicit short rate-limit responses under its existing behavior. Timeout, network, 5xx, malformed output, storage failure and acknowledgement loss are never automatically reissued. Its output is stored privately at `pets/{jobId}/original.png`; Sharp renders a reduced preview with repeated visible watermark text and footer at `pets/{jobId}/preview.png`. Originals are never signed by the Pets implementation. It strips image metadata when rendering preview; original upload files are not persisted by the Pets request itself.

Completion commits before returning a preview. If its acknowledgement is lost, the service reads the same owner-scoped job: committed completion can be recovered; otherwise it returns the known job ID on an uncertain hold. The database never changes a completed row to uncertain after acknowledgement loss. It does not allow a failed/uncertain row to trigger another paid render.

## Operator reconciliation and retention limits

Keep generation off while investigating unusual spend or repeated uncertain jobs. Inspect the specific job ID, timestamps, reserved cost and provider request ID using authorized service-role tooling. Match provider usage and private storage paths without publishing original URLs or putting customer images in logs/analytics. A missing provider request ID does **not** prove that no generation was charged. Examine both canonical storage objects: an original without a preview or completed ledger acknowledgement needs explicit reconciliation.

Do not clear a reservation, create a new job for the same work, automatically regenerate, or repeatedly upload with overwrite as a recovery shortcut. This implementation provides **no automatic manual-recovery or credit-release endpoint**. A reviewed operator procedure must determine the actual provider outcome, approve any ledger correction and preserve evidence before making a write. Do not run generic SQL updates against production as part of deploying this page.

There is **no automatic retention/deletion scheduler** in this release. Browser draft deletion removes local saved photo assets; it does not erase already submitted provider data, ledger rows or private output objects. Before activation, define customer consent/privacy notices, provider retention controls, image/object lifetime, deletion request verification and ledger retention. A trusted cleanup workflow must remove canonical objects only after ownership/order/legal retention review. Do not advertise automatic server deletion or anonymous account recovery that has not been built.

Digital delivery requires a future server-owned entitlement relation connecting the owner, exact asset/version and verified paid order, with refund/dispute holds checked at download time. Until it exists and is verified, purchases/downloads remain unavailable. Physical fulfillment must receive only an approved unwatermarked production asset through the existing paid-order architecture; free previews are never Printify production assets.
