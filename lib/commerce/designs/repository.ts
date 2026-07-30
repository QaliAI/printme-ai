import 'server-only';

import { z } from 'zod';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import type {
  CuratedDesignRecord,
  DesignCollection,
  DesignDrop,
  DesignFilter,
} from './models';
import {
  developmentCollectionSeeds,
  developmentDesignSeeds,
  developmentDropSeeds,
} from './seed';

export interface DesignRepository {
  listPublished(filter?: DesignFilter): Promise<CuratedDesignRecord[]>;
  findPublishedBySlug(slug: string): Promise<CuratedDesignRecord | null>;
  listCollections(): Promise<DesignCollection[]>;
  findCollectionBySlug(slug: string): Promise<DesignCollection | null>;
  listDrops(): Promise<DesignDrop[]>;
  findDropBySlug(slug: string): Promise<DesignDrop | null>;
}

export function filterPublishedDesigns(
  designs: CuratedDesignRecord[],
  filter?: DesignFilter,
) {
  return designs
    .filter((design) => design.publicationStatus === 'published')
    .filter((design) => !filter || design.filters.includes(filter))
    .sort(
      (left, right) =>
        right.merchandisingPriority - left.merchandisingPriority,
    );
}

export class SeedDesignRepository implements DesignRepository {
  async listPublished(filter?: DesignFilter) {
    return structuredClone(
      filterPublishedDesigns(developmentDesignSeeds, filter),
    );
  }

  async findPublishedBySlug(slug: string) {
    return (
      structuredClone(
        developmentDesignSeeds.find(
          (design) =>
            design.slug === slug &&
            design.publicationStatus === 'published',
        ),
      ) ?? null
    );
  }

  async listCollections() {
    return structuredClone(
      developmentCollectionSeeds.filter(
        (collection) => collection.publicationStatus === 'published',
      ),
    );
  }

  async findCollectionBySlug(slug: string) {
    return (
      structuredClone(
        developmentCollectionSeeds.find(
          (collection) =>
            collection.slug === slug &&
            collection.publicationStatus === 'published',
        ),
      ) ?? null
    );
  }

  async listDrops() {
    return structuredClone(
      developmentDropSeeds.filter(
        (drop) => drop.publicationStatus === 'published',
      ),
    );
  }

  async findDropBySlug(slug: string) {
    return (
      structuredClone(
        developmentDropSeeds.find(
          (drop) =>
            drop.slug === slug && drop.publicationStatus === 'published',
        ),
      ) ?? null
    );
  }
}

const designRowSchema = z.object({
  id: z.string(),
  slug: z.string(),
  title: z.string(),
  description: z.string(),
  collection_title: z.string(),
  artwork_asset: z.object({
    id: z.string(),
    version: z.string(),
    url: z.string(),
    productionUrl: z.string().optional(),
    alt: z.string(),
    width: z.number().int().positive(),
    height: z.number().int().positive(),
    mimeType: z.string(),
    hasTransparency: z.boolean(),
  }),
  artist_or_source: z.string(),
  rights_status: z.string(),
  publication_status: z.enum([
    'draft',
    'scheduled',
    'published',
    'archived',
  ]),
  publication_date: z.string().nullable(),
  tags: z.array(z.string()),
  default_product_id: z.string(),
  default_product_color: z.string().nullable(),
  default_placement: z.object({
    position: z.enum(['front', 'back', 'all-over']),
    decorationMethod: z.string(),
    normalizedX: z.number(),
    normalizedY: z.number(),
    normalizedScale: z.number(),
    angle: z.number(),
    fit: z.enum(['contain', 'cover']),
  }),
  compatible_product_ids: z.array(z.string()),
  incompatible_product_ids: z.array(z.string()),
  merchandising_priority: z.number().int(),
  seo_title: z.string(),
  seo_description: z.string(),
  filters: z.array(
    z.enum(['new', 'trending', 'bestsellers', 'archive']),
  ),
});

const collectionRowSchema = z.object({
  id: z.string(),
  slug: z.string(),
  title: z.string(),
  description: z.string(),
  publication_status: z.enum([
    'draft',
    'scheduled',
    'published',
    'archived',
  ]),
  design_ids: z.array(z.string()),
});

const dropRowSchema = collectionRowSchema.extend({
  publication_date: z.string().nullable(),
});

function toDesign(value: unknown): CuratedDesignRecord {
  const row = designRowSchema.parse(value);
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    collection: row.collection_title,
    asset: row.artwork_asset,
    artistOrSource: row.artist_or_source,
    rightsStatus: row.rights_status,
    publicationStatus: row.publication_status,
    publicationDate: row.publication_date,
    tags: row.tags,
    recommendedProductId: row.default_product_id,
    defaultProductColor: row.default_product_color,
    defaultPlacement: row.default_placement,
    compatibleProductIds: row.compatible_product_ids,
    incompatibleProductIds: row.incompatible_product_ids,
    merchandisingPriority: row.merchandising_priority,
    seoTitle: row.seo_title,
    seoDescription: row.seo_description,
    filters: row.filters,
  };
}

function toCollection(value: unknown): DesignCollection {
  const row = collectionRowSchema.parse(value);
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    publicationStatus: row.publication_status,
    designIds: row.design_ids,
  };
}

function toDrop(value: unknown): DesignDrop {
  const row = dropRowSchema.parse(value);
  return {
    ...toCollection(row),
    publicationDate: row.publication_date,
  };
}

export class SupabaseDesignRepository implements DesignRepository {
  private get client() {
    return getSupabaseAdminClient();
  }

  async listPublished(filter?: DesignFilter) {
    let query = this.client
      .from('commerce_published_designs')
      .select('*')
      .order('merchandising_priority', { ascending: false });
    if (filter) query = query.contains('filters', [filter]);
    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []).map(toDesign);
  }

  async findPublishedBySlug(slug: string) {
    const { data, error } = await this.client
      .from('commerce_published_designs')
      .select('*')
      .eq('slug', slug)
      .maybeSingle();
    if (error) throw error;
    return data ? toDesign(data) : null;
  }

  async listCollections() {
    const { data, error } = await this.client
      .from('commerce_published_collections')
      .select('*');
    if (error) throw error;
    return (data ?? []).map(toCollection);
  }

  async findCollectionBySlug(slug: string) {
    const { data, error } = await this.client
      .from('commerce_published_collections')
      .select('*')
      .eq('slug', slug)
      .maybeSingle();
    if (error) throw error;
    return data ? toCollection(data) : null;
  }

  async listDrops() {
    const { data, error } = await this.client
      .from('commerce_published_drops')
      .select('*');
    if (error) throw error;
    return (data ?? []).map(toDrop);
  }

  async findDropBySlug(slug: string) {
    const { data, error } = await this.client
      .from('commerce_published_drops')
      .select('*')
      .eq('slug', slug)
      .maybeSingle();
    if (error) throw error;
    return data ? toDrop(data) : null;
  }
}
