import 'server-only';

import { z } from 'zod';
import {
  getPrintifyClient,
  type PrintifyBlueprint,
  type PrintifyClient,
  type PrintifyProvider,
  type PrintifyProviderVariants,
  type PrintifyShipping,
} from '@/lib/printify/client';
import { getApprovedMerchProducts } from './approved-catalog';
import type { CatalogAvailability } from './validation';

const DEFAULT_CACHE_TTL_MS = 15 * 60 * 1000;
const DEFAULT_RATE_LIMIT = 90;
const DEFAULT_RATE_WINDOW_MS = 60 * 1000;

export const catalogSyncReportSchema = z.object({
  mode: z.literal('dry-run'),
  generatedAt: z.string().datetime({ offset: true }),
  productsChecked: z.number().int().nonnegative(),
  newVariants: z.array(z.object({
    productId: z.string(),
    count: z.number().int().nonnegative(),
    sampleVariantIds: z.array(z.number().int().positive()).max(25),
  })),
  removedVariants: z.array(z.object({
    productId: z.string(),
    variantId: z.number().int().positive(),
  })),
  changedCosts: z.array(z.object({
    productId: z.string(),
    variantId: z.number().int().positive(),
    previousCost: z.number().int().nonnegative().nullable(),
    currentCost: z.number().int().nonnegative().nullable(),
  })),
  changedAvailability: z.array(z.object({
    productId: z.string(),
    variantId: z.number().int().positive(),
    available: z.boolean(),
  })),
  mappingProblems: z.array(z.object({
    productId: z.string(),
    message: z.string(),
  })),
  retailPricesChanged: z.literal(false),
});

export type CatalogSyncReport = z.infer<typeof catalogSyncReportSchema>;

export interface PrintifyCatalogSource {
  getBlueprint(blueprintId: number): Promise<PrintifyBlueprint>;
  listPrintProviders(blueprintId: number): Promise<PrintifyProvider[]>;
  getProviderVariants(
    blueprintId: number,
    providerId: number,
    includeOutOfStock?: boolean,
  ): Promise<PrintifyProviderVariants>;
  getShippingInformation(
    blueprintId: number,
    providerId: number,
  ): Promise<PrintifyShipping>;
}

export class CatalogRateLimitError extends Error {
  constructor(readonly retryAfterMs: number) {
    super('Catalog request budget exhausted.');
    this.name = 'CatalogRateLimitError';
  }
}

export class CatalogRequestGate {
  private timestamps: number[] = [];

  constructor(
    private readonly limit = DEFAULT_RATE_LIMIT,
    private readonly windowMs = DEFAULT_RATE_WINDOW_MS,
    private readonly now: () => number = Date.now,
  ) {}

  acquire() {
    const current = this.now();
    this.timestamps = this.timestamps.filter(
      (timestamp) => current - timestamp < this.windowMs,
    );
    if (this.timestamps.length >= this.limit) {
      throw new CatalogRateLimitError(
        this.windowMs - (current - this.timestamps[0]),
      );
    }
    this.timestamps.push(current);
  }
}

export class CatalogCache {
  private readonly values = new Map<
    string,
    { expiresAt: number; value: unknown }
  >();
  private readonly pending = new Map<string, Promise<unknown>>();

  constructor(
    private readonly ttlMs = DEFAULT_CACHE_TTL_MS,
    private readonly now: () => number = Date.now,
  ) {}

  async get<T>(key: string, load: () => Promise<T>): Promise<T> {
    const cached = this.values.get(key);
    if (cached && cached.expiresAt > this.now()) {
      return structuredClone(cached.value) as T;
    }

    const existing = this.pending.get(key);
    if (existing) return structuredClone(await existing) as T;

    const request = load();
    this.pending.set(key, request);
    try {
      const value = await request;
      this.values.set(key, {
        expiresAt: this.now() + this.ttlMs,
        value: structuredClone(value),
      });
      return structuredClone(value);
    } finally {
      this.pending.delete(key);
    }
  }
}

export class CuratedCatalogService implements CatalogAvailability {
  constructor(
    private readonly source: PrintifyCatalogSource,
    private readonly cache = new CatalogCache(),
    private readonly gate = new CatalogRequestGate(),
    private readonly now: () => Date = () => new Date(),
  ) {}

  private load<T>(key: string, request: () => Promise<T>) {
    return this.cache.get(key, async () => {
      this.gate.acquire();
      return request();
    });
  }

