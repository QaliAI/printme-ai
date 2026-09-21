import { z } from 'zod';

export type SeasonalCategory = 'halloween' | 'cozy-fall' | 'thanksgiving';
export type EvidenceType =
  | 'keyword-demand'
  | 'marketplace-listings'
  | 'editorial-forecast';
export type ReviewStatus = 'approved' | 'in-review' | 'retired';
export type PublicationStatus = 'published' | 'draft' | 'archived';
export type PersonalizationType =
  | 'family-pet'
  | 'library-card'
  | 'location-chapter'
  | 'naturalist-specimen'
  | 'family-roles'
  | 'none';

export interface SourceReference {
  name: string;
  url: string;
  marketRegion: string;
  observedDate: string;
  whatWasObserved: string;
  limitations: string;
}

export interface SeasonalTrendCard {
  id: string;
  theme: string;
  category: SeasonalCategory;
  categoryLabel: string;
  headline: string;
  description: string;
  relatedDesignSlug: string;
  relatedDesignId: string;
  recommendedProductId: string;
  recommendedProductName: string;
  verifiedPriceFormatted: string;
  verifiedPriceCents: number;
  mockupUrl: string;
  isPersonalizationSupported: boolean;
  personalizationType: PersonalizationType;
  personalizationPrompt?: string;
  evidenceType: EvidenceType;
  sources: SourceReference[];
  internalNotes: string;
  reviewStatus: ReviewStatus;
  publicationStatus: PublicationStatus;
  featuredOrder: number;
  retiredAt: string | null;
}

