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
  dogCutout: '/landing/hero-dog-cutout.png',
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

// ============================================================
// STYLE PRESET SAMPLES (Real AI-generated previews for each style)
// ============================================================

export interface StylePresetSample {
  slug: string;
  name: string;
  tagline: string;
  /** Tailwind gradient classes used as image-load skeleton */
  gradient: string;
  /** AI-generated sample image (Pollinations.ai, fixed seed) */
  sample: string;
}

/**
 * 12 style preset samples — same subject (cute golden retriever puppy)
 * rendered in each AI style. Using one subject across all twelve makes
 * the style differences immediately readable side-by-side.
 */
export const STYLE_PRESET_SAMPLES: readonly StylePresetSample[] = [
  {
    slug: 'oil-painting',
    name: 'Oil Painting',
    tagline: 'Rich, classical',
    gradient: 'from-amber-600 to-orange-700',
    sample: AI(
      'oil painting masterpiece of golden retriever puppy portrait, ' +
        'rich classical brushstrokes, warm tones, museum quality, rembrandt style',
      1001
    ),
  },
  {
    slug: 'watercolor',
    name: 'Watercolor',
    tagline: 'Soft, dreamy',
    gradient: 'from-cyan-500 to-blue-600',
    sample: AI(
      'watercolor painting of golden retriever puppy, soft pastel washes, ' +
        'dreamy delicate brushstrokes, visible paper texture, gentle lighting',
      1002
    ),
  },
  {
    slug: 'pop-art',
    name: 'Pop Art',
    tagline: 'Bold, vibrant',
    gradient: 'from-rose-500 to-red-600',
    sample: AI(
      'pop art portrait of golden retriever puppy, andy warhol style, ' +
        'bold flat colors, halftone dots, vibrant pink yellow blue, screen print',
      1003
    ),
  },
  {
    slug: 'vintage',
    name: 'Vintage',
    tagline: 'Warm, nostalgic',
    gradient: 'from-amber-700 to-yellow-700',
    sample: AI(
      'vintage 1970s polaroid photo of golden retriever puppy, ' +
        'faded warm sepia tones, film grain, nostalgic, soft focus, retro',
      1004
    ),
  },
  {
    slug: 'bw-editorial',
    name: 'B&W Editorial',
    tagline: 'Cinematic mono',
    gradient: 'from-slate-700 to-slate-900',
    sample: AI(
      'black and white editorial photography portrait of golden retriever puppy, ' +
        'dramatic chiaroscuro lighting, high contrast, magazine cover quality, ' +
        'cinematic mood',
      1005
    ),
  },
  {
    slug: 'cartoon',
    name: 'Cartoon',
    tagline: 'Playful lines',
    gradient: 'from-yellow-500 to-pink-500',
    sample: AI(
      'cartoon illustration of cute golden retriever puppy, disney pixar animation style, ' +
        'bold playful outlines, bright cheerful colors, friendly smile, big eyes',
      1006
    ),
  },
  {
    slug: 'royal-portrait',
    name: 'Royal Portrait',
    tagline: 'Regal, elegant',
    gradient: 'from-purple-600 to-amber-500',
    sample: AI(
      'renaissance royal portrait of golden retriever puppy wearing crown and ' +
        'elegant velvet robe, regal background, classical oil painting, ornate frame',
      1007
    ),
  },
  {
    slug: 'sketch',
    name: 'Sketch',
    tagline: 'Hand-drawn',
    gradient: 'from-slate-400 to-slate-600',
    sample: AI(
      'detailed pencil sketch of golden retriever puppy, hand-drawn graphite, ' +
        'fine cross-hatching, shading, sketchbook page, realistic illustration',
      1008
    ),
  },
  {
    slug: 'line-art',
    name: 'Line Art',
    tagline: 'Minimal, clean',
    gradient: 'from-slate-500 to-slate-700',
    sample: AI(
      'minimal continuous line art drawing of golden retriever puppy, ' +
        'single black line on white background, elegant minimalist, modern',
      1009
    ),
  },
  {
    slug: 'cinematic',
    name: 'Cinematic',
    tagline: 'Dramatic mood',
    gradient: 'from-indigo-600 to-purple-800',
    sample: AI(
      'cinematic film still of golden retriever puppy, dramatic moody lighting, ' +
        'shallow depth of field, film grain, atmospheric, anamorphic widescreen',
      1010
    ),
  },
  {
    slug: 'toy-style',
    name: 'Toy Style',
    tagline: 'Soft 3D',
    gradient: 'from-pink-400 to-rose-500',
    sample: AI(
      'soft 3D toy figurine of golden retriever puppy, pixar character render, ' +
        'cute kawaii, plush textures, studio lighting, pastel colors',
      1011
    ),
  },
  {
    slug: 'clean-cutout',
    name: 'Clean Cutout',
    tagline: 'Crisp subject',
    gradient: 'from-emerald-500 to-teal-600',
    sample: AI(
      'clean studio cutout of golden retriever puppy, isolated on pure white background, ' +
        'sharp crisp edges, professional product photography, soft shadow',
      1012
    ),
  },
];

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
