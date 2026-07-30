import { z } from 'zod';
import type {
  CartConfigurationSnapshot,
  ProductConfiguration,
} from './types';
import { designSourceTypeSchema } from './designs/canonical';

export const COMMERCE_SNAPSHOT_SCHEMA_VERSION = 2 as const;
export const CONFIGURATION_HASH_ALGORITHM = 'pmcfg-v2';

export const instantPreviewSchema = z.object({
  rendererId: z.string().min(1),
  state: z.literal('ready'),
  viewId: z.string().min(1),
  renderKey: z.string().min(1),
  url: z.string().min(1).optional(),
});

export const productConfigurationSchema = z.object({
  designId: z.string().min(1),
  designVersion: z.string().min(1),
  designVersionId: z.string().min(1).optional(),
  designSourceType: designSourceTypeSchema.optional(),
  designAssetId: z.string().min(1).optional(),
  productionAssetId: z.string().min(1).optional(),
  designDerivativeId: z.string().min(1).optional(),
  designAssetUrl: z.string().min(1),
  designAssetWidth: z.number().int().positive().optional(),
  designAssetHeight: z.number().int().positive().optional(),
  designAssetAlt: z.string().min(1).optional(),
  designAssetMimeType: z.string().min(1).optional(),
  designAssetHasTransparency: z.boolean().optional(),
  designAssetStorageKey: z.string().min(1).optional(),
  productionAssetUrl: z.string().min(1),
  merchProductId: z.string().min(1),
  printifyBlueprintId: z.number().int().positive(),
  printifyProviderId: z.number().int().positive(),
  printifyVariantId: z.number().int().positive(),
  printPosition: z.enum(['front', 'back', 'all-over']),
  decorationMethod: z.string().min(1),
  normalizedX: z.number().min(0).max(1),
  normalizedY: z.number().min(0).max(1),
  normalizedScale: z.number().positive(),
  angle: z.number().finite(),
  fit: z.enum(['contain', 'cover']).optional(),
  selectedColor: z.string().nullable(),
  selectedSize: z.string().nullable(),
  previewTemplateId: z.string().min(1),
  previewViewId: z.string().min(1),
  instantPreview: instantPreviewSchema,
  officialMockupUrl: z.string().min(1).optional(),
  unitPrice: z.number().int().nonnegative(),
  currency: z.literal('USD'),
});

export const cartConfigurationSnapshotPayloadSchema = z.object({
  schemaVersion: z.literal(COMMERCE_SNAPSHOT_SCHEMA_VERSION),
  id: z.string().min(1),
  configuration: productConfigurationSchema,
  designTitle: z.string().min(1),
  productTitle: z.string().min(1),
  variantTitle: z.string().min(1),
  productCost: z.number().int().nonnegative().nullable(),
  quantity: z.number().int().positive(),
  createdAt: z.string().datetime({ offset: true }),
});

export type ConfigurationSnapshotPayload = z.infer<
  typeof cartConfigurationSnapshotPayloadSchema
>;

type HashableSnapshot = Pick<
  ConfigurationSnapshotPayload,
  | 'schemaVersion'
  | 'configuration'
  | 'designTitle'
  | 'productTitle'
  | 'variantTitle'
  | 'productCost'
>;

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => canonicalize(item));
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, item]) => item !== undefined)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => [key, canonicalize(item)])
    );
  }

  return value;
}

export function canonicalSnapshotJson(snapshot: HashableSnapshot): string {
  return JSON.stringify(
    canonicalize({
      schemaVersion: snapshot.schemaVersion,
      configuration: snapshot.configuration,
      designTitle: snapshot.designTitle,
      productTitle: snapshot.productTitle,
      variantTitle: snapshot.variantTitle,
      productCost: snapshot.productCost,
    })
  );
}

function hash32(input: string, seed: number): number {
  let hash = seed >>> 0;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
    hash ^= hash >>> 13;
    hash = Math.imul(hash, 0x85ebca6b);
  }
  return (hash ^ (hash >>> 16)) >>> 0;
}

export function createConfigurationHash(snapshot: HashableSnapshot): string {
  const canonical = canonicalSnapshotJson(snapshot);
  const seeds = [0x811c9dc5, 0x9e3779b9, 0x85ebca6b, 0xc2b2ae35];
  const digest = seeds
    .map((seed) => hash32(canonical, seed).toString(16).padStart(8, '0'))
    .join('');
  return `${CONFIGURATION_HASH_ALGORITHM}:${digest}`;
}

export const cartConfigurationSnapshotSchema =
  cartConfigurationSnapshotPayloadSchema
    .extend({
      configurationHash: z
        .string()
        .regex(/^pmcfg-v2:[a-f0-9]{32}$/),
    })
    .superRefine((snapshot, context) => {
      const expected = createConfigurationHash(snapshot);
      if (snapshot.configurationHash !== expected) {
        context.addIssue({
          code: 'custom',
          path: ['configurationHash'],
          message: 'Configuration hash does not match the snapshot payload.',
        });
      }
    });

export function finalizeConfigurationSnapshot(
  payload: ConfigurationSnapshotPayload
): CartConfigurationSnapshot {
  const parsed = cartConfigurationSnapshotPayloadSchema.parse(payload);
  return cartConfigurationSnapshotSchema.parse({
    ...parsed,
    configurationHash: createConfigurationHash(parsed),
  });
}

export function copyImmutableOrderSnapshot(
  snapshot: CartConfigurationSnapshot
): CartConfigurationSnapshot {
  const validated = cartConfigurationSnapshotSchema.parse(snapshot);
  return structuredClone(validated);
}

export function parseProductConfiguration(
  value: unknown
): ProductConfiguration {
  return productConfigurationSchema.parse(value);
}
