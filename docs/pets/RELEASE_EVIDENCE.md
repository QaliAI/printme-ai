# PrintMe Pets release evidence — 2026-10-22

**Public storefront: GO after green CI and exact-SHA deployment verification. Customer payments and production portrait generation: NO-GO.** The owner authorized merging verified code and deploying `/pets`, while explicitly withholding production database migrations, payment activation and real fulfillment. No provider generation, charge, production database write or Printify order was executed.

## What ships

| Surface | Actual behavior | Verification |
|---|---|---|
| `/pets` | Original cream/ink/pink/yellow storefront; four original labeled portfolio portraits; 24 distinct briefs in eight filterable categories; keyboard photo/portrait comparison; truthful FAQ | Mobile/tablet/desktop browser checks and inspected 360/390/768/1440 screenshots |
| `/pets/create` | Guided style/photo/review/portrait workflow; max four separate pet/person photos; MIME/decode/10 MB/256 px/25 MP guards; local names/caption; actual prepared crop/rotation thumbnails; remove/reorder; private saved draft | Real local JPEG/PNG/WebP browser uploads, corruption/limits, pixel orientation, local restore and no-upload checks |
| Draft recovery/privacy | Reuses existing IndexedDB photo store with Pets keys; seven-day expiry on next visit; explicit deletion; retains photo index on storage/deletion failure so retry remains possible | 18 focused tests, including failure/retry and no network transmission |
| Generated versions/favorites | Local version/favorite recovery; server-owned generation identity retained across response loss; no example substituted for a generated result | Mocked success/failure/uncertain browser cases; no real generation |
| `/pets/keepsakes` | Three real approved products: gallery-poster, keepsake-mug, everyday-tee; existing InstantPreview/placement engine; existing editor links for customer-owned photos | Catalog IDs and previews reviewed; browser routes/screenshots; no ordering claim |
| `/pets/gift` | Local gift brief with occasion/note, save/delete, no recipient email collected or gift sent | Browser route; honest disabled-sale copy; no fake success/checkout |
| `/pets/privacy` | Accurate local photo/draft handling, consent boundary, preview/original distinction and retention limitations | Source/security review |
| Existing site | Pets link near Create in desktop/mobile navigation; compact homepage promotion and footer entry; Unit 001/home hero and existing creator retained | Full existing commerce/browser suite; homepage promotion captures |
| SEO/analytics | Metadata/canonical/social image, public sitemap entries; private creator noindex; existing analytics extended with bounded events/acquisition categories | Type/build, vocabulary/privacy tests; no names/captions/photos/URLs in Pets analytics |

## Integration truth

| Integration | Implemented | Live proof / gate |
|---|---|---|
| OpenAI | Extends the existing provider with 1–4 ordered references, same input validation, one opaque PNG; no uncertain network/5xx retry | **GATED.** Production is disabled in code even if every flag is true. Four reference inputs plus high-quality output have no verified worst-case provider charge yet. No customer-key request occurred. |
| Generation admission | Optional migration 017 serializes owner/IP/global daily quotas and cost reservations; sticky uncertain outcomes and idempotency; status recovery after lost acknowledgement | **LOCAL SQL VERIFIED / HOSTED BLOCKED.** PGlite is one connection; real concurrent PostgreSQL and account-cost proof remain required. 017 is unapplied. |
| Private outputs | Existing private user-uploads bucket; original never signed; Sharp reduced/tiled watermark; owner-scoped preview redirect expires after 600 seconds | **CODE/ROLE POLICY VERIFIED / REAL GENERATION UNVERIFIED.** Hosted policy read confirmed first-folder ownership denies client access to `pets/` originals. No real output uploaded. |
| Digital purchase/download | Download endpoint always denies; no second checkout, fake paid flag or client-side entitlement | **BLOCKED.** Requires a server-owned asset/version entitlement tied to verified payment and refund/dispute holds in existing commerce architecture. |
| Printify | Reuses approved product IDs and shared preview/editor; only poster/mug/tee shown | **GATED.** No provider order submitted. Frames/blankets/ornaments unavailable. Unit/shipping costs and current provider availability remain unverified. |
| Email/gift recovery | Existing commerce outbox retained; gift page only saves locally | **BLOCKED.** Resend configuration, real recipient delivery/retry and a verified gift/recovery lifecycle are incomplete. |
| Stripe | PR #29 merged to master as ff5a39a; compatible production deployment READY; checkout flag explicitly false | **NO-GO FOR PAID ORDERS.** Migrations 015/016, complete event subscriptions/account/tax/shipping/email/ops configuration and real TEST proof remain pending. |

The $19 first digital portrait / $10 additional look figures appear only as explicitly planned prices. They are not an active offer. Existing catalog retail prices are configuration, not a verified contribution margin. Contribution must subtract actual production, shipping subsidy, payment fees, successful/failed generations and included rerolls, support and reprints. Unknown costs remain unknown; no fallback is presented as live economics.

## Validation

