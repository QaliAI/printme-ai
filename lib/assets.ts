/**
 * Centralized asset manifest using REAL Printify product mockup images.
 *
 * All product photography comes directly from Printify's catalog
 * (images.printify.com CDN) — these are the same product photos that
 * users will see when they checkout, so the landing page accurately
 * represents what they'll buy.
 *
 * Blueprint IDs and image URLs were fetched via the Printify Catalog API.
 * To refresh: `node scripts/explore-printify-catalog.mjs`
 *
 * Print area positioning was tuned to match Printify's standard product
 * photography layout (centered products on white backgrounds).
 */

// Printify CDN — image IDs map to actual product photos in their catalog
const P = (id: string) => `https://images.printify.com/${id}`;

// ============================================================
// HERO
// ============================================================

// Hero uses an Unsplash lifestyle photo because we want a personal "real
// life photograph" feel, not a product shot. Swap to a real customer
// photo when one is available.
const heroPhotoUrl =
  'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=600&q=85&auto=format&fit=crop';

export const HERO_PHOTO = heroPhotoUrl;

export const HERO_IMAGES = {
  phoneScreen: heroPhotoUrl,
  // Hero t-shirt uses a Printify blank tee mockup so the design "transfers" cleanly
  shirtBlank: P('66d81b70295ea4f038065152'), // Bella+Canvas 3001 — clean front view
};

// ============================================================
// PRODUCT MOCKUPS (from Printify Catalog API)
// ============================================================

/**
 * Map a product name (from Supabase or anywhere) to a Printify blueprint ID
 * so we can find the matching mockup for it. Case- and whitespace-insensitive.
 * Returns undefined if no match.
 */
export function blueprintIdForProductName(name: string | undefined): number | undefined {
  if (!name) return undefined;
  const normalized = name.toLowerCase().replace(/[^a-z0-9]/g, '');

  if (normalized.includes('tshirt') || normalized === 'tee' || normalized.endsWith('tee')) return 12;
  if (normalized.includes('hoodie') || normalized.includes('sweatshirt')) return 77;
  if (normalized.includes('mug')) return 68;
  if (normalized.includes('canvas') && !normalized.includes('tote')) return 937;
  if (normalized.includes('poster')) return 282;
  if (normalized.includes('phonecase') || normalized.includes('case')) return 268;
  if (normalized.includes('tote') || normalized.includes('bag')) return 553;
  if (normalized.includes('sticker')) return 400;

  return undefined;
}

export const PRODUCT_PHOTOS = {
  tshirt: {
    blueprintId: 12,
    image: P('66d81b70295ea4f038065152'), // Bella+Canvas 3001 — front, white, centered
    designArea: { top: '23%', left: '40%', width: '20%', height: '22%' },
    aspectRatio: '12/14',
    name: 'T-Shirt',
    subtitle: 'Bella+Canvas 3001',
    from: '$24',
  },
  mug: {
    blueprintId: 68,
    image: P('66c42e5361b2691da8085442'), // 11oz Mug — side view
    designArea: { top: '38%', left: '34%', width: '32%', height: '24%' },
    aspectRatio: '3/2',
    name: 'Mug',
    subtitle: '11oz Ceramic',
    from: '$14',
  },
  canvas: {
    blueprintId: 937,
    image: P('66d954ce622599d9330fe942'), // Matte Canvas, Stretched — front view
    designArea: { top: '14%', left: '14%', width: '72%', height: '72%' },
    aspectRatio: '1/1',
    name: 'Canvas',
    subtitle: 'Matte Stretched',
    from: '$39',
  },
  poster: {
    blueprintId: 282,
    image: P('66d868f50709c7f0450662d6'), // Matte Vertical Poster — front view
    designArea: { top: '8%', left: '18%', width: '64%', height: '84%' },
    aspectRatio: '2/3',
    name: 'Poster',
    subtitle: 'Matte Vertical',
    from: '$12',
  },
  hoodie: {
    blueprintId: 77,
    image: P('66dedd239da894140e0af9e2'), // Gildan 18500 — front view, blank
    designArea: { top: '32%', left: '40%', width: '20%', height: '20%' },
    aspectRatio: '1/1',
    name: 'Hoodie',
    subtitle: 'Gildan 18500',
    from: '$44',
  },
  phoneCase: {
    blueprintId: 268,
    image: P('66fcfda76bf448ffd703a472'), // Slim Phone Case — back view
    designArea: { top: '14%', left: '34%', width: '32%', height: '70%' },
    aspectRatio: '9/19',
    name: 'Phone Case',
    subtitle: 'Slim Series',
    from: '$19',
  },
  toteBag: {
    blueprintId: 553,
    image: P('66dade985b5ac06ef50ad143'), // Cotton Tote Bag — front, blank
    designArea: { top: '30%', left: '34%', width: '32%', height: '36%' },
    aspectRatio: '1/1',
    name: 'Tote Bag',
    subtitle: 'AS Colour 1001',
    from: '$18',
  },
  sticker: {
    blueprintId: 400,
    image: P('66c5e3b718c4f0cee80b1e52'), // Kiss-Cut Stickers
    designArea: { top: '20%', left: '20%', width: '60%', height: '60%' },
    aspectRatio: '1/1',
    name: 'Sticker',
    subtitle: 'Kiss-Cut Vinyl',
    from: '$4',
  },
} as const;

// ============================================================
// TRANSFORMATION EXAMPLES (Before/After with style filter)
// ============================================================

// Each example uses the SAME source photo for before and after, with a
// CSS filter applied to the "after" side to demonstrate what each AI
// style would do to that specific photo. This is honest preview
// behavior — same subject, transformed.
//
// Filters are tuned to approximate each named style's character:
//  - Royal Renaissance: warm sepia, increased contrast, vignette feel
//  - Oil Painting: rich saturation, slight darkening, contrast bump
//  - Watercolor: softened saturation, lifted brightness, gentle blur
//
// When real AI-generated samples become available, swap the `after`
// field with the actual generated URL and drop the `afterFilter`.
const U = (id: string, w = 800, q = 85) =>
  `https://images.unsplash.com/photo-${id}?w=${w}&q=${q}&auto=format&fit=crop`;

export interface TransformationExample {
  label: string;
  style: string;
  /** Source photo URL — used for BOTH before and after sides */
  photo: string;
  /** Optional override if you have an actual AI-generated "after" image */
  afterPhoto?: string;
  /** CSS filter applied to the "after" side when afterPhoto is not provided */
  afterFilter: string;
}

export const TRANSFORMATION_EXAMPLES: readonly TransformationExample[] = [
  {
    label: 'Pet Portrait',
    style: 'Royal Renaissance',
    photo: U('1543466835-00a7907e9de1'), // golden retriever close-up
    afterFilter:
      'sepia(0.55) saturate(1.45) contrast(1.22) brightness(0.9) hue-rotate(-5deg)',
  },
  {
    label: 'Family Memory',
    style: 'Oil Painting',
    photo: U('1511895426328-dc8714191300'), // family silhouette at sunset
    afterFilter:
      'saturate(1.55) contrast(1.28) brightness(0.92) sepia(0.15) hue-rotate(-3deg)',
  },
  {
    label: 'Travel Moment',
    style: 'Watercolor',
    photo: U('1506905925346-21bda4d32df4'), // mountain landscape
    afterFilter:
      'saturate(0.75) contrast(0.92) brightness(1.1) blur(0.4px) hue-rotate(5deg)',
  },
] as const;
