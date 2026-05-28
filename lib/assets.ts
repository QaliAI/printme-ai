/**
 * Centralized asset manifest using REAL Printify product mockup images
 * and REAL AI-generated transformation examples (Pollinations.ai).
 *
 * Product photography: images.printify.com (same photos users see at checkout)
 * Transformation "after" images: AI-generated via Pollinations.ai
 *   (free, deterministic by seed, no API key required)
 */

const P = (id: string) => `https://images.printify.com/${id}`;

const U = (id: string, w = 800, q = 85) =>
  `https://images.unsplash.com/photo-${id}?w=${w}&q=${q}&auto=format&fit=crop`;

/**
 * Pollinations.ai URL builder for AI-generated "after" images.
 * Seed is fixed so the same prompt always returns the same image.
 */
const AI = (prompt: string, seed: number, w = 800, h = 800) =>
  `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=${w}&height=${h}&nologo=true&seed=${seed}&model=flux`;

// ============================================================
// HERO
// ============================================================

const heroPhotoUrl = U('1583337130417-3346a1be7dee', 600);
export const HERO_PHOTO = heroPhotoUrl;
export const HERO_IMAGES = {
  phoneScreen: heroPhotoUrl,
  shirtBlank: P('66d81b70295ea4f038065152'),
};

// ============================================================
// PRODUCT MOCKUPS
// ============================================================

/**
 * Match a product name to a Printify blueprint ID for mockup lookup.
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

/**
 * Print area coordinates are tuned to match standard Printify product
 * photography. Each value is a percentage of the container.
 */
export const PRODUCT_PHOTOS = {
  tshirt: {
    blueprintId: 12,
    image: P('66d81b70295ea4f038065152'),
    designArea: { top: '30%', left: '42%', width: '16%', height: '18%' },
    aspectRatio: '12/14',
    name: 'T-Shirt',
    subtitle: 'Bella+Canvas 3001',
    from: '$24',
  },
  mug: {
    blueprintId: 68,
    image: P('66c42e5361b2691da8085442'),
    designArea: { top: '38%', left: '35%', width: '24%', height: '22%' },
    aspectRatio: '3/2',
    name: 'Mug',
    subtitle: '11oz Ceramic',
    from: '$14',
  },
  canvas: {
    blueprintId: 937,
    image: P('66d954ce622599d9330fe942'),
    designArea: { top: '18%', left: '20%', width: '52%', height: '60%' },
    aspectRatio: '1/1',
    name: 'Canvas',
    subtitle: 'Matte Stretched',
    from: '$39',
  },
  poster: {
    blueprintId: 282,
    image: P('66d868f50709c7f0450662d6'),
    designArea: { top: '12%', left: '22%', width: '56%', height: '76%' },
    aspectRatio: '2/3',
    name: 'Poster',
    subtitle: 'Matte Vertical',
    from: '$12',
  },
  hoodie: {
    blueprintId: 77,
    image: P('66dedd239da894140e0af9e2'),
    designArea: { top: '34%', left: '42%', width: '16%', height: '17%' },
    aspectRatio: '1/1',
    name: 'Hoodie',
    subtitle: 'Gildan 18500',
    from: '$44',
  },
  phoneCase: {
    blueprintId: 268,
    image: P('66fcfda76bf448ffd703a472'),
    designArea: { top: '20%', left: '36%', width: '28%', height: '60%' },
    aspectRatio: '9/19',
    name: 'Phone Case',
    subtitle: 'Slim Series',
    from: '$19',
  },
  toteBag: {
    blueprintId: 553,
    image: P('66dade985b5ac06ef50ad143'),
    designArea: { top: '34%', left: '36%', width: '28%', height: '30%' },
    aspectRatio: '1/1',
    name: 'Tote Bag',
    subtitle: 'AS Colour 1001',
    from: '$18',
  },
  sticker: {
    blueprintId: 400,
    image: P('66c5e3b718c4f0cee80b1e52'),
    designArea: { top: '24%', left: '26%', width: '48%', height: '52%' },
    aspectRatio: '1/1',
    name: 'Sticker',
    subtitle: 'Kiss-Cut Vinyl',
    from: '$4',
  },
} as const;

// ============================================================
// TRANSFORMATION EXAMPLES (Real AI-generated "after" images)
// ============================================================

export interface TransformationExample {
  label: string;
  style: string;
  photo: string;       // real "before" source photo
  afterPhoto: string;  // AI-generated "after" image (Pollinations.ai)
}

export const TRANSFORMATION_EXAMPLES: readonly TransformationExample[] = [
  {
    label: 'Pet Portrait',
    style: 'Cartoon',
    photo: U('1543466835-00a7907e9de1'), // happy golden retriever close-up
    afterPhoto: AI(
      'cute cartoon golden retriever portrait, smiling, bright vibrant colors, ' +
        'pixar disney animation style, soft lighting, friendly expression, ' +
        'studio portrait, clean background',
      4242
    ),
  },
  {
    label: 'Family Memory',
    style: 'Oil Painting',
    photo: U('1511895426328-dc8714191300'), // family silhouette at sunset on beach
    afterPhoto: AI(
      'oil painting masterpiece, family silhouettes standing on beach at sunset, ' +
        'golden hour sky, classical impressionist brushstrokes, rich warm colors, ' +
        'museum quality, romantic composition',
      8888
    ),
  },
  {
    label: 'Travel Moment',
    style: 'Watercolor',
    photo: U('1506905925346-21bda4d32df4'), // snowy mountain landscape
    afterPhoto: AI(
      'watercolor painting of snowy mountain peak above clouds, ' +
        'soft wet-on-wet technique, pastel pinks and blues, ' +
        'visible paper texture, delicate brushstrokes, artistic landscape',
      1234
    ),
  },
] as const;
