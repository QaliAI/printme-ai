# Specimen Plates illustration sources

Generated for PrintMe on 2026-10-12 with Figma AI (`gemini-3.1-flash-image`,
plan "Rubin Beckner's team") from the text-only prompts below. No reference
images, seller artwork or franchise material were supplied. Output 896×1200 PNG.
`scripts/designs/build-specimen-plates.mjs` keys out the paper, upscales the
line art 4× and composes the print files in `public/designs/originals/`.

| File | Prompt (abridged to subject; all prompts add: Victorian etching, crisp black ink cross-hatching, isolated on flat white, no text, no frame, no watermark) |
| --- | --- |
| `civilized-trash-possum.png` | A cheerful opossum standing upright, holding a tiny porcelain teacup with both paws, smug and polite. Black ink plus soft pink on ears, nose, paws and tail. |
| `carved-under-protest-pumpkin.png` | A single carved jack-o'-lantern with an unimpressed, grumpy carved face, curly vine and one leaf. Black ink plus muted burnt orange, warm glow in the carved holes. |
| `professional-rummager-raccoon.png` | A raccoon standing upright, proudly holding a dented tin can above its head like a trophy. Black ink plus warm grey, teal tint on the tin only. |

Typography is set in code, never generated: DM Serif Display and Space Mono
(SIL Open Font License 1.1, see `../fonts/`), converted to outlines.

Slogans were checked on 2026-10-12 by web search; "Civilized trash",
"Will play dead to avoid small talk", "Carved under protest" and
"Professional rummager" returned no existing merch. The research behind each
concept is in `lib/merchandising/opportunity-queue.ts`.
