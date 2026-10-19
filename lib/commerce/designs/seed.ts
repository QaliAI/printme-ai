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
    filters: ['new', 'trending'],
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
    filters: ['new'],
  },
  'design-autumn-state-of-mind': {
    slug: 'autumn-state-of-mind',
    keywords: ['autumn', 'fall leaves', 'foliage', 'cozy', 'autumn state of mind', 'harvest'],
    compatibleProductIds: ['gallery-poster', 'everyday-tee', 'keepsake-mug'],
    merchandisingPriority: 98,
    filters: ['new', 'trending'],
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
    filters: ['new'],
  },
  'design-feast-mode': {
    slug: 'feast-mode',
    keywords: ['feast mode', 'thanksgiving dinner', 'turkey', 'holiday food', 'funny thanksgiving'],
    compatibleProductIds: ['everyday-tee', 'keepsake-mug', 'gallery-poster'],
    merchandisingPriority: 97,
    filters: ['new', 'trending'],
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
    filters: ['new'],
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
    // Retired from prominent merchandising (owner brief 2026-10-12); still personalizable.
    merchandisingPriority: 60,
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

/**
 * Issue Nº 01 originals (creative proof, 2026-10-12). Source artwork lives in
 * designs/source/*.svg and is rebuilt by scripts/designs/build-merch.mjs.
 * Deliberately filtered as 'new' only: no trending or best-seller claim
 * exists for these designs yet.
 */
// 2026-10-12: Bad Ideas Club and Creature of Habit were rejected by the owner
// and archived (assets kept in public/designs/issue-01 and designs/source).
const issue01Metadata: Record<string, { slug: string; keywords: string[]; merchandisingPriority: number; archived?: boolean }> = {
  'design-make-shit-print-shit': {
    slug: 'make-shit-print-shit',
    keywords: ['punk', 'ransom note', 'collage', 'zine', 'streetwear', 'diy', 'manifesto'],
    merchandisingPriority: 112,
  },
  'design-bad-ideas-club': {
    slug: 'bad-ideas-club',
    keywords: ['bad ideas club', 'sarcastic', 'night owl', 'collegiate', 'funny', '3am', 'internet culture'],
    merchandisingPriority: 111,
    archived: true,
  },
  'design-creature-of-habit': {
    slug: 'creature-of-habit',
    keywords: ['monster', 'coffee', 'horror comedy', 'halloween', 'creature', 'funny monster'],
    merchandisingPriority: 110,
    archived: true,
  },
};

/**
 * Specimen Plates (2026-10-12): original engraved-animal humor tees built by
 * scripts/designs/build-specimen-plates.mjs. Each concept answers a category
 * with recorded marketplace evidence (lib/merchandising/opportunity-queue.ts, admin-only);
 * the artwork and slogans are PrintMe's own. Filtered 'new' only: no sales
 * history exists for these designs yet.
 */
interface OriginalMeta {
  slug: string;
  keywords: string[];
  merchandisingPriority: number;
  defaultColor?: string;
  garmentColors?: string[];
}

const specimenPlateMetadata: Record<string, OriginalMeta> = {
  'design-civilized-trash': {
    slug: 'civilized-trash',
    keywords: ['opossum', 'possum', 'funny animal', 'vintage engraving', 'introvert', 'tea', 'trash'],
    merchandisingPriority: 122,
    defaultColor: 'Soft Cream',
    garmentColors: ['Soft Cream', 'White', 'Natural', 'Athletic Heather'],
  },
  'design-carved-under-protest': {
    slug: 'carved-under-protest',
    keywords: ['jack-o-lantern', 'pumpkin', 'funny halloween', 'vintage engraving', 'grumpy', 'october'],
    merchandisingPriority: 121,
    defaultColor: 'White',
    garmentColors: ['White', 'Natural', 'Soft Cream'],
  },
  'design-professional-rummager': {
    slug: 'professional-rummager',
    keywords: ['raccoon', 'trash panda', 'funny animal', 'vintage engraving', 'snacks', 'night owl'],
    merchandisingPriority: 120,
    defaultColor: 'Athletic Heather',
    garmentColors: ['Athletic Heather', 'White', 'Natural', 'Soft Cream', 'Sport Grey'],
  },
};

/**
 * Q4 2026 drop (2026-10-19): seven originals answering researched Q4 demand
 * (Thanksgiving game day, cozy-season type, pet-parent Christmas, book lovers,
 * capybara humour, retro horror holiday, PrintMe brand merch). Built by
 * scripts/designs/build-q4-drops.mjs; mockups are Printify renders
 * (public/merch/provenance.json). Evidence: lib/merchandising/opportunity-queue.ts.
 */
const q4DropMetadata: Record<string, OriginalMeta & { products: string[] }> = {
  'design-made-by-machines': {
    slug: 'made-by-machines',
    keywords: ['robot', 'printme mascot', 'streetwear', 'stencil', 'graffiti', 'hoodie'],
    merchandisingPriority: 141,
    products: ['heavy-hoodie', 'everyday-tee'],
    defaultColor: 'Black',
    garmentColors: ['Black', 'Heather Navy'],
  },
  'design-second-helping-athletics': {
    slug: 'second-helping-athletics',
    keywords: ['thanksgiving', 'turkey bowl', 'football', 'varsity', 'vintage mascot', 'crewneck'],
    merchandisingPriority: 140,
    products: ['cozy-crewneck', 'everyday-tee', 'gallery-poster'],
    defaultColor: 'Sport Grey',
    garmentColors: ['Sport Grey', 'Sand', 'White', 'Athletic Heather', 'Natural', 'Soft Cream'],
  },
  'design-supervising-the-decorations': {
    slug: 'supervising-the-decorations',
    keywords: ['dog', 'christmas lights', 'dog mom', 'pet parent', 'christmas', 'line art'],
    merchandisingPriority: 139,
    products: ['everyday-tee', 'cozy-crewneck', 'gallery-poster'],
    defaultColor: 'Natural',
    garmentColors: ['Natural', 'Soft Cream', 'White', 'Sand', 'Athletic Heather', 'Sport Grey'],
  },
  'design-one-more-chapter-tour': {
    slug: 'one-more-chapter-tour',
    keywords: ['book club', 'reading', 'skeleton', 'band tee', 'dark academia', 'bookish'],
    merchandisingPriority: 138,
    products: ['everyday-tee', 'cozy-crewneck'],
    defaultColor: 'Black',
    garmentColors: ['Black', 'Heather Navy'],
  },
  'design-low-power-mode': {
    slug: 'low-power-mode',
    keywords: ['capybara', 'funny animal', 'risograph', 'introvert', 'self care', 'hot spring'],
    merchandisingPriority: 137,
    products: ['everyday-tee', 'cozy-crewneck', 'gallery-poster'],
    defaultColor: 'Heather Navy',
    garmentColors: ['Heather Navy', 'Black'],
  },
  'design-soup-of-the-day': {
    slug: 'soup-of-the-day',
    keywords: ['soup', 'cozy season', 'fall', 'mug', 'retro', 'comfort food'],
    merchandisingPriority: 136,
    products: ['keepsake-mug'],
  },
  'design-he-saw-the-group-chat': {
    slug: 'he-saw-the-group-chat',
    keywords: ['krampus', 'christmas', 'horror', 'vintage poster', 'funny christmas', 'group chat'],
    merchandisingPriority: 135,
    products: ['gallery-poster'],
  },
};

export const developmentDesignSeeds: CuratedDesignRecord[] =
  curatedDesigns.map((design, index) => {
    const issueMeta = issue01Metadata[design.id];
    const plateMeta = specimenPlateMetadata[design.id];
    const q4Meta = q4DropMetadata[design.id];
    type Original = OriginalMeta & { archived?: boolean; source: string; tag: string; line: string; products: string[]; date: string };
    const original: Original | undefined = issueMeta
      ? { ...issueMeta, source: 'PrintMe Studio Issue 01', tag: 'issue-01', line: 'Issue 01', products: ['everyday-tee', 'gallery-poster', 'keepsake-mug'], date: '2026-10-12T00:00:00.000Z' }
      : plateMeta
        ? { ...plateMeta, archived: false, source: 'PrintMe Studio Originals', tag: 'specimen-plates', line: 'Specimen Plates', products: ['everyday-tee', 'gallery-poster'], date: '2026-10-12T00:00:00.000Z' }
        : q4Meta
          ? { ...q4Meta, archived: false, source: 'PrintMe Studio Q4 2026', tag: 'q4-2026', line: 'Q4 Drop', date: '2026-10-19T00:00:00.000Z' }
          : undefined;
    if (original) {
      return {
        ...structuredClone(design),
        slug: original.slug,
        artistOrSource: original.source,
        rightsStatus: 'commercial-print-cleared',
        publicationStatus: original.archived ? 'archived' : 'published',
        publicationDate: original.date,
        tags: [design.collection.toLowerCase(), original.tag, ...original.keywords],
        defaultProductColor: original.defaultColor ?? 'White',
        garmentColors: original.garmentColors,
        defaultPlacement: {
          position: 'front' as const,
          decorationMethod: 'dtg' as const,
          normalizedX: 0.5,
          normalizedY: 0.5,
          normalizedScale: 0.82,
          angle: 0,
          fit: 'contain' as const,
        },
        compatibleProductIds: original.products,
        incompatibleProductIds: [],
        merchandisingPriority: original.merchandisingPriority,
        seoTitle: `${design.title} | ${original.line} | PrintMe`,
        seoDescription: design.description,
        filters: ['new'],
        asset: {
          ...structuredClone(design.asset),
          productionUrl:
            process.env.NODE_ENV !== 'production' &&
            process.env.COMMERCE_E2E_TEST_MODE === 'true'
              ? `https://assets.example.test/production/${design.asset.id}.png`
              : design.asset.productionUrl ?? design.asset.url,
        },
      };
    }
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
      // Development seeds (demo photos, internal-demo rights) are archived, not sold.
      publicationStatus: isFall2026 ? 'published' : 'archived',
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
    id: 'collection-q4-drop',
    slug: 'q4-drop',
    title: 'The Q4 Drop',
    description:
      'Gifts people actually want: a game-day turkey crewneck, a dog tangled in Christmas lights, a Krampus poster and the PrintMe robot hoodie.',
    publicationStatus: 'published',
    designIds: [
      'design-made-by-machines',
      'design-second-helping-athletics',
      'design-supervising-the-decorations',
      'design-one-more-chapter-tour',
      'design-low-power-mode',
      'design-soup-of-the-day',
      'design-he-saw-the-group-chat',
    ],
  },
  {
    id: 'collection-christmas',
    slug: 'christmas',
    title: 'Christmas',
    description: 'For the dog who helped with the lights and the family group chat that Krampus is reading.',
    publicationStatus: 'published',
    designIds: ['design-supervising-the-decorations', 'design-he-saw-the-group-chat'],
  },
  {
    id: 'collection-funny-originals',
    slug: 'funny-originals',
    title: 'Funny Originals',
    description: 'Capybaras on low power, skeletons on chapter twelve, raccoons with ambition. Drawn for PrintMe.',
    publicationStatus: 'published',
    designIds: [
      'design-low-power-mode',
      'design-one-more-chapter-tour',
      'design-civilized-trash',
      'design-professional-rummager',
      'design-carved-under-protest',
    ],
  },
  {
    id: 'collection-specimen-plates',
    slug: 'specimen-plates',
    title: 'Specimen Plates',
    description:
      'Victorian engravings of animals with no manners and excellent posture. Funny tees, drawn like a natural-history book.',
    publicationStatus: 'published',
    designIds: ['design-civilized-trash', 'design-carved-under-protest', 'design-professional-rummager'],
  },
  {
    id: 'collection-halloween',
    slug: 'halloween',
    title: 'Halloween',
    description:
      'Halloween tees, mugs and posters: a pumpkin with objections, friendly ghosts, and haunted designs you can personalize with your family names.',
    publicationStatus: 'published',
    designIds: [
      'design-carved-under-protest',
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
      'design-second-helping-athletics',
      'design-feast-mode',
      'design-thankful-grateful-caffeinated',
      'design-thanksgiving-social-club',
      'design-leftovers-league',
    ],
  },
  {
    id: 'collection-issue-01',
    slug: 'issue-01',
    title: 'Issue Nº 01',
    description:
      'The PrintMe manifesto as a ransom-note collage: torn paper, tape and punk pink, printed to order.',
    publicationStatus: 'published',
    designIds: ['design-make-shit-print-shit'],
  },
  {
    id: 'collection-first-look',
    slug: 'first-look',
    title: 'First Look',
    description:
      'Curated starting prints crafted in the PrintMe studio.',
    publicationStatus: 'archived',
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
    publicationStatus: 'archived',
    designIds: ['design-pet-pop', 'design-pet-photo'],
  },
];

export const developmentDropSeeds: DesignDrop[] = [
  {
    id: 'drop-q4-2026',
    slug: 'q4-2026',
    title: 'Q4 2026 — Seven Gifts, Zero Filler',
    description:
      'Seven originals for Thanksgiving through New Year, on tees, crewnecks, hoodies, mugs and posters.',
    publicationStatus: 'published',
    publicationDate: '2026-10-19T00:00:00.000Z',
    designIds: [
      'design-made-by-machines',
      'design-second-helping-athletics',
      'design-supervising-the-decorations',
      'design-one-more-chapter-tour',
      'design-low-power-mode',
      'design-soup-of-the-day',
      'design-he-saw-the-group-chat',
    ],
  },
  {
    id: 'drop-specimen-plates',
    slug: 'specimen-plates',
    title: 'Specimen Plates — Fig. 04, 07 & 31',
    description:
      'Three original engraved tees: an opossum with manners, a raccoon with ambition and a pumpkin with objections.',
    publicationStatus: 'published',
    publicationDate: '2026-10-12T00:00:00.000Z',
    designIds: ['design-civilized-trash', 'design-carved-under-protest', 'design-professional-rummager'],
  },
  {
    id: 'drop-issue-01',
    slug: 'issue-01',
    title: 'Issue Nº 01 — Make Shit. Print Shit.',
    description:
      'The PrintMe manifesto tee that launched the punk collage studio.',
    publicationStatus: 'published',
    publicationDate: '2026-10-12T00:00:00.000Z',
    designIds: ['design-make-shit-print-shit'],
  },
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
      'Curated studio originals prepared for custom physical prints.',
    publicationStatus: 'archived',
    publicationDate: '2026-07-29T12:00:00.000Z',
    designIds: [
      'design-pet-pop',
      'design-family-oil',
      'design-travel-watercolor',
    ],
  },
];
