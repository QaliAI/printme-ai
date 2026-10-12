# Mockup incident and canonical preview architecture — 2026-10-11

## Scope and root cause

Canonical checkout: `C:\Users\omino\Documents\printme-ai-live`; repository `QaliAI/printme-ai`; branch `feat/printme-revenue-activation-2026-10-11`; starting HEAD `83da8ee0707275e2ec523227a58be3b0bc5945a3`. No production deployment or merge is part of this repair.

The legacy `product-*.webp` files were finished, preprinted sales samples. They were reused as blank bases in the seasonal generator and in the canonical mug template. The seasonal generator placed new artwork over them with `blend: 'multiply'`, leaving the old bulldog visible. Seasonal cards then displayed those flattened outputs, bypassing runtime product/design resolution. Legacy live-preview fallback code had another independent percentage placement algorithm and misleading official-preview copy. Homepage imagery advertised unsupported products and used unrelated samples with prices separate from the approved catalog.

A second defect affected even clean bases: every template uses an 800 × 800 canvas, but the shared figure had a 4:5 aspect ratio. Its contained base image and percentage artwork coordinates therefore used different vertical geometry. The figure now derives its aspect ratio from the template. Print areas, safe insets, production dimensions, and placement algorithms were preserved.

Visual QA additionally found a tablet hero clipping defect: oversized horizontal controls caused the `overflow: hidden` hero wrapper to scroll horizontally when selecting a product. Controls now stack/wrap at tablet widths; a regression checks that the wrapper does not scroll. Compact cart captions and overlapping personalization captions were removed from imagery. Legacy remote artwork now bypasses the local-only Next.js image optimizer; legacy artwork is imported through the existing validated upload/persistence path into the approved editor.

## When bad assets entered

- `c96e12a75d54bc113d4c67384460a76f50d606c7`, 2026-05-29 10:47:06 -0500, **Rebuild product showcase with printed samples**: the eight legacy samples entered the repository.
- `24072ae24ca453570a9a20e1c6c85edf6a0f6c50`, 2026-09-20 22:54:22 -0500, **feat(seasonal-edit): launch The Seasonal Edit with 6 original fall concepts and personalization**: the generator used the preprinted tee, mug, and poster samples as bases and produced the six contaminated seasonal mockups.
- At starting HEAD the mug template, both homepage variants, and legacy runtime fallbacks still depended on those samples or independent overlays.

These relationships were established from Git history, generator source, and actual pixel inspection, not filenames.

## Contaminated assets and disposition

All fourteen files below were visually inspected and deleted. Source artwork, SVGs, full-resolution production PNGs, and artwork WebPs were retained.

| Asset under `public/` | Classification and visible contamination | Relationship |
| --- | --- | --- |
| `landing/mockups/product-tshirt.webp` | B — preprinted sales sample; bulldog in yellow hoodie on shirt | Seasonal tee generator base; homepage sample |
| `landing/mockups/product-mug.webp` | B — bulldog already printed on white mug | Canonical mug base; seasonal mug generator base; homepage sample |
| `landing/mockups/product-poster.webp` | B — bulldog already on poster | Seasonal poster generator base; homepage sample |
| `landing/mockups/product-canvas.webp` | B — bulldog printed on canvas | Legacy unsupported product showcase |
| `landing/mockups/product-hoodie.webp` | B — bulldog printed on hoodie | Legacy unsupported product showcase |
| `landing/mockups/product-phone-case.webp` | B — bulldog printed on phone case | Legacy unsupported product showcase |
| `landing/mockups/product-tote-bag.webp` | B — bulldog printed on tote | Legacy unsupported product showcase |
| `landing/mockups/product-sticker.webp` | B — YOUR COOL BRAND / flower / lightning baked into stickers | Legacy unsupported product showcase |
| `designs/seasonal-edit/mockups/haunted-household-tee.webp` | C — seasonal ghost family over the old bulldog | Contaminated tee sample + multiply |
| `designs/seasonal-edit/mockups/midnight-hayride-tee.webp` | C — hayride over the old bulldog | Contaminated tee sample + multiply |
| `designs/seasonal-edit/mockups/leftovers-league-tee.webp` | C — leftovers emblem over the old bulldog | Contaminated tee sample + multiply |
| `designs/seasonal-edit/mockups/library-of-lost-hours-mug.webp` | C — library card over the old bulldog | Contaminated mug sample + multiply |
| `designs/seasonal-edit/mockups/night-garden-society-poster.webp` | C — botanical art over the old bulldog | Contaminated poster sample + multiply |
| `designs/seasonal-edit/mockups/field-notes-after-dark-poster.webp` | C — naturalist art over the old bulldog | Contaminated poster sample + multiply |

