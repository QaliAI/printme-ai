# PrintMe.ai brand system — punk collage, v1 (creative proof)

Supersedes the 2026-10-11 "consumer gift" system (`docs/PRINTME_BRAND_SYSTEM_2026-10-11.md`) for the creative proof. Source of truth: the owner-approved reference `brand/references/printme-punk-collage-logo-reference.png`.

**Positioning:** an independent creative merchandise platform powered by personalization and AI tools.
**Attitude:** punk, rebellious, expressive, confident, playful. Irreverent, never hostile to customers.
**Campaign line:** MAKE SHIT. PRINT SHIT.
**Accessible line** (ads, search, SEO, product guidance): YOUR IMAGINATION. NO PERMISSION REQUIRED.

---

## 1. Logo

### How it was made (not autotraced)
`scripts/brand/build-logo.mjs` rebuilds the reference as real vector artwork:
- **Letterforms** are outlined from OFL fonts via `opentype.js`: Archivo Black (P, i, t, M, i), Alfa Slab One (r, e), Bowlby One (n) and Anton (a). The mix echoes ransom-note cutting while every lockup reads exactly **PrintMe.ai**.
- **Paper scraps** are torn rectangles generated from fixed seeds (`collage-kit.mjs`), so every edge is designed once and reproduced identically in every lockup.
- **Art direction per letter** (paper colour, rotation, glyph counter-rotation, padding, tape) is hand-specified in the `letters` table, not random.
- Splatter, drip, tape and halftone are vector shapes. The `textured` lockups add a photocopier-grain SVG filter. The `clean` and `web` files omit it.
- Regenerate everything: `node scripts/brand/build-logo.mjs && node scripts/brand/export-brand.mjs`.

### Files (`brand/logo/`, mirrored to `public/brand/`)
| File | Use |
| --- | --- |
| `printme-logo-horizontal.svg` | Primary, textured, ≥ 320 px |
| `printme-logo-horizontal-clean.svg` | UI, email, light backgrounds |
| `printme-logo-horizontal-web.svg` | Site header (no halftone field, smallest) |
| `printme-logo-stacked.svg` / `-clean.svg` | Compact lockup (hero, social, packaging) |
| `printme-logo-*-mono.svg` | One ink (`currentColor`): embroidery, labels, 1-colour screen print |
| `printme-logo-*-inverse.svg` | Dark backgrounds: splatter turns pink, inverted scrap gets a paper edge |
| `printme-favicon.svg` | 16–64 px: single P on a pink scrap (also `app/icon.svg`, `app/favicon.ico`) |
| `printme-app-icon.svg` | 180–512 px app/touch icon (also `app/apple-icon.png`) |
| `lib/brand/logo-layers.json` | Layer data for the animated `<CollageLogo />` |

PNG exports: `brand/exports/` (horizontal 2400, stacked 1600, inverse, mono, app icon 512/180, favicon 32/16, applications). Usage sheet: `brand/brand-sheet.html` → `brand/exports/brand-sheet.png`.

### Rules
- **Clear space:** X = the height of one letter scrap. Splatter/halftone may bleed into it; nothing else may.
- **Minimum size:** horizontal 140 px / 35 mm; stacked 88 px / 22 mm; below that use the favicon mark.
- Textured files only above 320 px wide.
- Never redraw letters, recolour individual scraps, straighten rotations, add gradients/glows, or place on purple AI gradients.
- The Rebel Bot is **never** the logo.

### Applications (`brand/applications/`)
Social post 1080×1350 · email header 600×160 · mono neck label · mailer sticker. All generated from the same layer data.

---

## 2. Colour

Foundation is ink + newsprint + print texture. Colour arrives in hits, never evenly.

| Token | Hex | Role | Contrast notes |
| --- | --- | --- | --- |
| `--pm-ink` | #111111 | Type, rules, shadows | 16.6:1 on newsprint |
| `--pm-newsprint` | #F3F0E9 | Page ground | — |
| `--pm-paper` | #FBF9F4 | Cards, scraps | — |
| `--pm-photocopy` | #CFCBC3 | Secondary scraps, print bed | Ink on it 11.7:1 |
| `--pm-gray-ink` | #5E5C57 | Secondary body text | 5.9:1 on newsprint (AA) |
| `--pm-pink` | #FF2B91 | Primary action, highlight scraps | Ink text on pink 5.4:1 (AA). Pink text on newsprint is only 3.1:1: use it at ≥ 24 px bold only; smaller pink text uses `--pm-pink-ink` #D6006F (4.5:1) |
| `--pm-yellow` | #F8D829 | Highlights, stickers, live status | Ink on yellow 13.4:1 |
| `--pm-orange` | #FF6038 | Sparing accent (hover, monster) | Ink on orange 6.3:1 |
| `--pm-blue` | #3059FF | Rare accent only | — |
| `--pm-acid` | #B8F23A | Horror / seasonal only | — |

