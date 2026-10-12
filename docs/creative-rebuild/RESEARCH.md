# Creative research — PrintMe.ai "Operation Creative Anarchy"

Date: 2026-10-12 · Screenshots: `docs/creative-rebuild/research/` — **local only, gitignored** (third-party pages; not for publication) (desktop 1440×900 and mobile 390×844, captured with Playwright, Chromium).

Scope rule: study principles, never copy. No competitor artwork, logo, code or signature identity was reused. Pages that served bot challenges or geo-blocks were **not** bypassed; they are marked below.

## Summary: what we take into PrintMe

| Principle | Source(s) | How PrintMe uses it |
| --- | --- | --- |
| Motion as structure, not decoration | Naked City Films, Eloy Benoffi | One scroll timeline tells one story (wall → design → tee). Each act has its own reveal verb (slap, tear, paste-down, flip, squeegee). |
| Text that *behaves* | Eloy Benoffi (stacked/clipped type rows, SplitText) | Ransom-note headline words slap in individually; encore type is torn paper. Words remain real text (SEO, a11y). |
| Scroll-synced sequences need deterministic control | OPTIKKA | We do not scrub video. The wall sequence is layered SVG + DOM driven by one clamped progress value; no 1,000-frame download. |
| Mobile gets its own choreography | OPTIKKA (device-specific sequences), Naked City (reduced mobile motion) | Mobile has its own layout/travel distances for the wall story, a shorter scroll length, and no beat bar. |
| Drop culture: inventory is the hero | Supreme, Cactus Plant Flea Market | Wall of Drops is products first: every poster is a real preview with a price. |
| Artist marketplace browsing | Threadless | Collection chips map to real published collections only. |
| Trust and production transparency | Teemill | Print method + real print-area dimensions shown in the Print Factory spec sheet. |

## Reference notes

### 1. Eloy Benoffi portfolio — eloyb.design
Codrops case study (2025-10-15). Screens: `eloy-benoffi-desktop.jpg`, `eloy-benoffi-mobile.jpg`.
- **Impressive:** maximalist acid-lime field, ASCII/pixel flower art, giant grotesk type duplicated in clipped rows that slide at different easings as you scroll; footer "clone machine" button.
- **Principle for PrintMe:** commit fully to one aesthetic universe; let type itself move; hide small easter eggs.
- **Implementation (from the article):** Webflow + GSAP ScrollTrigger (scrubbed timelines staggering SVG path opacity), SplitText, TextPlugin, Draggable+Inertia sliders, ScrambleText.
- **Mobile:** works, but dense; legibility drops on small screens.
- **Helps buying?** No — it is a portfolio and says so ("less about a polished marketing shopfront").
- **Avoid:** the acid-green/ASCII signature look, glitch-as-identity, letting chaos bury the CTA.

### 2. Naked City Films — nakedcityfilms.com
Codrops case study (2026-01-19). Screens: `naked-city-films-*.jpg`.
- **Impressive:** restraint + intensity. One electric-blue system, heavy block type, page transitions that feel like edit cuts, a CRT RGB-split shader on hover.
- **Principle:** transitions are connective tissue; every motion has a reason; mobile reduces motion but keeps character.
- **Implementation:** Nuxt + custom Canvas3 module (Three.js, smooth scroll, single rAF loop), GSAP timelines, GLSL shaders, Sanity CMS.
- **Mobile:** simplified views, touch-first.
- **Helps buying?** N/A (studio site), but the "one loop drives everything" architecture is right for us.
- **Avoid:** blue monochrome identity; smooth-scroll hijacking (we keep native scroll for touch and accessibility); WebGL for this milestone (cost not justified yet).

### 3. OPTIKKA — optikka.com
Codrops engineering article (2025-10-16). Screens: `optikka-*.jpg` (desktop caught mid-intro animation).
- **Impressive:** a file-system metaphor that expands with scroll, perfectly synced.
- **Principle / lesson:** HTML5 video scrubbing stutters on mobile and fights autoplay rules; frame sequences on canvas are smooth but cost bandwidth (1,182 desktop frames, 880 mobile), need staged preloading (first 10 frames, then a parallel queue, then directional preloading).
- **Decision for PrintMe:** the Rebel Bot proof uses layered vector art + masks instead of frames: tiny payload, crisp at any DPR, editable. If the bot later becomes a rendered 3D/2D animation, follow OPTIKKA's staged WebP-sequence approach.
- **Avoid:** loading animation media on first paint.

### 4. Codrops creative hub — tympanus.net/codrops/hub/tutorials
Screen: `codrops-tutorials-mobile.jpg` (desktop served a bot challenge; not bypassed).
- Useful patterns surveyed: clip-path reveals, SVG mask transitions, scroll-linked text, paper/fold effects. We used SVG `mask` + `pathLength` for the spray reveal and `clip-path` for paste-down/torn reveals.

### 5. Cactus Plant Flea Market — cactusplantfleamarket.com
Screens: `cactus-plant-flea-market-*.jpg`.
- **Impressive:** anti-design commerce that still sells: product photo, lowercase name, price, "sold out" — nothing else. Live clock/weather/moon-phase header chrome.
- **Principle:** weird framing is fine when the product block is boringly clear.
- **Mobile:** one product per screen, very usable.
- **Avoid:** its typewriter/lowercase identity; scarcity theatre ("sold out" for PrintMe would be false — we print on demand).

### 6. Supreme — us.supreme.com
Screens: `supreme-*.jpg`.
- **Impressive:** the shop page is a strip of tightly cropped product slices with tiny "new" flags; the drop is the brand.
- **Principle:** "New" badges must be real; let product imagery carry the page.
- **Avoid:** box logo, red, drop-time scarcity mechanics.

### 7. Stüssy — stussy.com
Screens: `stussy-*.jpg`.
- **Principle:** streetwear restraint — big imagery, small UI — contrasts with our collage loudness; reminds us to keep UI chrome (nav, cart) quiet and legible.

### 8. Threadless — threadless.com
Screen: `threadless-mobile.jpg` (desktop served a bot challenge; not bypassed).
- **Impressive:** artist-marketplace entry points: Shop New / Trending / Popular stacked as big tiles.
- **Caution:** those labels are backed by marketplace sales data. PrintMe has no such data today, so we do **not** ship "Trending/Popular" labels (see FEATURE_RECOVERY: `/designs/trending` is flagged).
- **Avoid:** sale-price banner aesthetic, discount-led merchandising.

### 9. Teemill — teemill.com
Screens: `teemill-*.jpg`.
- **Impressive:** hero video of a real print bed — production as storytelling.
- **Principle:** show the print process; it builds trust. Became Act V "The Print Factory" (with honest specs from the catalog).

### 10. Not captured
- **Brain Dead (wearebraindead.com)** — returned "You cannot access our site from your current region." Removed from screenshots.
- **Redbubble** — bot challenge on both viewports; not bypassed.

## Original synthesis (what is ours)
- Cut-and-paste ransom collage built from real outlined type on torn scraps (from the owner's approved reference), not glitch, not ASCII, not blue brutalism.
- A junk-built graffiti robot as campaign character with physical props (paint-tin head, crate torso, spray can).
- The story ties directly to commerce: every animated object ends as a real, priced, printable product.
