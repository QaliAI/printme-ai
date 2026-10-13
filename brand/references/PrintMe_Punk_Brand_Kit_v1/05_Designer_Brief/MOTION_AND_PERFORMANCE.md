# Motion design direction / implementation contract

Six scenes:
1 OPENING (0-20%): torn paper flies into collage headline, robot reveals short painted phrase; CTA never blocked.
2 DROP WALL (20-37%): paper-peel product reveal, shoppable cards.
3 TRANSFORM (37-56%): real customer-owned or licensed demo photo -> cutout -> generated illustration -> placement.
4 TREND RADAR (56-70%): animated editorial board; content stays selectable/readable.
5 PRINT FACTORY (70-87%): accurate product-placement coordinates, animation showing applied design.
6 ENCORE (87-100%): poster wall final CTA.

Technical choices: GSAP/ScrollTrigger where carefully justified; use SVG masks, DOM transforms and opacity first; image sequences as second option; WebGL only with measured advantage. Isolate per scene, dispose listeners, avoid pinning all sections on touch, no forced smooth-scroll hijack. Reduced-motion users see complete still frames and intact CTAs.

Performance goals (75th percentile real-user field data): LCP <=2.5s, CLS <=0.1, INP <=200ms; measure with mobile profiling and shipping budget. Target sensible JS/video transfer budgets rather than fixed invented limits; document tradeoffs. Do not preload full animation sequences.
