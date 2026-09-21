import { curatedDesigns } from '../fixtures';
import type {
  CuratedDesignRecord,
  DesignCollection,
  DesignDrop,
  DesignFilter,
} from './models';

const legacySlugs = [
  'sunday-sidekick',
  'golden-hour',
  'coastal-air',
  'quiet-company',
  'postcard-study',
] as const;

const fall2026Metadata: Record<
  string,
  {
    slug: string;
    keywords: string[];
    compatibleProductIds: string[];
    merchandisingPriority: number;
    filters: DesignFilter[];
  }
> = {
  'design-boo-crew': {
    slug: 'boo-crew',
    keywords: ['ghosts', 'halloween', 'spooky', 'cute', 'boo crew', 'autumn', 'trick or treat'],
    compatibleProductIds: ['everyday-tee', 'keepsake-mug', 'gallery-poster'],
    merchandisingPriority: 99,
    filters: ['new', 'trending', 'bestsellers'],
  },
  'design-here-for-the-boos': {
    slug: 'here-for-the-boos',
    keywords: ['here for the boos', 'halloween party', 'cocktail', 'ghosts', 'funny halloween'],
    compatibleProductIds: ['keepsake-mug', 'everyday-tee', 'gallery-poster'],
    merchandisingPriority: 96,
    filters: ['new', 'trending'],
  },
  'design-little-pumpkin': {
    slug: 'little-pumpkin',
    keywords: ['pumpkin', 'little pumpkin', 'cute halloween', 'autumn', 'baby pumpkin', 'harvest'],
    compatibleProductIds: ['gallery-poster', 'everyday-tee', 'keepsake-mug'],
    merchandisingPriority: 94,
    filters: ['new', 'bestsellers'],
  },
  'design-autumn-state-of-mind': {
    slug: 'autumn-state-of-mind',
    keywords: ['autumn', 'fall leaves', 'foliage', 'cozy', 'autumn state of mind', 'harvest'],
    compatibleProductIds: ['gallery-poster', 'everyday-tee', 'keepsake-mug'],
    merchandisingPriority: 98,
    filters: ['new', 'trending', 'bestsellers'],
  },
  'design-powered-by-pumpkin-spice': {
    slug: 'powered-by-pumpkin-spice',
    keywords: ['pumpkin spice', 'latte', 'coffee', 'fall drinks', 'cozy', 'cafe', 'autumn'],
    compatibleProductIds: ['keepsake-mug', 'everyday-tee', 'gallery-poster'],
    merchandisingPriority: 95,
    filters: ['new', 'trending'],
  },
  'design-sweater-weather': {
    slug: 'sweater-weather',
    keywords: ['sweater weather', 'cozy', 'knitwear', 'autumn', 'chill', 'hoodie', 'fall vibes'],
    compatibleProductIds: ['everyday-tee', 'keepsake-mug', 'gallery-poster'],
    merchandisingPriority: 93,
    filters: ['new', 'bestsellers'],
  },
  'design-feast-mode': {
    slug: 'feast-mode',
    keywords: ['feast mode', 'thanksgiving dinner', 'turkey', 'holiday food', 'funny thanksgiving'],
    compatibleProductIds: ['everyday-tee', 'keepsake-mug', 'gallery-poster'],
    merchandisingPriority: 97,
    filters: ['new', 'trending', 'bestsellers'],
  },
  'design-thankful-grateful-caffeinated': {
    slug: 'thankful-grateful-caffeinated',
    keywords: ['thankful grateful caffeinated', 'thanksgiving coffee', 'holiday morning', 'gratitude'],
    compatibleProductIds: ['keepsake-mug', 'everyday-tee', 'gallery-poster'],
    merchandisingPriority: 92,
    filters: ['new', 'trending'],
  },
  'design-thanksgiving-social-club': {
    slug: 'thanksgiving-social-club',
    keywords: ['thanksgiving social club', 'family gathering', 'dinner', 'harvest', 'heritage', 'crest'],
    compatibleProductIds: ['gallery-poster', 'everyday-tee', 'keepsake-mug'],
    merchandisingPriority: 91,
    filters: ['new', 'bestsellers'],
  },
  'design-haunted-household': {
    slug: 'haunted-household',
    keywords: ['haunted household', 'family ghost', 'halloween pet', 'custom halloween', 'spooky family', 'ghosts'],
    compatibleProductIds: ['everyday-tee', 'keepsake-mug', 'gallery-poster'],
    merchandisingPriority: 105,
    filters: ['new', 'trending'],
  },
  'design-library-of-lost-hours': {
    slug: 'library-of-lost-hours',
    keywords: ['library of lost hours', 'book club', 'antique library card', 'halloween mug', 'dark academia', 'gothic'],
    compatibleProductIds: ['keepsake-mug', 'gallery-poster', 'everyday-tee'],
    merchandisingPriority: 104,
    filters: ['new', 'trending'],
  },
  'design-midnight-hayride': {
    slug: 'midnight-hayride',
    keywords: ['midnight hayride', 'western halloween', 'cowboy ghost', 'country music', 'retro halloween', 'hayride'],
    compatibleProductIds: ['everyday-tee', 'keepsake-mug', 'gallery-poster'],
    merchandisingPriority: 103,
    filters: ['new', 'trending'],
  },
  'design-night-garden-society': {
    slug: 'night-garden-society',
    keywords: ['night garden society', 'luna moth', 'dark romantic', 'botanical', 'autumn flora', 'celestial'],
    compatibleProductIds: ['gallery-poster', 'everyday-tee', 'keepsake-mug'],
    merchandisingPriority: 102,
    filters: ['new', 'trending'],
  },
  'design-field-notes-after-dark': {
    slug: 'field-notes-after-dark',
    keywords: ['field notes after dark', 'naturalist study', 'barn owl', 'autumn wildlife', 'field journal', 'woodland'],
    compatibleProductIds: ['gallery-poster', 'keepsake-mug', 'everyday-tee'],
    merchandisingPriority: 101,
    filters: ['new', 'trending'],
  },
  'design-leftovers-league': {
    slug: 'leftovers-league',
    keywords: ['leftovers league', 'thanksgiving shirts', 'family thanksgiving', 'feast', 'pie inspector', 'turkey'],
    compatibleProductIds: ['everyday-tee', 'keepsake-mug', 'gallery-poster'],
    merchandisingPriority: 100,
    filters: ['new', 'trending'],
  },
};

