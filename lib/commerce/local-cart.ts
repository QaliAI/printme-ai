import { z } from 'zod';
import type {
  CartConfigurationSnapshot,
  CuratedDesign,
  MerchProduct,
  ProductConfiguration,
} from './types';

export const SHOP_V2_CART_STORAGE_KEY = 'printme:commerce-v2:cart:v1';

const productConfigurationSchema = z.object({
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

export const cartConfigurationSnapshotSchema = z.object({
  schemaVersion: z.literal(1),
  id: z.string(),
  configuration: productConfigurationSchema,
  designTitle: z.string(),
  productName: z.string(),
  quantity: z.number().int().positive(),
  addedAt: z.string(),
});

const storedCartSchema = z.object({
  schemaVersion: z.literal(1),
  items: z.array(cartConfigurationSnapshotSchema),
});

type ReadStorage = Pick<Storage, 'getItem'>;
type WriteStorage = Pick<Storage, 'setItem'>;

export function readLocalCart(storage: ReadStorage): CartConfigurationSnapshot[] {
  const raw = storage.getItem(SHOP_V2_CART_STORAGE_KEY);
  if (!raw) return [];

  try {
    const parsed = storedCartSchema.safeParse(JSON.parse(raw) as unknown);
    return parsed.success ? parsed.data.items : [];
  } catch {
    return [];
  }
}

export function writeLocalCart(
  storage: WriteStorage,
  items: CartConfigurationSnapshot[]
) {
  const validated = storedCartSchema.parse({ schemaVersion: 1, items });
  storage.setItem(SHOP_V2_CART_STORAGE_KEY, JSON.stringify(validated));
}

export function createCartSnapshot(input: {
  id: string;
  configuration: ProductConfiguration;
  design: CuratedDesign;
  product: MerchProduct;
  addedAt: string;
}): CartConfigurationSnapshot {
  return cartConfigurationSnapshotSchema.parse({
    schemaVersion: 1,
    id: input.id,
    configuration: input.configuration,
    designTitle: input.design.title,
    productName: input.product.name,
    quantity: 1,
    addedAt: input.addedAt,
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