The hypothesis colours from the brief were kept. Testing added `--pm-gray-ink` (photocopy gray #92908B is 2.8:1 on newsprint and fails AA as text) and `--pm-pink-ink`. Legacy `--printme-*` variables are re-pointed so existing pages inherit the system.

## 3. Typography (all SIL Open Font License, via `next/font/google`)

| Role | Face | Where |
| --- | --- | --- |
| Massive condensed headlines | **Anton** (`--font-poster`) | Act headings, ransom words, buttons |
| Grotesk headings + all UI/body | **Archivo** variable, `wdth` axis (`--font-sans`) | Nav (stretched 115–118%), body copy, forms, checkout |
| Editorial microtype | **Space Mono** (`--font-mono`) | Issue numbers, prices in captions, spec sheets, receipts |
| Graffiti annotation | **Permanent Marker** (`--font-marker`, not preloaded) | Footer sign-off, wall tags only |
| Logo/merch letterforms only | Archivo Black, Alfa Slab One, Bowlby One, Anton, Graduate, Creepster (outlined to paths) | Never live text |

Scale: posters `clamp(3rem, 8.4vw, 7.6rem)` at 0.86–0.88 line-height; hero `clamp(3.1rem, min(7.4vw, 11.5vh), 7rem)` (height-aware so the CTAs stay above the fold); body 16–20 px at 1.45–1.5. Distressed or marker faces never appear in checkout, forms or anything under 20 px.

## 4. Graphic ingredients (reusable)
| Ingredient | Implementation |
| --- | --- |
| Torn paper edge | `--torn-a`, `--torn-b` clip-path polygons (CSS); `tornRect()` (SVG, scripts) |
| Tape strip | `.tape` CSS; `tape()` SVG |
| Halftone | `halftone()` vector dots (print-safe); `--halftone` CSS gradient |
| Photocopier grain | `--grain` inline SVG feTurbulence tile (≈ 0.4 KB) |
| Spray paint | SVG mask + displacement filter (`RebelWallSequence`) |
| Ink splatter / drip | `splatter()` SVG |
| Stickers | `.sticker`, `.dropNew` |
| Registration marks | `.regMark` |
| Oversized paper labels | `.dropCollection`, `.issueTag` |
| Scribble arrow / marker annotation | Merch: `bad-ideas-club` arrow + Permanent Marker scrawl |

**Anti-chaos rules:** texture sits behind type, never over it. Rotations stay within ±3° on anything with body copy. Exactly one loud colour per component. Product imagery is never rotated more than 2.5°.

## 5. Rebel Bot (campaign character)
`components/punk/RebelBot.tsx`: a layered SVG with a paint-tin head (pink paint drips, camera-lens eye, taped-X eye), pink bandana, riot-yellow milk-crate torso with a PM sticker and tape, flex-conduit arms, spring legs and skate high-tops, plus a pink spray can. The head and spray arm are pivot groups, so scenes pose it by angle or drive it from a timeline. No glowing AI head, no stock 3D mascot. Usage: the wall sequence, the hero (peeking) and the encore. Never in the logo, checkout or forms.

## 6. Voice
| Context | Edgy (allowed) | Accessible (required) |
| --- | --- | --- |
| Hero / campaign | "Your brain. Our print shop." "Shop the chaos" | Lede explains plainly: upload, preview, printed to order |
| Section headers | "Make your own damn art." "Pixels in. Stuff out." | Body copy is literal |
| Product, checkout, errors, SEO meta | — | Always plain. Meta title uses the accessible line |
| Honesty | "We will not fake it" (background removal) | Labels like "Not yet", "In the studio" |

Profanity is limited to the campaign line and the opt-in design "Make Shit. Print Shit."; it is never used in transactional copy, metadata or ads.

## 7. Seasonal layering (next milestone)
One identity; campaigns swap accent token (`--pm-acid` for horror), hero media and merchandising order through publishing metadata. See RELEASE_READINESS for the Slasher Shop plan.

---

## 8. Relationship to `brand/references/PrintMe_Punk_Brand_Kit_v1/`
A second brand kit appeared in `brand/references/` during this session (files timestamped 2026-10-12 17:44). It describes itself as a "working creative reconstruction… not a final approved vector master". Both it and this system are proposals for the owner to choose between or merge.

| Topic | This system (scripts/brand) | Kit v1 | Recommendation |
| --- | --- | --- | --- |
| Collage logo | Mixed ransom typefaces per letter (closer to the reference's cut-up variety), seeded torn scraps, reproducible from code | Single heavy grotesk across scraps, cleaner and more uniform | Owner decision. Ours reads more "ransom note"; the kit's reads more "brand". |
| Utility wordmark (forms, checkout, email) | Not provided (clean collage is used) | Provided (black/white) | **Adopt the kit's utility wordmark** for checkout/forms |
| Favicon | Single P on a pink scrap | P sticker with pink/yellow scraps | Either; test both at 16/32 px |
| Colours | Brief hypothesis (#FF2B91 pink, #F8D829 yellow, #F3F0E9 newsprint) | #F23D99, #F7D431, #F4F0E8 (provisional) | Visually near-identical; settle on one hex set |
| Type | Anton + Archivo + Space Mono + Permanent Marker (all in next/font) | Noto Sans Display Condensed Black + Inter | Either works; ours avoids extra font weight downloads already shipped |
| Header height (mobile) | ≈ 130 px incl. ticker + nav row | 64 px | **Adopt the kit's leaner mobile header** in the next pass (drop ticker on mobile, menu button) |
| Trend labelling, motion rules, CTA visibility, studio "precision tool" stance | Implemented | Specified | Aligned |
