# Release readiness — creative proof (milestone 1), 2026-10-12

**Status: ready for creative review on a non-production preview. Not approved for production.**
Branch `feat/creative-anarchy-proof-2026-10-12` (based on unmerged `feat/printme-revenue-activation-2026-10-11`). No production deployment, merge, migration, secret change, real charge, or fulfillment was performed.

## Milestone 1 checklist (brief §14)
| # | Deliverable | State | Where |
| --- | --- | --- | --- |
| 1 | Reconstructed collage logo | Done: 10 lockups + favicon + app icon + 4 applications + usage sheet | `brand/`, `public/brand/`, `app/icon.svg`, `app/favicon.ico`, `app/apple-icon.png` |
| 2 | Header + navigation | Done | `components/punk/PunkHeader.tsx` |
| 3 | Dramatic animated hero | Done | Act I in `components/punk/PunkHomepage.tsx` |
| 4 | Rebel Bot graffiti sequence | Done (vector proof) | `RebelBot.tsx`, `RebelWallSequence.tsx` |
| 5 | Stunning product discovery section | Done | Act II Wall of Drops |
| 6 | Three desirable merch designs | Done (pending owner approval) | `designs/source/`, `public/designs/issue-01/` |
| 7 | Working entry into the studio | Done and verified | Act III try-it → `/create` hand-off |
| 8 | Desktop + mobile screenshots | Done | `docs/creative-rebuild/screenshots/` |
| 9 | Source changes in the existing repo | Done | this branch |
| — | Acts IV–VI | Done (first pass) | Trend Radar, Print Factory, Encore |

## Test results (this branch, local)
| Suite | Result |
| --- | --- |
| Typecheck | Pass |
| ESLint (changed files) | Pass |
| Vitest | 178 passed / 3 skipped |
| Playwright full suite, 2 workers, mobile + tablet + desktop | **67 passed / 14 skipped / 0 failed** |
| Production build (`next build`) | Pass |
| Note | With unlimited workers, the dev server timed out under load (`page.goto`/`reload` 30 s) on 20 unrelated tests; all of them pass at 2 workers. CI should keep a worker cap. |

## Lab performance — production build, homepage (median of 3)
| Profile | LCP | CLS | Total blocking (long-task excess) | Transfer | Tap processing |
| --- | --- | --- | --- | --- | --- |
| Mobile, 4× CPU, ~1.6 Mbps / 150 ms | **1.94 s** | **0.002** | 517 ms | ~735 KB | < 16 ms |
| Desktop, unthrottled | 0.18 s | 0.000 | 58 ms | ~723 KB | < 16 ms |
LCP element on mobile is the hero tee preview image; on desktop it's the ransom headline. Script: `scripts/measure-cwv.mjs`. These are lab numbers on localhost. Field CWV (incl. INP) must be read from the Vercel preview/production RUM. The 517 ms blocking time under 4× CPU is the main performance risk; the next step is lazy-hydrating the wall sequence and Act III below the fold.

## Needs owner approval before full rollout
1. **Creative direction** of the homepage, logo reconstruction and Rebel Bot (this checkpoint).
2. **Publishing the 3 Issue Nº 01 designs.** Production reads the seed catalog (`COMMERCE_DESIGNS_DATABASE_ENABLED` absent), so merging publishes them. Includes the profane "Make Shit. Print Shit." product.
3. **Campaign line usage** ("MAKE SHIT. PRINT SHIT." in the header ticker, hero sticker and footer). Metadata and ads use the accessible line.
4. **P1 honesty fix:** relabel or remove `/designs/trending` and `/designs/bestsellers` (hand-set filters, no data) — recommend "Staff picks".
5. **Retire filtered "AI transformation" images** (`pet-cartoon`, `family-oil-painting`, `travel-watercolor`) and the `design-pet-pop`/`family-oil`/`travel-watercolor` seeds that use them.
6. **Rights check** of `public/landing/transformations/pet-original.webp` (used as the Act III sample photo; provenance unknown), or supply an owned photo.
7. **One paid OpenAI smoke test** (approve spend) to verify live style quality before advertising AI styles more prominently.
8. **Text-thread designer** production flag (`NEXT_PUBLIC_TEXT_THREAD_ENABLED`) — the footer links to it; it 404s in production until enabled.
9. **Black/colour garments**: requires Printify variant IDs + preview templates; the punk catalogue needs dark blanks.

## Known gaps (not in this milestone)
- Other pages (`/shop`, `/create`, `/products`, `/halloween`, `/collections`) inherit tokens/fonts/header/footer but not the full collage art direction yet.
- Seasonal takeover system (Slasher Shop etc.) with start/end scheduling and draft→approve→publish states: not started. `seasonal-trends.ts` already has publication/review states to build on.
- Background removal, caricature preset, HEIC + EXIF normalisation for print files: not implemented.
- Commerce blockers from 2026-10-11 remain (Supabase migrations 002–012, checkout/fulfillment flags off, Resend absent).
- Remaining 9 merch designs (brief asks for 12 before scaling), physical sample prints, margin data (`unitCost` null).
- Bot is a vector proof; a richer frame-sequence/3D take is optional after approval.

## Rollback
Everything is additive behind the existing `homepage` flag. Reverting the merge restores HomepageV2; the new designs disappear from the seed with the revert. No data migrations involved.
