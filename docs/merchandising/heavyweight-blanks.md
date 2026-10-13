# Heavyweight tee options (research, 2026-10-13)

PrintMe currently sells the **Bella+Canvas 3001** (Printify blueprint 12):
100% Airlume combed ring-spun cotton, **4.2 oz/yd²**. It is a lightweight
retail tee and must never be described as heavyweight.

Several of the researched marketplace listings (opossum, vintage Halloween)
sell on **Comfort Colors 1717**, so a heavier garment-dyed blank is the obvious
next step. Nothing below is enabled; adding a blank needs a catalog entry,
photo bases, print-area calibration, verified costs and a test order.

## Printify (catalog API, GET only, 2026-10-13)

| Blueprint | Blank | Weight | Fiber | Providers (count, examples) |
| --- | --- | --- | --- | --- |
| 706 | Comfort Colors 1717, garment-dyed | 6.1 oz/yd² (206 g/m²) | 100% ring-spun cotton | 11: Printify Choice (99), SwiftPOD (39), Stakes (52), Fulfill Engine (217) |
| 1476 | American Apparel 1301GD, garment-dyed | 6.0 oz/yd² (203 g/m²) | 100% cotton | 4: Printify Choice (99), SwiftPOD (39), Monster Digital (29) |
| 1349 | AS Colour 5080 Heavy Oversized | 8.2 oz/yd² (280 g/m²) | 100% carded cotton | 4: Printify Choice (99), SwiftPOD (39), Fulfill Engine (217) |
| 6 | Gildan 5000 Heavy Cotton | 5.3 oz/yd² (180 g/m²) | 100% cotton | 21 |
| 440 | AS Colour 5001 Staple | 5.3 oz/yd² (180 g/m²) | 100% combed cotton | 5 |

**Recommendation:** Comfort Colors 1717 through Printify Choice (provider 99,
already used for the tee, poster and mug). It matches the blank the
evidence listings use, is offered by 11 providers, and stays in the
existing Printify integration. Before launch: pull the variant list and
costs for provider 99, build photo bases from its official catalog
photography (`scripts/mockups/build-photo-bases.mjs`), and confirm DTG
appearance on garment-dyed colors with a sample order (needs owner approval).

## Tapstitch (public site, search result snippets only)

Tapstitch markets heavyweight streetwear blanks in roughly 230–430 GSM
(examples seen: 260 GSM / 7.7 oz "Heavyweight Cotton T-Shirt", 300 GSM
drop-shoulder RU0014, 330 GSM essential heavyweight). These are the
seller's own figures from search snippets, not verified specs or prices.
It would be a second fulfillment integration (no Printify blueprint), so
it suits a later premium streetwear line rather than the next step.
