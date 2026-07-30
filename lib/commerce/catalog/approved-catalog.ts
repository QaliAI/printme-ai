import 'server-only';

import type { MerchProduct } from '../types';

const approvedProducts: MerchProduct[] = [
  {
    id: 'gallery-poster',
    name: 'Gallery Poster',
    description: 'Archival matte paper with a clean, borderless presentation.',
    kind: 'flat',
    printifyBlueprintId: 282,
    previewTemplateId: 'poster-studio-v1',
    provider: {
      id: 'printify-choice-poster',
      printifyProviderId: 99,
      name: 'Printify Choice',
      decorationMethods: ['digital-printing'],
    },
    variants: [
      {
        id: 'poster-12x18',
        printifyVariantId: 43138,
        title: '12 × 18 in / Matte',
        color: 'Matte',
        size: '12 × 18 in',
        unitPrice: 2900,
        unitCost: null,
        currency: 'USD',
        available: true,
        placeholders: [
          {
            position: 'front',
            decorationMethod: 'digital-printing',
            width: 3600,
            height: 5400,
          },
        ],
      },
      {
        id: 'poster-18x24',
        printifyVariantId: 43144,
        title: '18 × 24 in / Matte',
        color: 'Matte',
        size: '18 × 24 in',
        unitPrice: 3900,
        unitCost: null,
        currency: 'USD',
        available: true,
        placeholders: [
          {
            position: 'front',
            decorationMethod: 'digital-printing',
            width: 5400,
            height: 7200,
          },
        ],
      },
    ],
    defaultPlacement: {
      position: 'front',
      decorationMethod: 'digital-printing',
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
      id: 'printify-choice-tee',
      printifyProviderId: 99,
      name: 'Printify Choice',
      decorationMethods: ['dtg'],
    },
    variants: [
      {
        id: 'tee-white-m',
        printifyVariantId: 18541,
        title: 'White / M',
        color: 'White',
        size: 'M',
        unitPrice: 3400,
        unitCost: null,
        currency: 'USD',
        available: true,
        placeholders: [
          {
            position: 'front',
            decorationMethod: 'dtg',
            width: 3591,
            height: 4364,
          },
        ],
      },
      {
        id: 'tee-white-l',
        printifyVariantId: 18542,
        title: 'White / L',
        color: 'White',
        size: 'L',
        unitPrice: 3400,
        unitCost: null,
        currency: 'USD',
        available: true,
        placeholders: [
          {
            position: 'front',
            decorationMethod: 'dtg',
            width: 3951,
            height: 4800,
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

export function getApprovedMerchProducts(): MerchProduct[] {
  return structuredClone(approvedProducts);
}

export function getApprovedMerchProduct(productId: string): MerchProduct {
  const product = approvedProducts.find((candidate) => candidate.id === productId);
  if (!product) {
    throw new CatalogValidationError('PRODUCT_NOT_APPROVED', productId);
  }
  return structuredClone(product);
}

export class CatalogValidationError extends Error {
  constructor(
    readonly code: string,
    readonly subject: string,
  ) {
    super(`Catalog validation failed: ${code}.`);
    this.name = 'CatalogValidationError';
  }
}
