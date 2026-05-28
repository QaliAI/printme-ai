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
// TRANSFORMATION EXAMPLES (Before/After)
// ============================================================

// These use Unsplash because we need lifestyle "before" photos and
// stylized "after" art. In production, replace with real customer
// uploads + AI-generated outputs.
const U = (id: string, w = 700, q = 80) =>
  `https://images.unsplash.com/photo-${id}?w=${w}&q=${q}&auto=format&fit=crop`;

export const TRANSFORMATION_EXAMPLES = [
  {
    label: 'Pet Portrait',
    style: 'Royal Renaissance',
    before: U('1543466835-00a7907e9de1'),
    after: U('1583511655857-d19b40a7a54e'),
  },
  {
    label: 'Family Memory',
    style: 'Oil Painting',
    before: U('1511895426328-dc8714191300'),
    after: U('1578321272176-b7bbc0679853'),
  },
  {
    label: 'Travel Moment',
    style: 'Watercolor',
    before: U('1506905925346-21bda4d32df4'),
    after: U('1493246507139-91e8fad9978e'),
  },
] as const;
