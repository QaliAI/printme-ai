import 'server-only';

import type { DesignFilter } from './models';
import {
  SeedDesignRepository,
  SupabaseDesignRepository,
  type DesignRepository,
} from './repository';

export class DesignCatalogService {
  constructor(
    private readonly repository: DesignRepository,
    private readonly developmentFallback?: DesignRepository,
  ) {}

  private async read<T>(operation: (repository: DesignRepository) => Promise<T>) {
    try {
      return await operation(this.repository);
    } catch (error) {
      if (!this.developmentFallback) throw error;
      return operation(this.developmentFallback);
    }
  }

  listPublished(filter?: DesignFilter) {
    return this.read((repository) => repository.listPublished(filter));
  }

  findPublishedBySlug(slug: string) {
    return this.read((repository) => repository.findPublishedBySlug(slug));
  }

  listCollections() {
    return this.read((repository) => repository.listCollections());
  }

  findCollectionBySlug(slug: string) {
    return this.read((repository) => repository.findCollectionBySlug(slug));
  }

  listDrops() {
    return this.read((repository) => repository.listDrops());
  }

  findDropBySlug(slug: string) {
    return this.read((repository) => repository.findDropBySlug(slug));
  }
}

let designCatalogService: DesignCatalogService | null = null;

export function getDesignCatalogService() {
  if (!designCatalogService) {
    const seed = new SeedDesignRepository();
    const databaseEnabled =
      process.env.COMMERCE_DESIGNS_DATABASE_ENABLED === 'true';
    const allowFixtureFallback =
      process.env.VERCEL_ENV !== 'production';
    if (!databaseEnabled && !allowFixtureFallback) {
      throw new Error(
        'Curated design database access is required in production.',
      );
    }
    designCatalogService = databaseEnabled
      ? new DesignCatalogService(
          new SupabaseDesignRepository(),
          allowFixtureFallback ? seed : undefined,
        )
      : new DesignCatalogService(seed);
  }
  return designCatalogService;
}
