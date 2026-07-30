import type { CuratedDesign, MerchProduct } from './types';

export const curatedDesigns: CuratedDesign[] = [
  {
    id: 'design-pet-pop',
    title: 'Sunday Sidekick',
    description: 'A cheerful illustrated companion for everyday rooms.',
    collection: 'Pets',
    recommendedProductId: 'gallery-poster',
    asset: {
      id: 'asset-pet-pop',
      version: 'fixture-v1',
      url: '/landing/transformations/pet-cartoon.webp',
      alt: 'Colorful illustrated French bulldog portrait',
      width: 1200,
      height: 1200,
      mimeType: 'image/webp',
      hasTransparency: false,
    },
  },
  {
    id: 'design-family-oil',
    title: 'Golden Hour',
    description: 'Painterly warmth made for a thoughtful family keepsake.',
    collection: 'Portraits',
    recommendedProductId: 'gallery-poster',
    asset: {
      id: 'asset-family-oil',
      version: 'fixture-v1',
      url: '/landing/transformations/family-oil-painting.webp',
      alt: 'Family portrait rendered as an oil painting',
      width: 1200,
      height: 1200,
      mimeType: 'image/webp',
      hasTransparency: false,
    },
  },
  {
    id: 'design-travel-watercolor',
    title: 'Coastal Air',
    description: 'Soft watercolor color for a favorite trip or place.',
    collection: 'Travel',
    recommendedProductId: 'gallery-poster',
    asset: {
      id: 'asset-travel-watercolor',
      version: 'fixture-v1',
      url: '/landing/transformations/travel-watercolor.webp',
      alt: 'Travel landscape in a watercolor style',
      width: 1200,
      height: 1200,
      mimeType: 'image/webp',
      hasTransparency: false,
    },
  },
  {
    id: 'design-pet-photo',
    title: 'Quiet Company',
    description: 'A clean photographic favorite for understated gifts.',
    collection: 'Pets',
    recommendedProductId: 'everyday-tee',
    asset: {
      id: 'asset-pet-photo',
      version: 'fixture-v1',
      url: '/landing/transformations/pet-original.webp',
      alt: 'French bulldog portrait',
      width: 1200,
      height: 1200,
      mimeType: 'image/webp',
      hasTransparency: false,
    },
  },
  {
    id: 'design-travel-photo',
    title: 'Postcard Study',
    description: 'A crisp travel memory with an editorial feel.',
    collection: 'Travel',
    recommendedProductId: 'everyday-tee',
    asset: {
      id: 'asset-travel-photo',
      version: 'fixture-v1',
      url: '/landing/transformations/travel-original.webp',
      alt: 'Original travel landscape photograph',
      width: 1200,
      height: 1200,
      mimeType: 'image/webp',
      hasTransparency: false,
    },
  },
];

export const merchProducts: MerchProduct[] = [
  {
    id: 'gallery-poster',
    name: 'Gallery Poster',
    description: 'Archival matte paper with a clean, borderless presentation.',
    kind: 'flat',
    printifyBlueprintId: 282,
    previewTemplateId: 'poster-studio-v1',
    provider: {
      id: 'fixture-poster-provider',
      printifyProviderId: 1,
      name: 'Sprint 1 fixture provider',
      decorationMethods: ['sublimation'],
    },
    variants: [
      {
        id: 'poster-12x18',
        printifyVariantId: 1001,
        title: '12 × 18 in',
        color: 'Paper white',
        size: '12 × 18 in',
        unitPrice: 2900,
        currency: 'USD',
        available: true,
        placeholders: [
          {
            position: 'front',
            decorationMethod: 'sublimation',
            width: 3600,
            height: 5100,
          },
        ],
      },
      {
        id: 'poster-18x24',
        printifyVariantId: 1002,
        title: '18 × 24 in',
        color: 'Paper white',
        size: '18 × 24 in',
        unitPrice: 3900,
        currency: 'USD',
        available: true,
        placeholders: [
          {
            position: 'front',
            decorationMethod: 'sublimation',
            width: 3600,
            height: 4800,
          },
        ],
      },
    ],
    defaultPlacement: {
      position: 'front',
      decorationMethod: 'sublimation',
      normalizedX: 0.5,
      normalizedY: 0.5,
      normalizedScale: 1,
      angle: 0,
      fit: 'contain',
    },
  },
  {
    id: 'everyday-tee',
    name: 'Everyday Tee',
    description: 'Soft cotton jersey with a centered front print.',
    kind: 'apparel',
    printifyBlueprintId: 12,
    previewTemplateId: 'tee-studio-v1',
    provider: {
      id: 'fixture-tee-provider',
      printifyProviderId: 39,
      name: 'Sprint 1 fixture provider',
      decorationMethods: ['dtg'],
    },
    variants: [
      {
        id: 'tee-white-m',
        printifyVariantId: 9576,
        title: 'White / M',
        color: 'White',
        size: 'M',
        unitPrice: 3400,
        currency: 'USD',
        available: true,
        placeholders: [
          {
            position: 'front',
            decorationMethod: 'dtg',
            width: 4500,
            height: 5700,
          },
        ],
      },
      {
        id: 'tee-white-l',
        printifyVariantId: 9577,
        title: 'White / L',
        color: 'White',
        size: 'L',
        unitPrice: 3400,
        currency: 'USD',
        available: true,
        placeholders: [
          {
            position: 'front',
            decorationMethod: 'dtg',
            width: 4500,
            height: 5700,
          },
        ],
      },
    ],
    defaultPlacement: {
      position: 'front',
      decorationMethod: 'dtg',
      normalizedX: 0.5,
      normalizedY: 0.5,
      normalizedScale: 0.82,
      angle: 0,
      fit: 'contain',
    },
  },
];

export function getMerchProduct(productId: string) {
  const product = merchProducts.find((candidate) => candidate.id === productId);
  if (!product) throw new Error(`Unknown product: ${productId}`);
  return product;
}

export function getCuratedDesign(designId: string) {
  const design = curatedDesigns.find((candidate) => candidate.id === designId);
  if (!design) throw new Error(`Unknown design: ${designId}`);
  return design;
}
