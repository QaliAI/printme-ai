# Creative QA — Issue Nº 01 creative proof (2026-10-12)

Screens: `docs/creative-rebuild/screenshots/` (desktop 1440×900 and mobile 390×844, Chromium via Playwright; wall-sequence beats 1–4; reduced-motion full page; try-it and studio hand-off).

## 1. Failure-condition audit (brief §16)
| Failure condition | Verdict | Evidence |
| --- | --- | --- |
| Logo becomes generic AI branding | Pass | Ransom collage from the approved reference: real outlined letterforms, torn scraps, tape, halftone, splatter (`brand/exports/brand-sheet.png`) |
| Site merely gains distressed fonts + pink | Pass | New layout system, six distinct acts, scroll story, collage type, product-led wall; distressed type only appears in logo and merch |
| Robot is a decorative stock illustration | Pass | Original layered character with posable head and spray arm; it drives the scroll story |
| Animations unrelated to the product | Pass | Every animated element ends on a real, priced preview (tee, wall cards, print factory) |
| Every section uses the same entrance | Pass | slap / spray / tear / paste-down / flip / squeegee / ticker (MOTION_STORYBOARD) |
| Mobile hard to navigate | Pass | Sticky header with horizontal nav, 54 px sticky action bar, ≥ 44 px targets (tested), no horizontal overflow (tested) |
| Backend replaced instead of recovered | Pass | Homepage reads `approved-catalog`, `DesignCatalogService`, `seasonal-trends`, `photo-styles`, and renders through `InstantPreview`/`placement`; studio unchanged |
| Missing capabilities disguised | Pass | Background removal is marked "Not yet"; AI styles marked "In the studio"; filtered "transformations" removed |
| Merchandise childish/generic | Mostly pass | Three new designs (below). Existing seasonal art still on the wall is flagged for review |
| Preview doesn't match printable artwork | Pass | Previews use each product's real print area; artwork PNGs are 3951×4800 print files |
| Fabricated trend/best-seller claims | Pass on homepage; **P1 elsewhere** | Homepage: "New drop" only on 2026-10-12 publications; trend radar cites sources with "not our sales numbers". `/designs/trending` and `/designs/bestsellers` still need relabelling |
| Only deliverable is a plan | Pass | Working code, assets, tests, screenshots |

## 2. Merchandise evaluation (two separate passes)
| Design | A · desirable by itself? | B · credible on product? | Fixes made during QA |
| --- | --- | --- | --- |
| **Make Shit. Print Shit.** | Yes: strong typographic streetwear piece. Ransom collage ties to the brand without being the logo | Yes on the white tee (ink slab gives contrast) and the poster. Mug: legible but busy at 11 oz | Wear speckle reduced (read as "stars" on black); splatter moved off the footer type |
| **Bad Ideas Club** | Yes: collegiate parody plus self-aware footnote; broad giftable humour | Yes on the tee (pink + ink, two-colour feel); poster OK | Arc tightened; ★ glyphs were missing from the font (tofu) and are now drawn as vector stars; crescent changed from white ink to a mask so it prints correctly on any blank; scrawl and arrow moved off the lettering |
| **Creature of Habit** | Yes: original character, horror-comedy, Halloween-relevant but year-round | Yes on the tee and mug (hero mug shot); title readable at thumbnail size | Belly patch removed (read as a second mouth); fur spikes softened; teeth now follow the lip curve |

Print specs: 3951×4800 px transparent PNG (same format as the approved Fall 2026 files; covers the tee front area 3591×4364 at `contain`). All text is outlined. Editable sources live in `designs/source/*.svg`, rebuilt by `scripts/designs/build-merch.mjs`.
**Rights:** original artwork; fonts OFL (Archivo Black, Alfa Slab One, Bowlby One, Anton, Graduate, Creepster, Permanent Marker). No third-party characters, logos or celebrity likenesses. "Club"/collegiate styling is generic.
**Not yet verified:** physical sample prints; Printify upload acceptance of these files; cost/margin per product (catalog `unitCost` is `null` for all variants).

## 3. Functional checks run
| Check | Result |
| --- | --- |
| `npx tsc --noEmit` | Pass |
| ESLint on changed code | Pass (0 errors, 0 warnings) |
| Vitest (`npm test`) | 178 passed, 3 skipped (3 seed-count assertions updated 20 → 23 for the new designs) |
| Playwright: new homepage spec × 3 viewports | Pass (Act I above the fold, real previews, wall sequence end state, reduced motion, photo → studio hand-off, trend receipts, mobile reachability) |
| Playwright: full suite | See RELEASE_READINESS §Test results |
| Pixel baselines | `approved-*-preview` baselines re-recorded. The diff was only overlay-label glyphs after the DM Sans → Archivo swap (artwork/placement identical; see the expected/actual/diff check in this session). Old homepage card baselines removed (that UI no longer exists) |
| Photo → studio hand-off | Verified: upload on the homepage → blob preview on the tee → `/create` imports via `acceptFile` → Everyday Tee, $34, Add to Cart (`screenshots/mobile-04-studio-handoff.jpg`) |
| Console errors on homepage | None captured (desktop + mobile runs) |

## 4. Accessibility
- One `h1`; every act is a `section` labelled by its heading. The wall sequence has a visually-hidden heading.
- Skip link to `#main`. Visible `:focus-visible` outline (3 px pink).
- Real text everywhere (ransom words are text in styled spans, not images).
- Contrast: verified ratios in BRAND_SYSTEM §2 (ink/newsprint 16.6:1, ink/pink 5.4:1, ink/yellow 13.4:1). Secondary copy uses `--pm-gray-ink` (5.9:1).
- Touch targets ≥ 44 px on chips, switches, nav; the sticky bar is 54 px.
- `prefers-reduced-motion`: all keyframes off, wall not pinned (CSS + hook), tickers stopped.
- Decorative bots/collage are `aria-hidden`. The bot SVG has a `role="img"` label when standalone.
- Known gaps: the product switcher uses `aria-pressed` buttons (fine); the Print Factory tabs lack arrow-key roving focus (P2); the drops "flip to artwork" is hover/focus only (no touch toggle; it is an enhancement, not information).

## 5. Performance (see RELEASE_READINESS for measured numbers)
Budget decisions: no new runtime dependency; fonts self-hosted via `next/font` (Permanent Marker not preloaded); motion art is SVG; artwork images lazy; header logo is a cached file; grain is a 0.4 KB data-URI tile.
