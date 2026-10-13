# Web design component spec / development handoff

## Principles
Storefront and campaign pages are theatrical; the art editor and cart are precision tools. Preserve semantic HTML and operational clarity. Use content-driven variants instead of hardcoding dates or claims.

## Header
Desktop 80-88px sticky with compact horizontal logo, navigation SHOP / MAKE / TREND RADAR, Search, Cart. Background newsprint. On scroll, reduce header height without causing layout shifts. Mobile 64px; icon or utility mark plus menu, Upload CTA and cart.

## Hero
Desktop 12-column grid with dramatic torn-paper headline in 6 columns, robot graffiti sequence in opposite 6. Two visible CTAs: MAKE SOMETHING / SHOP THE DROPS. Mobile no animation gate; artwork still plus CTA visible without scrolling or waiting. Hero art is not the printed product asset.

## Product wall
Cards have predictable click targets: actual product image, product/design title, price verified from catalog and personalized CTA. Collage decorations must be noninteractive and aria-hidden. Product photos use consistent lighting and real print placement.

## Upload studio
Neutral work surface. Clear separate steps UPLOAD / CUTOUT / STYLE / PLACE / CHECKOUT. Avoid scroll scrub, jitter or grunge overlay on critical preview. Show processing states, undo, errors, pricing and print-safe areas.

## Trend section
Only show live/verified popularity when source and timestamp exist. Otherwise use category label 'INSPIRATION', not 'BESTSELLER' or fabricated metrics. Each trend links to an original approved design variation rather than copied artwork.

## States
All controls require hover/focus/pressed/disabled/loading/error. Forms need labels, validation messages, keyboard operations. On mobile hit targets min 44x44 CSS px.

## Breakpoints
Mobile 360-767; tablet 768-1199; desktop >=1200; large 1440+. Avoid crop/letter clipping at 320 where reasonable.

## Asset instructions
Use crisp transparent SVG for branded lockups, pre-rendered webp/avif for photographic scenes, SVG masks for tear shapes, optimally compressed animation sequences for graffiti if needed. Keep real print PNG assets separate and protected.

## Release
Do not make brand kit the product implementation. Build responsive components + Storybook or screenshot gallery, then follow route-by-route integration with visual regressions and real backend smoke checks.