export const developmentDesignSeeds: CuratedDesignRecord[] =
  curatedDesigns.map((design, index) => {
    const isFall2026 = design.id in fall2026Metadata;
    const fallMeta = fall2026Metadata[design.id];
    const slug = isFall2026 ? fallMeta.slug : legacySlugs[index];

    const defaultPlacement =
      design.recommendedProductId === 'everyday-tee'
        ? {
            position: 'front' as const,
            decorationMethod: 'dtg' as const,
            normalizedX: 0.5,
            normalizedY: 0.5,
            normalizedScale: 0.82,
            angle: 0,
            fit: 'contain' as const,
          }
        : design.recommendedProductId === 'keepsake-mug'
          ? {
              position: 'front' as const,
              decorationMethod: 'sublimation' as const,
              normalizedX: 0.5,
              normalizedY: 0.5,
              normalizedScale: 0.8,
              angle: 0,
              fit: 'contain' as const,
            }
          : {
              position: 'front' as const,
              decorationMethod: 'digital-printing' as const,
              normalizedX: 0.5,
              normalizedY: 0.5,
              normalizedScale: 1,
              angle: 0,
              fit: 'contain' as const,
            };

    const defaultProductColor =
      design.recommendedProductId === 'everyday-tee'
        ? 'White'
        : design.recommendedProductId === 'keepsake-mug'
          ? 'White'
          : 'Matte';

    return {
      ...structuredClone(design),
      slug,
      asset: {
        ...structuredClone(design.asset),
        productionUrl:
          process.env.NODE_ENV !== 'production' &&
          process.env.COMMERCE_E2E_TEST_MODE === 'true'
            ? `https://assets.example.test/production/${design.asset.id}.png`
            : design.asset.productionUrl ?? design.asset.url,
      },
      artistOrSource: isFall2026
        ? 'PrintMe Studio Fall 2026'
        : 'PrintMe development seed',
      rightsStatus: isFall2026 ? 'commercial-print-cleared' : 'internal-demo-cleared',
      publicationStatus: 'published',
      publicationDate: isFall2026
        ? '2026-09-21T00:00:00.000Z'
        : `2026-07-${String(20 + index).padStart(2, '0')}T12:00:00.000Z`,
      tags: isFall2026
        ? [design.collection.toLowerCase(), 'fall-2026', ...fallMeta.keywords]
        : [design.collection.toLowerCase(), 'development-seed'],
      defaultProductColor,
      defaultPlacement,
      compatibleProductIds: isFall2026
        ? fallMeta.compatibleProductIds
        : ['gallery-poster', 'everyday-tee'],
      incompatibleProductIds: [],
      merchandisingPriority: isFall2026
        ? fallMeta.merchandisingPriority
        : 80 - index,
      seoTitle: `${design.title} | Fall 2026 Collection | PrintMe`,
      seoDescription: design.description,
      filters: isFall2026
        ? fallMeta.filters
        : index < 2
          ? ['new', 'trending']
          : ['new'],
    };
  });