  private variants(
    blueprintId: number,
    providerId: number,
    includeOutOfStock: boolean,
  ) {
    return this.load(
      `variants:${blueprintId}:${providerId}:${includeOutOfStock}`,
      () =>
        this.source.getProviderVariants(
          blueprintId,
          providerId,
          includeOutOfStock,
        ),
    );
  }

  async isVariantAvailable(
    blueprintId: number,
    providerId: number,
    variantId: number,
  ) {
    const result = await this.variants(blueprintId, providerId, false);
    return result.variants.some((variant) => variant.id === variantId);
  }

  async dryRunSync(): Promise<CatalogSyncReport> {
    const products = getApprovedMerchProducts();
    const report: CatalogSyncReport = {
      mode: 'dry-run',
      generatedAt: this.now().toISOString(),
      productsChecked: products.length,
      newVariants: [],
      removedVariants: [],
      changedCosts: [],
      changedAvailability: [],
      mappingProblems: [],
      retailPricesChanged: false,
    };

    for (const product of products) {
      const blueprintId = product.printifyBlueprintId;
      const providerId = product.provider.printifyProviderId;
      const [blueprint, providers, available, all, shipping] =
        await Promise.all([
          this.load(`blueprint:${blueprintId}`, () =>
            this.source.getBlueprint(blueprintId),
          ),
          this.load(`providers:${blueprintId}`, () =>
            this.source.listPrintProviders(blueprintId),
          ),
          this.variants(blueprintId, providerId, false),
          this.variants(blueprintId, providerId, true),
          this.load(`shipping:${blueprintId}:${providerId}`, () =>
            this.source.getShippingInformation(blueprintId, providerId),
          ),
        ]);

      if (blueprint.id !== blueprintId) {
        report.mappingProblems.push({
          productId: product.id,
          message: 'Blueprint response ID did not match the approved mapping.',
        });
      }
      const provider = providers.find((candidate) => candidate.id === providerId);
      if (!provider) {
        report.mappingProblems.push({
          productId: product.id,
          message: 'Approved print provider is no longer offered.',
        });
      }
      if (shipping.profiles.length === 0) {
        report.mappingProblems.push({
          productId: product.id,
          message: 'No shipping profiles were returned.',
        });
      }

      const approvedIds = new Set(
        product.variants.map((variant) => variant.printifyVariantId),
      );
      const allIds = new Set(all.variants.map((variant) => variant.id));
      const availableIds = new Set(
        available.variants.map((variant) => variant.id),
      );
      const unapproved = all.variants
        .map((variant) => variant.id)
        .filter((variantId) => !approvedIds.has(variantId));
      if (unapproved.length > 0) {
        report.newVariants.push({
          productId: product.id,
          count: unapproved.length,
          sampleVariantIds: unapproved.slice(0, 25),
        });
      }

      for (const variant of product.variants) {
        if (!allIds.has(variant.printifyVariantId)) {
          report.removedVariants.push({
            productId: product.id,
            variantId: variant.printifyVariantId,
          });
          continue;
        }
        const liveAvailability = availableIds.has(variant.printifyVariantId);
        if (liveAvailability !== variant.available) {
          report.changedAvailability.push({
            productId: product.id,
            variantId: variant.printifyVariantId,
            available: liveAvailability,
          });
        }
      }
    }

    return catalogSyncReportSchema.parse(report);
  }
}

class ClientCatalogSource implements PrintifyCatalogSource {
  constructor(private readonly client: PrintifyClient) {}

  getBlueprint(blueprintId: number) {
    return this.client.getBlueprint(blueprintId);
  }

  listPrintProviders(blueprintId: number) {
    return this.client.listPrintProviders(blueprintId);
  }

  getProviderVariants(
    blueprintId: number,
    providerId: number,
    includeOutOfStock = false,
  ) {
    return this.client.getProviderVariants(
      blueprintId,
      providerId,
      includeOutOfStock,
    );
  }

  getShippingInformation(blueprintId: number, providerId: number) {
    return this.client.getShippingInformation(blueprintId, providerId);
  }
}

let liveCatalogService: CuratedCatalogService | null = null;

export function getCuratedCatalogService() {
  if (!liveCatalogService) {
    liveCatalogService = new CuratedCatalogService(
      new ClientCatalogSource(getPrintifyClient()),
    );
  }
  return liveCatalogService;
}
