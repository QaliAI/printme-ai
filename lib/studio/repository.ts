import 'server-only';

import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import {
  canPublishStudioDesign,
  studioDesignDraftSchema,
  type StudioDesignDraft,
} from './types';

export class StudioPublishingError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'StudioPublishingError';
  }
}

export class StudioDesignRepository {
  private get client() {
    return getSupabaseAdminClient();
  }

  async list() {
    const { data, error } = await this.client
      .from('curated_designs')
      .select(
        'id, slug, title, publication_status, publication_date, updated_at, is_staff_pick',
      )
      .order('updated_at', { ascending: false });
    if (error) throw error;
    return data ?? [];
  }

  async create(value: unknown, actorUserId: string) {
    const draft = studioDesignDraftSchema.parse(value);
    if (
      ['published', 'scheduled'].includes(draft.publicationStatus) &&
      !canPublishStudioDesign(draft)
    ) {
      throw new StudioPublishingError(
        'PUBLICATION_CHECKLIST_INCOMPLETE',
        'Critical publication checks are incomplete.',
      );
    }
    if (
      draft.publicationStatus === 'scheduled' &&
      (!draft.scheduledFor ||
        Date.parse(draft.scheduledFor) <= Date.now())
    ) {
      throw new StudioPublishingError(
        'INVALID_SCHEDULE',
        'Scheduled designs require a future publication time.',
      );
    }

    const assets = draft.assets.map((asset) => ({
      id: asset.id,
      stable_url: asset.stableUrl,
      thumbnail_url:
        asset.role === 'thumbnail' ? asset.stableUrl : null,
      alt_text: asset.altText,
      width: asset.width,
      height: asset.height,
      mime_type: asset.mimeType,
      has_transparency: asset.hasTransparency,
      checksum: asset.checksum,
      asset_role: asset.role,
      storage_path: asset.storagePath,
      file_size_bytes: asset.fileSizeBytes,
    }));
    const { error: assetError } = await this.client
      .from('design_assets')
      .insert(assets);
    if (assetError) throw assetError;

    const now = new Date().toISOString();
    const publicationDate =
      draft.publicationStatus === 'published'
        ? now
        : draft.publicationStatus === 'scheduled'
          ? draft.scheduledFor
          : null;
    const { error: designError } = await this.client
      .from('curated_designs')
      .insert({
        id: draft.id,
        slug: draft.slug,
        title: draft.title,
        description: draft.description,
        artist_or_source: draft.artistOrSource,
        rights_status: draft.usageRights,
        rights_documentation_notes: draft.rightsDocumentationNotes,
        alt_text: draft.altText,
        publication_status: draft.publicationStatus,
        publication_date: publicationDate,
        scheduled_for: draft.scheduledFor,
        tags: draft.tags,
        filters: draft.filters,
        merchandising_priority: 0,
        seo_title: draft.seoTitle,
        seo_description: draft.seoDescription,
        is_staff_pick: draft.filters.includes('staff-pick'),
        created_by: actorUserId === 'studio-operations' ? null : actorUserId,
        updated_by: actorUserId === 'studio-operations' ? null : actorUserId,
        published_by:
          draft.publicationStatus === 'published' &&
          actorUserId !== 'studio-operations'
            ? actorUserId
            : null,
        published_at:
          draft.publicationStatus === 'published' ? now : null,
        prior_version_id: draft.priorVersionId,
      });
    if (designError) throw designError;

    const original = draft.assets.find((asset) => asset.role === 'original')!;
    const display =
      draft.assets.find((asset) => asset.role === 'display') ?? original;
    const production = draft.assets.find(
      (asset) => asset.role === 'production',
    )!;
    const thumbnail = draft.assets.find(
      (asset) => asset.role === 'thumbnail',
    )!;
    const { error: versionError } = await this.client
      .from('design_versions')
      .insert({
        id: draft.versionId,
        curated_design_id: draft.id,
        version_label: 'version-1',
        artwork_asset_id: display.id,
        production_asset_id: production.id,
        thumbnail_asset_id: thumbnail.id,
      });
    if (versionError) throw versionError;
    const { error: currentVersionError } = await this.client
      .from('curated_designs')
      .update({ current_version_id: draft.versionId })
      .eq('id', draft.id);
    if (currentVersionError) throw currentVersionError;

    const defaultProduct = draft.compatibility.find(
      (item) => item.isDefault,
    )!;
    const { error: defaultError } = await this.client
      .from('design_product_defaults')
      .insert({
        curated_design_id: draft.id,
        merchandising_product_id: defaultProduct.productId,
        default_product_color: defaultProduct.defaultColor,
        default_placement: {
          position: 'front',
          decorationMethod: 'digital-printing',
          ...defaultProduct.placement,
        },
      });
    if (defaultError) throw defaultError;

    const { error: compatibilityError } = await this.client
      .from('design_product_compatibility')
      .insert(
        draft.compatibility.map((item) => ({
          curated_design_id: draft.id,
          merchandising_product_id: item.productId,
          compatible: ['compatible', 'recommended'].includes(item.status),
          reason: item.status,
          preview_configuration: {
            defaultColor: item.defaultColor,
            defaultVariantId: item.defaultVariantId,
            placement: item.placement,
          },
        })),
      );
    if (compatibilityError) throw compatibilityError;

    await this.client.from('studio_design_audit_log').insert({
      curated_design_id: draft.id,
      design_version_id: draft.versionId,
      action:
        draft.publicationStatus === 'published'
          ? 'published'
          : draft.publicationStatus === 'scheduled'
            ? 'scheduled'
            : 'created',
      actor_user_id:
        actorUserId === 'studio-operations' ? null : actorUserId,
      prior_version_id: draft.priorVersionId,
      change_summary: {
        publicationStatus: draft.publicationStatus,
        productCount: draft.compatibility.length,
      },
    });
    await this.client.from('studio_design_metrics').insert({
      curated_design_id: draft.id,
    });
    return draft;
  }

  async archive(designId: string, actorUserId: string) {
    const now = new Date().toISOString();
    const { data, error } = await this.client
      .from('curated_designs')
      .update({
        publication_status: 'archived',
        archived_at: now,
        updated_at: now,
        updated_by:
          actorUserId === 'studio-operations' ? null : actorUserId,
      })
      .eq('id', designId)
      .select('id, current_version_id')
      .maybeSingle();
    if (error) throw error;
    if (!data) {
      throw new StudioPublishingError(
        'DESIGN_NOT_FOUND',
        'Studio design was not found.',
      );
    }
    await this.client.from('studio_design_audit_log').insert({
      curated_design_id: data.id,
      design_version_id: data.current_version_id,
      action: 'archived',
      actor_user_id:
        actorUserId === 'studio-operations' ? null : actorUserId,
      change_summary: { archivedAt: now },
    });
    return { id: data.id, publicationStatus: 'archived' as const };
  }
}

export const studioDesignRepository = new StudioDesignRepository();