export const developmentCollectionSeeds: DesignCollection[] = [
  {
    id: 'collection-halloween',
    slug: 'halloween',
    title: 'Halloween',
    description:
      'Spooky-cute spirits, friendly ghosts, and festive pumpkin patch favorites.',
    publicationStatus: 'published',
    designIds: [
      'design-boo-crew',
      'design-here-for-the-boos',
      'design-little-pumpkin',
      'design-haunted-household',
      'design-library-of-lost-hours',
      'design-midnight-hayride',
    ],
  },
  {
    id: 'collection-fall',
    slug: 'fall',
    title: 'Fall',
    description:
      'Cozy autumn foliage, sweater weather comforts, and pumpkin spice essentials.',
    publicationStatus: 'published',
    designIds: [
      'design-autumn-state-of-mind',
      'design-powered-by-pumpkin-spice',
      'design-sweater-weather',
      'design-night-garden-society',
      'design-field-notes-after-dark',
    ],
  },
  {
    id: 'collection-thanksgiving',
    slug: 'thanksgiving',
    title: 'Thanksgiving',
    description:
      'Feast mode apparel, holiday morning keepsakes, and heirloom harvest crests.',
    publicationStatus: 'published',
    designIds: [
      'design-feast-mode',
      'design-thankful-grateful-caffeinated',
      'design-thanksgiving-social-club',
      'design-leftovers-league',
    ],
  },
  {
    id: 'collection-first-look',
    slug: 'first-look',
    title: 'First Look',
    description:
      'Five development-safe starting points used to validate PrintMe commerce.',
    publicationStatus: 'published',
    designIds: [
      'design-pet-pop',
      'design-family-oil',
      'design-travel-watercolor',
      'design-pet-photo',
      'design-travel-photo',
    ],
  },
  {
    id: 'collection-pets',
    slug: 'pets',
    title: 'Pets',
    description: 'Artwork centered on companion portraits.',
    publicationStatus: 'published',
    designIds: ['design-pet-pop', 'design-pet-photo'],
  },
];

export const developmentDropSeeds: DesignDrop[] = [
  {
    id: 'drop-fall-2026',
    slug: 'fall-2026',
    title: 'Fall 2026 Merchandise Collection',
    description:
      'Official launch drop featuring seasonal designs across Halloween, Fall, and Thanksgiving.',
    publicationStatus: 'published',
    publicationDate: '2026-09-21T00:00:00.000Z',
    designIds: [
      'design-boo-crew',
      'design-here-for-the-boos',
      'design-little-pumpkin',
      'design-autumn-state-of-mind',
      'design-powered-by-pumpkin-spice',
      'design-sweater-weather',
      'design-feast-mode',
      'design-thankful-grateful-caffeinated',
      'design-thanksgiving-social-club',
      'design-haunted-household',
      'design-library-of-lost-hours',
      'design-midnight-hayride',
      'design-night-garden-society',
      'design-field-notes-after-dark',
      'design-leftovers-league',
    ],
  },
  {
    id: 'drop-studio-seeds',
    slug: 'studio-seeds',
    title: 'Studio Seeds',
    description:
      'A development preview drop. No sales or bestseller claims are implied.',
    publicationStatus: 'published',
    publicationDate: '2026-07-29T12:00:00.000Z',
    designIds: [
      'design-pet-pop',
      'design-family-oil',
      'design-travel-watercolor',
    ],
  },
];