| Check | Result |
|---|---|
| `npm run typecheck` | PASS |
| `npm run lint` | PASS; 0 errors / 32 existing warnings |
| `npm test` | PASS; 308 passed / 3 intentional skips; 57 passing files / 2 skipped |
| `npm run build` | PASS; Next.js 16.4.2; Pets routes generated successfully |
| Full `npm run test:e2e -- --workers=3` | PASS; 130 passed / 23 intentional skips, followed by six passing viewport regressions for explicit-style restore and pet-required review. Final CI covers the combined suite. |
| Targeted Pets browser suite | 34 passed / 8 intentional screenshot-project skips before the final six regressions; actual paused readiness 200/false proved |
| `npm audit --omit=dev` | PASS; zero findings. Sharp directly pinned 0.35.5. Full audit retains 8 High / 2 Moderate development-tool findings. |
| `npm run preflight` | **BLOCKED**, exits 1: local Resend key/from/support, operations secret and Printify webhook secret missing. Production inventory additionally lacks ADMIN_EMAILS. Not a live service proof. |
| Real Stripe TEST checkout / provider draft / recipient email / generated portrait | **NOT RUN / BLOCKED** by missing setup and explicit task boundaries |

Browser logs retain image-loading advisories. Existing visual-audit helpers intentionally set image `loading='eager'` before hydration, producing attribute mismatch warnings in those synthetic audits; no warning-free whole-site console is claimed. Production Pets smoke verification must separately check console errors, loaded assets and actual gating without that helper. No snapshot-baseline replacement or blanket warning suppression was added.

## Visual refinement evidence

Initial screenshots were inspected, then the mobile headline/copy spacing was reduced to expose more artwork, a real selected-style example was added to the mobile builder, and crop/rotation thumbnails were changed to show the actual prepared reference pixels. Navigation switches to its existing mobile layout before six desktop links become cramped. Dynamic generation status is announced to assistive technology. Screenshot capture now waits for decoded imagery and resets scroll/focus before capturing.

Committed review captures: [390 before](evidence/before-390.png), [390 after](evidence/after-390.png), [1440 before](evidence/before-1440.png), [1440 after](evidence/after-1440.png), [360 after](evidence/after-360.png), [768 after](evidence/after-768.png). Full local captures also include creator/photo/review at all four widths, gifts/keepsakes and homepage promotion at 390/1440 under `output/pets/review/`. Original asset provenance is in `public/pets/README.md`; competitor evidence/parity is in `COMPETITOR_PARITY.md`.

## Ordered public release and rollback

1. Confirm current master contains PR #29, preserve unrelated untracked/concurrent work, review the final Pets diff, scan for credentials and require exact-head CI green. Prepared 015/016/017 files are **not deployment migrations**.
2. Verify Vercel project `prj_vzSgRBzVFzssleqC4iRg93stQRU3`, team `team_VpYDr3pHOcmyBTvBja4f4hXw`, master target, checkout=false and unchanged provider modes. No environment mutation is part of this public release.
3. Merge the reviewed Pets PR using the expected head SHA under the owner's explicit authorization. Let the existing master deployment run. Confirm Vercel READY and deployed Git SHA exactly match the merge; do not infer success from a merge or HTTP 200 alone.
4. Verify public `/pets`, `/pets/create`, `/pets/keepsakes`, `/pets/gift`, `/pets/privacy`, source assets and sitemap. Inspect actual mobile/desktop render, header/homepage promotion, private local draft and generation status. Readiness must return enabled=false; original download must remain denied. Do not issue a generation/payment/fulfillment request for this smoke check.
5. Record final merge/deployment ID/SHA, public HTTP results and production captures in the PR release evidence and local production report. Customer-paid launch and generation remain separate NO-GO decisions.
6. If the public page has a regression, use the previously READY compatible ff5a39a commerce deployment as the rollback target under release authority. Keep checkout false, persistence/webhooks intact and all financial evidence. Do not restore/drop database tables or weaken protections to roll back a Pets page. Verify the selected rollback SHA before promoting it; no rollback was performed by preparation.

Paid commerce release procedure (backup, migration/security rehearsal, service secrets/account modes, TEST payment/webhook proof, email, manual fulfillment, refunds/disputes, monitoring and rollback) remains in `docs/launch/COMMERCE_RECOVERY_RELEASE_2026-10-22.md`. Generation prerequisites and operator/retention limitations are in `GENERATION_OPERATIONS.md`. Existing unmerged historical studio quality workflow is preserved for separate scoped review, not declared checked or safe to merge.

## Three campaigns prepared for a later verified selling launch

1. **Your pet's debut album:** Fuzz club/Record sleeve before-and-after reels; punk visual identity; `utm_campaign=pets-launch`. During the paused release, CTA is explore/save a brief, never buy.
2. **The gift that gets it:** Pet-parent birthdays and gotcha-days; person+pet art and real approved keepsake formats; `utm_campaign=pets-gifts`. Gift sending and prices require their own verified launch.
3. **Always part of the family:** Gentle remembrance portraits and thoughtful photo guidance; `utm_campaign=pets-memories`. No urgency or fabricated testimonials; purchases only after the paid gates pass.