Evidence: `output/playwright/mockup-repair/assets-before.png`, original Preview captures in `output/playwright/mockup-repair/before/`, and official mug candidate sheet `output/playwright/mockup-repair/printify-mug-views.png`.

## Canonical blank verification

Tee front (`/shop-v2/tee-base.svg`), tee back (`/shop-v2/tee-back.svg`), and poster (`/shop-v2/poster-base.svg`) were visually checked as clean deterministic SVG bases. The back-view debug text was removed.

Read-only Printify catalog calls verified blueprint 68, provider 1, variant 33719 for the white 11 oz ceramic C-handle mug. Of seven blueprint image candidates, the first was a clean blank; several others contained printed artwork. The selected source is `https://images.printify.com/66c42e5361b2691da8085442`, a 2048 × 2048 official blank catalog image. It is stored as `/shop-v2/mug-left-base.webp`. `/shop-v2/mug-right-base.webp` is its horizontal mirror to show the handle on the left; this is explicitly a display transformation, not a separately rendered official mockup. Existing left/right print-area coordinates were retained and checked visually against the body.

The provenance file `public/shop-v2/blank-product-provenance.json` records source, mapping, transformation, and exact SHA-256 hashes. `verifiedBlankProductImages` in the existing template module is the runtime allowlist; product-template validation rejects any other base, even if a file exists.

