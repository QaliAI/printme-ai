import { z } from 'zod';
import {
  cartConfigurationSnapshotSchema,
  finalizeConfigurationSnapshot,
} from './snapshot';
import type {
  CartConfigurationSnapshot,
  CuratedDesign,
  MerchProduct,
  ProductConfiguration,
} from './types';

export const SHOP_V2_CART_STORAGE_KEY = 'printme:commerce-v2:cart:v2';
export const LEGACY_SHOP_V2_CART_STORAGE_KEY =
  'printme:commerce-v2:cart:v1';

const legacyProductConfigurationSchema = z.object({
  designId: z.string(),
  designVersion: z.string(),
  designAssetUrl: z.string(),
  merchProductId: z.string(),
  printifyBlueprintId: z.number().int(),
  printifyProviderId: z.number().int(),
  printifyVariantId: z.number().int(),
  printPosition: z.enum(['front', 'back', 'all-over']),
  decorationMethod: z.string(),
  normalizedX: z.number().min(0).max(1),
  normalizedY: z.number().min(0).max(1),
  normalizedScale: z.number().positive(),
  angle: z.number(),
  selectedColor: z.string().nullable(),
  selectedSize: z.string().nullable(),
  previewTemplateId: z.string(),
  previewViewId: z.string(),
  instantPreview: z.object({
    rendererId: z.string(),
    state: z.literal('ready'),
    viewId: z.string(),
    renderKey: z.string(),
    url: z.string().optional(),
  }),
  officialMockupUrl: z.string().optional(),
  unitPrice: z.number().int().nonnegative(),
  currency: z.literal('USD'),
});

const legacyCartConfigurationSnapshotSchema = z.object({
  schemaVersion: z.literal(1),
  id: z.string(),
  configuration: legacyProductConfigurationSchema,
  designTitle: z.string(),
  productName: z.string(),
  quantity: z.number().int().positive(),
  addedAt: z.string(),
});

const storedCartSchema = z.object({
  schemaVersion: z.literal(2),
  items: z.array(cartConfigurationSnapshotSchema),
});

const legacyStoredCartSchema = z.object({
  schemaVersion: z.literal(1),
  items: z.array(legacyCartConfigurationSnapshotSchema),
});

type ReadStorage = Pick<Storage, 'getItem'>;
type WriteStorage = Pick<Storage, 'setItem'>;

export function readLocalCart(storage: ReadStorage): CartConfigurationSnapshot[] {
  const raw =
    storage.getItem(SHOP_V2_CART_STORAGE_KEY) ??
    storage.getItem(LEGACY_SHOP_V2_CART_STORAGE_KEY);
  if (!raw) return [];

  try {
    const value = JSON.parse(raw) as unknown;
    const parsed = storedCartSchema.safeParse(value);
    if (parsed.success) return parsed.data.items;

    const legacy = legacyStoredCartSchema.safeParse(value);
    if (!legacy.success) return [];

    return legacy.data.items.map((item) =>
      finalizeConfigurationSnapshot({
        schemaVersion: 2,
        id: item.id,
        configuration: {
          ...item.configuration,
          productionAssetUrl: item.configuration.designAssetUrl,
        },
        designTitle: item.designTitle,
        productTitle: item.productName,
        variantTitle:
          [item.configuration.selectedColor, item.configuration.selectedSize]
            .filter(Boolean)
            .join(' / ') || 'Standard',
        productCost: null,
        quantity: item.quantity,
        createdAt: item.addedAt,
      })
    );
  } catch {
    return [];
  }
}

export function writeLocalCart(
  storage: WriteStorage,
  items: CartConfigurationSnapshot[]
) {
  const validated = storedCartSchema.parse({ schemaVersion: 2, items });
  storage.setItem(SHOP_V2_CART_STORAGE_KEY, JSON.stringify(validated));
}

export function createCartSnapshot(input: {
  id: string;
  configuration: ProductConfiguration;
  design: CuratedDesign;
  product: MerchProduct;
  createdAt: string;
}): CartConfigurationSnapshot {
  const variant = input.product.variants.find(
    (candidate) =>
      candidate.printifyVariantId === input.configuration.printifyVariantId
  );
  if (!variant) {
    throw new Error(
      `Unknown variant ${input.configuration.printifyVariantId} for ${input.product.id}.`
    );
  }

  return finalizeConfigurationSnapshot({
    schemaVersion: 2,
    id: input.id,
    configuration: input.configuration,
    designTitle: input.design.title,
    productTitle: input.product.name,
    variantTitle: variant.title,
    productCost: variant.unitCost ?? null,
    quantity: 1,
    createdAt: input.createdAt,
  });
}

export function upsertCartItem(
  items: CartConfigurationSnapshot[],
  snapshot: CartConfigurationSnapshot
) {
  const existingIndex = items.findIndex((item) => item.id === snapshot.id);
  if (existingIndex === -1) return [...items, snapshot];
  return items.map((item) => (item.id === snapshot.id ? snapshot : item));
}