export const seasonalTrendCards: SeasonalTrendCard[] = [
  {
    id: 'trend-haunted-household',
    theme: 'The Haunted Household',
    category: 'halloween',
    categoryLabel: 'Halloween',
    headline: 'The Haunted Household',
    description:
      'A charming custom Halloween family and pet design featuring friendly ghosts, glowing pumpkins, and personalized household names.',
    relatedDesignSlug: 'haunted-household',
    relatedDesignId: 'design-haunted-household',
    recommendedProductId: 'everyday-tee',
    recommendedProductName: 'Everyday Tee',
    verifiedPriceFormatted: '$34.00',
    verifiedPriceCents: 3400,
    mockupUrl: '/designs/seasonal-edit/mockups/haunted-household-tee.webp',
    isPersonalizationSupported: true,
    personalizationType: 'family-pet',
    personalizationPrompt: 'Customize your family name and member or pet names',
    evidenceType: 'marketplace-listings',
    sources: [
      {
        name: 'Etsy Family Ghost Shirt Market',
        url: 'https://www.etsy.com/market/family_ghost_t_shirts',
        marketRegion: 'US',
        observedDate: '2026-08-25',
        whatWasObserved:
          'High merchant listing density and recurring buyer demand for matching family ghost shirts with customizable member names, child ghosts, and pet ears.',
        limitations:
          'Public marketplace listings and customer review activity indicate demand; private shop unit sales and revenue are not publicly verifiable.',
      },
      {
        name: 'Etsy Custom Halloween Pet Shirt Market',
        url: 'https://www.etsy.com/market/custom_halloween_pet_shirt',
        marketRegion: 'US',
        observedDate: '2026-08-27',
        whatWasObserved:
          'Elevated seasonal interest in custom pet portraits paired with spooky accessories and playful family titles.',
        limitations:
          'Listing counts indicate merchant competition; conversion rates vary by seller reputation and review velocity.',
      },
    ],
    internalNotes:
      'Original PrintMe artwork features retro collegiate typography and charming ghost characters with support for custom family names and pet portraits.',
    reviewStatus: 'approved',
    publicationStatus: 'published',
    featuredOrder: 1,
    retiredAt: null,
  },
  {
    id: 'trend-library-lost-hours',
    theme: 'Library of Lost Hours',
    category: 'halloween',
    categoryLabel: 'Halloween',
    headline: 'Library of Lost Hours',
    description:
      'An antique library checkout card for midnight readers, featuring vintage catalog stamps, gothic literature details, and custom reader name.',
    relatedDesignSlug: 'library-of-lost-hours',
    relatedDesignId: 'design-library-of-lost-hours',
    recommendedProductId: 'keepsake-mug',
    recommendedProductName: 'Keepsake Mug',
    verifiedPriceFormatted: '$19.00',
    verifiedPriceCents: 1900,
    mockupUrl: '/designs/seasonal-edit/mockups/library-of-lost-hours-mug.webp',
    isPersonalizationSupported: true,
    personalizationType: 'library-card',
    personalizationPrompt: 'Personalize the reader name and spooky checkout date',
    evidenceType: 'keyword-demand',
    sources: [
      {
        name: 'Etsy Halloween Book Club Shirt & Mug Market',
        url: 'https://www.etsy.com/market/bookclub_halloween_shirts',
        marketRegion: 'US',
        observedDate: '2026-08-28',
        whatWasObserved:
          'Consistent surge in dark academia and "spooky book club" searches, with high engagement on antique library card date-due stamp designs.',
        limitations:
          'Search ranking and tag popularity do not guarantee individual listing profitability.',
      },
      {
        name: 'Pinterest Predicts 2026 (Poetcore / Nostalgic Rituals)',
        url: 'https://newsroom.pinterest.com/news/pinterest-predicts-nonconformity-self-preservation-and-escapism-drive-21-trends-for-2026/',
        marketRegion: 'Global / US',
        observedDate: '2026-08-20',
        whatWasObserved:
          'Macro trend toward tactile, analog rituals, antiquarian stationery, and atmospheric literary escapism.',
        limitations:
          'Editorial trend forecast based on platform search saves; not a direct measure of e-commerce SKU sales.',
      },
    ],
    internalNotes:
      'Original antique library card layout with aged borders, stamped return dates, and customizable reader patron name.',
    reviewStatus: 'approved',
    publicationStatus: 'published',
    featuredOrder: 2,
    retiredAt: null,
  },
  {
    id: 'trend-midnight-hayride',
    theme: 'Midnight Hayride Social Club',
    category: 'halloween',
    categoryLabel: 'Halloween',
    headline: 'Midnight Hayride Social Club',
    description:
      'A retro Western spectral illustration combining country-music iconography, haunted hayride banners, and optional custom chapter or city.',
    relatedDesignSlug: 'midnight-hayride',
    relatedDesignId: 'design-midnight-hayride',
    recommendedProductId: 'everyday-tee',
    recommendedProductName: 'Everyday Tee',
    verifiedPriceFormatted: '$34.00',
    verifiedPriceCents: 3400,
    mockupUrl: '/designs/seasonal-edit/mockups/midnight-hayride-tee.webp',
    isPersonalizationSupported: true,
    personalizationType: 'location-chapter',
    personalizationPrompt: 'Add your custom city, town, or party chapter',
    evidenceType: 'keyword-demand',
    sources: [
      {
        name: 'eRank August 2026 Etsy US Keyword Report',
        url: 'https://help.erank.com/blog/top-keywords-on-etsy/',
        marketRegion: 'US',
        observedDate: '2026-08-30',
        whatWasObserved:
          'Growing search volume for "western halloween shirt" and "retro fall social club" aesthetics combining desert/country motifs with spooky season elements.',
        limitations:
          'Keyword search queries reflect consumer curiosity and browsing intent, not verified purchase completion.',
      },
    ],
    internalNotes:
      'Original vintage Western lockup with cowboy ghost silhouette, lasso frame, and customizable hometown or party chapter banner.',
    reviewStatus: 'approved',
    publicationStatus: 'published',
    featuredOrder: 3,
    retiredAt: null,
  },
  {
    id: 'trend-night-garden',
    theme: 'Night Garden Society',
    category: 'cozy-fall',
    categoryLabel: 'Cozy Fall',
    headline: 'Night Garden Society',
    description:
      'An elegant, dark-romantic fall composition featuring an intricate luna moth, night-blooming botanicals, and celestial gold foil detailing.',
    relatedDesignSlug: 'night-garden-society',
    relatedDesignId: 'design-night-garden-society',
    recommendedProductId: 'gallery-poster',
    recommendedProductName: 'Gallery Poster',
    verifiedPriceFormatted: '$29.00',
    verifiedPriceCents: 2900,
    mockupUrl: '/designs/seasonal-edit/mockups/night-garden-society-poster.webp',
    isPersonalizationSupported: false,
    personalizationType: 'none',
    evidenceType: 'editorial-forecast',
    sources: [
      {
        name: 'Pinterest Predicts 2026 (Dark Romance & Botanical Escapism)',
        url: 'https://newsroom.pinterest.com/news/pinterest-predicts-nonconformity-self-preservation-and-escapism-drive-21-trends-for-2026/',
        marketRegion: 'Global / US',
        observedDate: '2026-08-20',
        whatWasObserved:
          'Sustained engagement across Gen Z and Millennial boards for moody autumn flora, entomological art, and dark romantic home decor that transitions beyond Halloween.',
        limitations:
          'Inspiration boards reflect aesthetic preference and decor intent; conversion to specific physical merchandise must be verified.',
      },
    ],
    internalNotes:
      'Pure artwork design created for high-end wall decor and elevated apparel. Personalization intentionally omitted to preserve artistic composition.',
    reviewStatus: 'approved',
    publicationStatus: 'published',
    featuredOrder: 4,
    retiredAt: null,
  },
  {
    id: 'trend-field-notes',
    theme: 'Field Notes After Dark',
    category: 'cozy-fall',
    categoryLabel: 'Cozy Fall',
    headline: 'Field Notes After Dark',
    description:
      'An authentic autumn naturalist study with hand-drawn woodland wildlife, specimen classification numbers, and customizable observation location.',
    relatedDesignSlug: 'field-notes-after-dark',
    relatedDesignId: 'design-field-notes-after-dark',
    recommendedProductId: 'gallery-poster',
    recommendedProductName: 'Gallery Poster',
    verifiedPriceFormatted: '$29.00',
    verifiedPriceCents: 2900,
    mockupUrl: '/designs/seasonal-edit/mockups/field-notes-after-dark-poster.webp',
    isPersonalizationSupported: true,
    personalizationType: 'naturalist-specimen',
    personalizationPrompt: 'Choose your woodland animal and observation location',
    evidenceType: 'marketplace-listings',
    sources: [
      {
        name: 'Etsy Autumn Botanical & Wildlife Market',
        url: 'https://www.etsy.com/market/vintage_botanical_autumn_print',
        marketRegion: 'US',
        observedDate: '2026-08-29',
        whatWasObserved:
          'Consistent popularity for vintage naturalist field guide prints, wildlife lithographs, and autumnal forest documentation.',
        limitations:
          'Marketplace listings indicate category viability; individual listing performance depends on print quality and framing presentation.',
      },
      {
        name: 'Pinterest Predicts 2026 (Tactile Escapism)',
        url: 'https://newsroom.pinterest.com/news/pinterest-predicts-nonconformity-self-preservation-and-escapism-drive-21-trends-for-2026/',
        marketRegion: 'Global / US',
        observedDate: '2026-08-20',
        whatWasObserved:
          'Rising search velocity for outdoor exploration aesthetics, cabin naturalist studies, and archival museum prints.',
        limitations:
          'Visual curation platform observations represent inspiration interest rather than point-of-sale receipt data.',
      },
    ],
    internalNotes:
      'Original naturalist journal plate with scientific classification fonts, woodland owl/fox illustrations, and customizable location field.',
    reviewStatus: 'approved',
    publicationStatus: 'published',
    featuredOrder: 5,
    retiredAt: null,
  },
  {
    id: 'trend-leftovers-league',
    theme: 'The Annual Leftovers League',
    category: 'thanksgiving',
    categoryLabel: 'Thanksgiving',
    headline: 'The Annual Leftovers League',
    description:
      'An original Thanksgiving group-apparel design celebrating post-feast champions with customizable family name, year, and member roles.',
    relatedDesignSlug: 'leftovers-league',
    relatedDesignId: 'design-leftovers-league',
    recommendedProductId: 'everyday-tee',
    recommendedProductName: 'Everyday Tee',
    verifiedPriceFormatted: '$34.00',
    verifiedPriceCents: 3400,
    mockupUrl: '/designs/seasonal-edit/mockups/leftovers-league-tee.webp',
    isPersonalizationSupported: true,
    personalizationType: 'family-roles',
    personalizationPrompt: 'Customize your family name, year, and individual role',
    evidenceType: 'marketplace-listings',
    sources: [
      {
        name: 'Etsy Thanksgiving Family Shirt Market',
        url: 'https://www.etsy.com/market/family_thanksgiving_2026_shirt',
        marketRegion: 'US',
        observedDate: '2026-08-30',
        whatWasObserved:
          'Strong merchant listing volume for matching Thanksgiving group tees with humorous designations (e.g., "Pie Inspector", "Nap Captain", "Leftover Security").',
        limitations:
          'Listing count and review feedback reflect active merchant competition; aggregate sales numbers are proprietary to Etsy.',
      },
      {
        name: 'eRank August 2026 Etsy US Keyword Report',
        url: 'https://help.erank.com/blog/top-keywords-on-etsy/',
        marketRegion: 'US',
        observedDate: '2026-08-30',
        whatWasObserved:
          'Early seasonal surge in "family thanksgiving shirts" and "funny thanksgiving shirts" queries beginning in late August.',
        limitations:
          'Query volume reflects search interest; actual conversion rates vary by shipping guarantees and price.',
      },
    ],
    internalNotes:
      'Original athletic crest celebrating Thanksgiving leftovers with vintage banner, roast turkey emblem, and customizable role selector.',
    reviewStatus: 'approved',
    publicationStatus: 'published',
    featuredOrder: 6,
    retiredAt: null,
  },
];

/**
 * Public catalog helper: returns only active, approved, and published seasonal cards.
 */
export function getActiveSeasonalTrends(
  category?: SeasonalCategory,
): SeasonalTrendCard[] {
  return seasonalTrendCards
    .filter(
      (card) =>
        card.publicationStatus === 'published' &&
        card.reviewStatus === 'approved' &&
        card.retiredAt === null,
    )
    .filter((card) => !category || card.category === category)
    .sort((a, b) => a.featuredOrder - b.featuredOrder);
}

/**
 * Internal Admin registry accessor: returns all trend records including draft, in-review, and retired cards.
 */
export function getAdminSeasonalTrends(): SeasonalTrendCard[] {
  return structuredClone(seasonalTrendCards);
}

/**
 * Admin helper: look up a seasonal trend card by its related design slug.
 */
export function getSeasonalTrendBySlug(
  slug: string,
): SeasonalTrendCard | undefined {
  return seasonalTrendCards.find((card) => card.relatedDesignSlug === slug);
}
