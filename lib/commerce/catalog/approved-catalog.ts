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
    previewBindings: [
      {
        key: '282:99:43138:Matte:front:digital-printing:poster-12x18-front',
        printifyBlueprintId: 282,
        printifyProviderId: 99,
        printifyVariantId: 43138,
        productColor: 'Matte',
        printPosition: 'front',
        decorationMethod: 'digital-printing',
        previewViewId: 'poster-12x18-front',
        previewTemplateId: 'poster-12x18-v2',
      },
      {
        key: '282:99:43144:Matte:front:digital-printing:poster-18x24-front',
        printifyBlueprintId: 282,
        printifyProviderId: 99,
        printifyVariantId: 43144,
        productColor: 'Matte',
        printPosition: 'front',
        decorationMethod: 'digital-printing',
        previewViewId: 'poster-18x24-front',
        previewTemplateId: 'poster-18x24-v2',
      },
    ],
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
            printWidthInches: 12,
            printHeightInches: 18,
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
            printWidthInches: 18,
            printHeightInches: 24,
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
    previewBindings: [
      {
        key: '12:99:18541:White:front:dtg:tee-m-front',
        printifyBlueprintId: 12,
        printifyProviderId: 99,
        printifyVariantId: 18541,
        productColor: 'White',
        printPosition: 'front',
        decorationMethod: 'dtg',
        previewViewId: 'tee-m-front',
        previewTemplateId: 'tee-m-v2',
      },
      {
        key: '12:99:18541:White:back:dtg:tee-m-back',
        printifyBlueprintId: 12,
        printifyProviderId: 99,
        printifyVariantId: 18541,
        productColor: 'White',
        printPosition: 'back',
        decorationMethod: 'dtg',
        previewViewId: 'tee-m-back',
        previewTemplateId: 'tee-m-v2',
      },
      {
        key: '12:99:18542:White:front:dtg:tee-l-front',
        printifyBlueprintId: 12,
        printifyProviderId: 99,
        printifyVariantId: 18542,
        productColor: 'White',
        printPosition: 'front',
        decorationMethod: 'dtg',
        previewViewId: 'tee-l-front',
        previewTemplateId: 'tee-l-v2',
      },
      {
        key: '12:99:18542:White:back:dtg:tee-l-back',
        printifyBlueprintId: 12,
        printifyProviderId: 99,
        printifyVariantId: 18542,
        productColor: 'White',
        printPosition: 'back',
        decorationMethod: 'dtg',
        previewViewId: 'tee-l-back',
        previewTemplateId: 'tee-l-v2',
      },
    ],
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
            printWidthInches: 11.97,
            printHeightInches: 14.55,
          },
          {
            position: 'back',
            decorationMethod: 'dtg',
            width: 3591,
            height: 4364,
            printWidthInches: 11.97,
            printHeightInches: 14.55,
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
            printWidthInches: 13.17,
            printHeightInches: 16,
          },
          {
            position: 'back',
            decorationMethod: 'dtg',
            width: 3951,
            height: 4800,
            printWidthInches: 13.17,
            printHeightInches: 16,
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
  {
    id: 'keepsake-mug',
    name: 'Keepsake Mug',
    description: 'Glossy 11 oz ceramic with a handle-safe two-sided print area.',
    kind: 'drinkware',
    printifyBlueprintId: 68,
    previewTemplateId: 'mug-11oz-v1',
    previewBindings: [
      {
        key: '68:99:721:White:front:sublimation:mug-left',
        printifyBlueprintId: 68,
        printifyProviderId: 99,
        printifyVariantId: 721,
        productColor: 'White',
        printPosition: 'front',
        decorationMethod: 'sublimation',
        previewViewId: 'mug-left',
        previewTemplateId: 'mug-11oz-v1',
      },
      {
        key: '68:99:721:White:back:sublimation:mug-right',
        printifyBlueprintId: 68,
        printifyProviderId: 99,
        printifyVariantId: 721,
        productColor: 'White',
        printPosition: 'back',
        decorationMethod: 'sublimation',
        previewViewId: 'mug-right',
        previewTemplateId: 'mug-11oz-v1',
      },
    ],
    provider: {
      id: 'printify-choice-mug',
      printifyProviderId: 99,
      name: 'Printify Choice',
      decorationMethods: ['sublimation'],
    },
    variants: [
      {
        id: 'mug-white-11oz',
        printifyVariantId: 721,
        title: 'White / 11 oz',
        color: 'White',
        size: '11 oz',
        unitPrice: 2600,
        unitCost: null,
        currency: 'USD',
        available: true,
        placeholders: [
          {
            position: 'front',
            decorationMethod: 'sublimation',
            width: 1275,
            height: 1155,
            printWidthInches: 4.25,
            printHeightInches: 3.85,
          },
          {
            position: 'back',
            decorationMethod: 'sublimation',
            width: 1275,
            height: 1155,
            printWidthInches: 4.25,
            printHeightInches: 3.85,
          },
        ],
      },
    ],
    defaultPlacement: {
      position: 'front',
      decorationMethod: 'sublimation',
      normalizedX: 0.5,
      normalizedY: 0.5,
      normalizedScale: 0.8,
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
