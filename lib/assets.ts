/** Source photos and artwork examples. Product previews live in commerce/templates. */


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
  dogCutout: '/landing/hero-dog-cutout.png',
};

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
    photo: '/landing/transformations/pet-original.webp',
    afterPhoto: '/landing/transformations/pet-cartoon.webp',
  },
  {
    label: 'Family Memory',
    style: 'Oil Painting',
    photo: '/landing/transformations/family-original.webp',
    afterPhoto: '/landing/transformations/family-oil-painting.webp',
  },
  {
    label: 'Travel Moment',
    style: 'Watercolor',
    photo: '/landing/transformations/travel-original.webp',
    afterPhoto: '/landing/transformations/travel-watercolor.webp',
  },
] as const;
