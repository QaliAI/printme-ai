/**
 * Customer-facing product facts, shared by the homepage and /products so the
 * two never drift. Sources: Printify catalog blueprints 12 (Bella+Canvas 3001),
 * 282 (matte vertical poster) and 68 (11 oz mug), checked 2026-10-12.
 * Do not add claims (weight, durability, dishwasher safety, turnaround) that
 * are not in the provider spec.
 */
export const productCopy: Record<string, { spec: string; detail: string }> = {
  'everyday-tee': {
    spec: 'Bella+Canvas 3001',
    detail: 'Lightweight 4.2 oz unisex jersey, ribbed collar, side-seamed. Direct-to-garment print.',
  },
  'gallery-poster': {
    spec: 'Museum-grade matte',
    detail: 'Archival matte paper, 189 g/m², pigment inks. 12×18 or 18×24 in, no frame.',
  },
  'keepsake-mug': {
    spec: '11 oz ceramic',
    detail: 'White ceramic, lead- and BPA-free, sublimation printed wrap.',
  },
};