Catalog API evidence reports a 2700 × 1120 mug wrap with `dye-sublimation`. The existing approved PrintMe catalog uses 1275 × 1155 side artwork with `sublimation` and two display sides. This incident repair deliberately preserves that existing fulfillment mapping and does not claim that it revalidates the entire production geometry. Changing the production contract requires its own catalog/fulfillment verification. API reference: [Printify developer documentation](https://developers.printify.com/).

## Customer-facing inventory matrix

“Current” means at the starting SHA. The broad ripgrep inventory is preserved locally as `audit/mockup-reference-inventory.txt`. All customer-facing consumers found were traced, including source artwork pages that do not composite product imagery.

| Route / component | Current mockup source | Product | Artwork source | Blank source at start | Method / status | Repair / final action |
| --- | --- | --- | --- | --- | --- | --- |
| `/` · HeroProductSwitcher | Legacy tee/mug and `hero-print-products.webp` collage | Selected approved product | Unrelated historic sample | None | Flattened photo; contaminated or product/title mismatch | Same resolved curated artwork + selected approved product + MerchandisePreview |
| `/` · anchor products | Three legacy samples | Poster / Tee / Mug | Baked bulldog | None | Flattened sample; contaminated | Approved products, actual prices, canonical previews |
| `/` · matching formats | Legacy tee/poster samples | Tee / Poster | Baked bulldog | None | Flattened sample; contaminated | Same selected artwork on both products via canonical renderer |
| `/` · HomeCommerceShowcase | InstantPreview | All three | Fall 2026 curated assets | SVGs / contaminated mug | Canonical placement; mug contaminated, aspect defect | Verified bases, square geometry, merchandising presentation |
| Legacy `/` · ProductShowcase | PRODUCT_PHOTOS sampleImage × 8 | Three approved + five unavailable | Baked demo art | None | Flattened samples; contaminated | Only approved three; canonical prices and renderer; removed 50+ claim |
| Legacy `/` · HeroAnimation | Remote shirt photograph + dog overlay | Tee | Dog cutout | Unverified remote shirt | Manual percentages/multiply; unknown blank | Resolved approved tee + curated design through canonical renderer |
| `/`, `/halloween` · SeasonalTrendCard × 6 | card.mockupUrl | Recommended Tee / Mug / Poster | Seasonal source, flattened over old samples | Contaminated legacy samples | Generated WebPs; contaminated | Resolve exact relatedDesignId and recommendedProductId; canonical configuration/renderer; no wrong-product fallback |
| Seasonal personalization modal | InstantPreview | Recommended product | Generated personalized SVG/PNG | SVGs / contaminated mug | Canonical placement; mug contaminated/aspect defect | Verified bases; proportional renderer; no status overlay on image |
| `/shop-v2` · configurator | PersistedInstantPreview | All three, variants/views | Curated or customer asset | SVGs / contaminated mug | Canonical placement; mug contaminated/aspect defect | Shared fixed renderer and bases; saved configuration preserved |
| `/shop-v2` · cart items | PersistedInstantPreview | Cart selection | Exact cart snapshot / restored upload | Same template registry | Canonical placement; mug contaminated/aspect defect | Shared fixed renderer; compact imagery has no covering caption |
| `/shop-v2` · same-design upsells/sets | PersistedInstantPreview | Eligible matching products | Source cart design | Same template registry | Canonical placement; mug contaminated/aspect defect | Shared fixed renderer; margin/economics gating preserved |
| `/create` | InstantPreview | Selected approved product | Uploaded/AI/prepared customer asset | Same template registry | Canonical placement; mug contaminated/aspect defect | Shared fixed renderer; both tee and mug views verified |
| `/products/[slug]` | InstantPreview | Approved product only | Resolved curated design | Same template registry | Canonical placement; mug contaminated/aspect defect | Merchandising renderer, verified bases, actual product price |
| `/products` | Catalog links/details | Approved three | No separate composited mockup | N/A | Product discovery | Checked; remains approved catalog |
| `/designs`, `/designs/[slug]` | Canonical artwork preview | Design discovery / compatible products | Curated artwork WebP, production PNG | N/A | Artwork display; clean | Original source artwork preserved; configured product uses shared renderer |
| `/collections`, `/collections/halloween`, `/collections/fall`, `/collections/thanksgiving` | Canonical artwork cards | Design discovery | Curated collection artwork | N/A | Artwork display; clean | All three sizes captured and inspected |
| `/app/create/preview` · LiveProductMockups | Printify output or PRODUCT_PHOTOS percentages | Eight historic products | Legacy generated design | Unverified remote photos | Genuine official on success; crude multiply fallback on failure | Approved products passed by server; genuine mapped official result or canonical InstantPreview; truthful per-card caption |
| `/app/create/products` | Database mockup_url or PRODUCT_PHOTOS | Legacy catalog | Legacy generated design | Unverified legacy photos | Manual percentages/multiply; unknown/contaminated | Preserves legacy artwork, previews approved three, carries exact artwork into `/create` and current checkout |
| `/app/designs` | Stored user artwork | User design gallery | User's actual saved design | N/A | Raw artwork; no product overlay | Inspected source; no legacy sample references |
| `/studio/designs` · StudioDesignEditor | InstantPreview | Approved product configuration | Editor artwork | Same template registry | Canonical placement; mug contaminated/aspect defect | Fixed through shared renderer; existing Studio E2E publication flow passes |
| `/admin/seasonal-trends` | card.mockupUrl thumbnail | Seasonal recommendation | Flattened generated WebP | Contaminated sample | Contaminated thumbnail | Link to actual canonical configurator; no stale thumbnail |
| `/api/printify/mockups` | Genuine Printify generated image / cache | Eight default blueprints, first arbitrary provider | Requested artwork | Provider output | Genuine output, wrong catalog/default placement potential | Only approved three; approved provider/variant/price/default placement; cache must match artwork, mapping and placement |
| Seasonal asset generator | Three legacy samples | Tee / Mug / Poster | Original seasonal SVG | Contaminated samples | Manual placement + multiply | Artwork-only generator; all product compositing inputs and logic removed |

There are no active customer imports or generator references to the retired paths. Remaining `mix-blend-multiply` uses are decorative blurred background circles on legacy upload/style/preview pages; none composite product artwork. The legacy product-photo manifest and its independent designArea coordinates were removed.

## Single-source architecture

`CuratedDesign.asset` (or a validated customer `DesignAsset`) + approved `MerchProduct` → existing `createProductConfiguration` → `getPreviewTemplate` verified blank view → existing `instant2dRenderer` / `placementFromConfiguration` → `InstantPreview`.

`MerchandisePreview` is a small presentational wrapper around this pipeline. It contains no placement math. Seasonal cards, hero product switching, homepage anchors, matching formats, and legacy instant fallback now use it. The editor, cart, upsells, product detail, and Studio consume the same renderer. Merchandising hides safe-zone/status UI; editor previews remain honestly labeled “Instant preview”.

Genuine Printify mockup images replace the instant renderer only after the response matches the approved blueprint/provider/variant and exact artwork URL. Failure leaves the same canonical instant renderer visible. Official generation is requested explicitly; opening a legacy page no longer creates eight provider drafts automatically. Old cache entries without mapping/artwork/placement provenance are not reused. Existing official-mockup reconciliation and fulfillment pathways are preserved.

## Why earlier tests missed the defect

The seasonal unit test only checked whether six WebPs existed. It did not inspect pixels or establish that the base was blank. Original visual baselines could bless contaminated imagery; the older product suite skipped tablet/mobile and on non-Windows only checked screenshot byte length. Tests also did not cover seasonal cards, homepage product images, fallback truthfulness, or the container/template aspect mismatch.

## Regression protection

- Exact hashes for every visually verified blank, and runtime/template validation that rejects unverified bases.
- Generator regression rejects `baseMockup`, independent `mockupPlacement`, product sample inputs, or blend compositing.
- Retired sample absence and retained source-artwork checks.
- Official mockup tests reject unavailable blueprints before writes and verify approved provider, variant, canonical price/default placement.
- Existing Playwright suite expanded with `mockup-repair-visual.spec.ts`; 30 PNG baselines (10 × three viewports) in the existing `*.spec.ts-snapshots` hierarchy. Includes all six seasonal designs, all three approved products, and homepage showcase. The seven specifically requested snapshot names are included.
- All image audit routes return 200; preview images must load, stay square, use the correct product, show canonical prices, and contain no retired asset references. Hero switching must not scroll/crop the product. Both tee and mug display views are exercised. Personalization, cart/sets/upsells, official failure, and exact legacy artwork import are exercised.
- The four older product baselines were intentionally updated after visual review. The older visual test now awaits image decoding before comparisons, matching the new audit's image-readiness protection.

## Visual QA and quality gates

Required sizes: 390 × 844, 768 × 1024, and 1440 × 900. The audit covers homepage/Seasonal Edit, `/halloween`, `/shop-v2`, `/create`, `/designs`, all requested collection pages, all approved product pages, all six seasonal design detail pages, all nine Fall 2026 design detail pages, personalization, cart/sets/upsells, and legacy product fallback/handoff. Existing Studio/publication and dry-run checkout coverage remains in the full E2E suite.

Local after evidence: `output/playwright/mockup-repair/after/{mobile,tablet,desktop}-chromium/`. Each folder contains full-page route screenshots, isolated seasonal/product/editor/personalization/cart images and a `routes.json` status record. Contact sheets are `after/seasonal-all-viewports.png`, `after/products-create-cart.png`, and `after/discovery-fall-pages.png`. Full-size captures, rather than reduced contact-sheet tiles, are the inspection authority. Before evidence: `output/playwright/mockup-repair/before/` plus `assets-before.png`.

Visual review checks: no unrelated art; no duplicate overlay; artwork proportional; clipping limited to canonical print area; selected blank/title/price agree; crisp at rendered size; instant imagery honestly presented. SVG product silhouettes are intentionally retained; no claim that they are official photography. Source-art transparent margins and approved default placement are preserved.

Local gates completed after the final legacy preview handoff fix: typecheck PASS; lint PASS (0 errors, 29 warnings); unit tests 178 passed / 3 skipped, 42 passing files / 2 skipped; production build PASS (73 static pages); full E2E 52 passed / 14 skipped; product template validation 2 passed. All three sitewide visual audits passed and all 30 new baselines matched. Skipped tests retain their existing environment/product-suite conditions; live provider writes are not required to run this repair suite.

Additional current inspection sheets are `after/seasonal-inspection-0.png`, `after/products-inspection-{0,1,2}.png`, `after/discovery-inspection-{0,1,2}.png`, and `after/personalization-inspection-0.png`. Both legacy preview and legacy product pages were rendered with the exact Library artwork, including successful import into the current mug configurator. The legacy AI response and provider failure were intercepted in the browser; these checks do not represent a live AI/provider success.

The implementation commit `0a337018eafad5110723d93faf2a02e663189455` built successfully as Vercel Preview `https://printme-48hlu8x34-qaliais-projects.vercel.app`. Actual Preview audits passed at all three sizes (3 tests passed, 26.4 seconds), with 28 routes returning 200 per viewport, 56 screenshots per viewport, plus rendered legacy preview/products/handoffs, personalization, editor views and cart. Screenshots were visually inspected; all six seasonal products, approved product views, homepage switching, discovery and all nine Fall designs were clean. Remote evidence is in `output/playwright/mockup-repair/vercel/`; viewport subfolders contain full-size captures and `routes.json`, and inspection sheets use the same naming as local evidence.

Preview economics currently pause same-design upsells. That existing margin gate remains intact; upsell/set imagery is verified locally with the development-only economics fixture. Live cart writes are intercepted inside the browser; no live checkout, payment or Printify draft creation occurs. Legacy AI responses and provider failures are browser fixtures, not live service success. Production remains at `d933849363b918517f9a5f7b298129195b18391d` / `dpl_9j3gLhpEX21dJ1iaCXiALXVMEvWx`.

Final Preview inspection prompted removal of raw coordinates/angle from the cart and raw coordinates from the configurator; the cart now displays a readable artwork-size percentage. The existing scale-persistence assertion checks that percentage. Remote QA also captures all three approved products together in the browser-only cart. The final branch Preview is re-audited after these final presentation/evidence changes; its exact deployment/SHA results are preserved in `output/playwright/mockup-repair/final-preview-verification.json`.
