# Motion storyboard — Issue Nº 01 homepage

**Engine decision:** no new animation dependency. framer-motion (already installed) drives the one scroll-linked story; everything else is CSS keyframes triggered once by a tiny IntersectionObserver (`RevealOnView`). GSAP/ScrollTrigger was evaluated (it is free since 2025 and is the right call for a later timeline-heavy Slasher Shop takeover), but adding about 60 KB for one sequence wasn't justified. WebGL was rejected for now: no effect here needs a shader.

**Rules:** native scroll only (no smooth-scroll hijack). Animate transform, opacity, clip-path and two SVG attributes only. Nothing important waits for an animation. Every act uses a different verb.

| Act | Verb | Trigger | Implementation | Purpose | Reduced motion |
| --- | --- | --- | --- | --- | --- |
| Header | ticker | always | CSS `translateX` marquee, 38 s | Navigation flavour | Static |
| I · Rebellion | **slap** | load | `CollageLogo` scraps (70 ms stagger, overshoot); headline words (`wordSlap`, transform only so LCP isn't delayed); products **paste in**; sticker **pops**; bot **peeks** | Reveal + brand | Static, fully visible |
| Signature · The Wall | **spray → resolve → tear → land** | scroll (420 vh desktop / 340 vh mobile, sticky stage below the header) | `RebelWallSequence`: `useScroll` → clamped JS `interpolate` beats. SVG mask `pathLength` sprays YOUR IDEAS. YOUR RULES. through a displacement-roughened filter; spray-arm `transform` attribute + mist opacity set in `useMotionValueEvent`; the design reveals via `clip-path: circle()`, tears (rotate/translate) and flies onto the **real InstantPreview tee**; a shoppable card rises | Storytelling → product discovery | No pinning; the finished composition is shown (CSS media query, independent of hydration) |
| II · Wall of Drops | **slap · tear · paste-down · flip** (cycled per card) | enters viewport once | `RevealOnView` arms only off-screen items after hydration; CSS keyframes per variant; hover/focus **flips** to the raw artwork | Product discovery | All visible, no keyframes |
| III · Make your own | **instant swap** | user action | Uploaded photo becomes an object URL and is re-rendered through `createProductConfiguration` + `InstantPreview`; product switcher | Interaction feedback | Same (no animation needed) |
| IV · Trend radar | **ticker + pin-up** | scroll into view | Hashtag ticker; clippings tear/peel in; greyscale → colour on hover | Discovery | Static |
| V · Print factory | **squeegee pass** | product tab change | `key` remount runs `inkDown` (clip-path wipe) + pink squeegee bar (`cqw` translate) | Transformation | Instant swap |
| VI · Encore | **pasted type** | none | Static torn-type poster + bot mid-tag; CTAs | Conversion | Same |

## The Wall — beat sheet (progress p of the pinned section)
| p | Beat | What moves |
| --- | --- | --- |
| 0.00–0.36 | 01 SPRAY | mask stroke zig-zags (`pathLength` 0→1); spray arm sweeps ±16°; mist on |
| 0.38–0.54 | 02 DESIGN | Creature of Habit artwork bursts out of a spray circle (`clip-path: circle(0→85%)`) |
| 0.58–0.76 | 03 TEAR | artwork lifts and rotates −9°, torn bottom edge appears; mural fades to 35% |
| 0.76–0.88 | 04 WEAR | artwork shrinks (×0.42) and travels to the tee (120% desktop / 40% mobile); real tee preview fades and scales in |
| 0.88–0.97 | SHOP | product card rises: title, catalog price, "Shop this design", "Do it with my photo" |

**Bug found and fixed:** framer-motion v12 hands plain `useTransform(p, in, out)` to a native ScrollTimeline. Outside the input range that WAAPI animation reverted to the initial style, so the tee and card vanished at the end. All beats now use a clamped function transform (`useBeat`), measured to hold opacity 1 at p = 0.98 and 1.0.

## Performance notes
- No media is loaded for motion except the 988×1200 WebP artwork (lazy) and the existing product base images.
- Bot, logo and mural are inline SVG (logo ≈ 26 KB of path data, gzip-friendly). The header logo is a cached 36 KB SVG file.
- Only one rAF-driven listener (framer's scroll). The reveal observers disconnect after firing.
- Measured: see CREATIVE_QA.md (Lighthouse/CWV pending on a deployed preview; dev-server numbers aren't representative).

## Next (after approval)
- Frame-sequence or Lottie-quality bot animation for the Slasher Shop (follow OPTIKKA's staged WebP loading).
- GSAP timeline for the Halloween "poster peels off the wall" takeover.
