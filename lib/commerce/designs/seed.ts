import { curatedDesigns } from '../fixtures';
import type {
  CuratedDesignRecord,
  DesignCollection,
  DesignDrop,
} from './models';

const slugs = [
  'sunday-sidekick',
  'golden-hour',
  'coastal-air',
  'quiet-company',
  'postcard-study',
] as const;

export const developmentDesignSeeds: CuratedDesignRecord[] =
  curatedDesigns.map((design, index) => ({
    ...structuredClone(design),
    slug: slugs[index],
    asset: {
      ...structuredClone(design.asset),
      productionUrl:
        process.env.NODE_ENV !== 'production' &&
        process.env.COMMERCE_E2E_TEST_MODE === 'true'
          ? `https://assets.example.test/production/${design.asset.id}.png`
          : design.asset.url,
    },
    artistOrSource: 'PrintMe development seed',
    rightsStatus: 'internal-demo-cleared',
    publicationStatus: 'published',
    publicationDate: `2026-07-${String(20 + index).padStart(2, '0')}T12:00:00.000Z`,
    tags: [design.collection.toLowerCase(), 'development-seed'],
    defaultProductColor:
      design.recommendedProductId === 'everyday-tee' ? 'White' : 'Matte',
    defaultPlacement: {
      position: 'front',
      decorationMethod:
        design.recommendedProductId === 'everyday-tee'
          ? 'dtg'
          : 'digital-printing',
      normalizedX: 0.5,
      normalizedY: 0.5,
      normalizedScale:
        design.recommendedProductId === 'everyday-tee' ? 0.82 : 1,
      angle: 0,
      fit: 'contain',
    },
    compatibleProductIds: ['gallery-poster', 'everyday-tee'],
    incompatibleProductIds: [],
    merchandisingPriority: 100 - index,
    seoTitle: `${design.title} design | PrintMe`,
    seoDescription: design.description,
    filters: index < 2 ? ['new', 'trending'] : ['new'],
  }));

export const developmentCollectionSeeds: DesignCollection[] = [
  {
    id: 'collection-first-look',
    slug: 'first-look',
    title: 'First Look',
    description:
      'Five development-safe starting points used to validate PrintMe commerce.',
    publicationStatus: 'published',
    designIds: developmentDesignSeeds.map((design) => design.id),
  },
  {
    id: 'collection-pets',
    slug: 'pets',
    title: 'Pets',
    description: 'Development seed artwork centered on companion portraits.',
    publicationStatus: 'published',
    designIds: developmentDesignSeeds
      .filter((design) => design.collection === 'Pets')
      .map((design) => design.id),
  },
];
export const developmentDropSeeds: DesignDrop[] = [
  {
    id: 'drop-studio-seeds',
    slug: 'studio-seeds',
    title: 'Studio Seeds',
    description:
      'A development preview drop. No sales or bestseller claims are implied.',
    publicationStatus: 'published',
    publicationDate: '2026-07-29T12:00:00.000Z',
    designIds: developmentDesignSeeds.slice(0, 3).map((design) => design.id),
  },
];
