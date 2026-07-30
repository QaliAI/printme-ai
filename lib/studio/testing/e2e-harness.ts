import 'server-only';

import { createHash, randomUUID, timingSafeEqual } from 'node:crypto';
import type { NextRequest } from 'next/server';
import type { CuratedDesignRecord } from '@/lib/commerce/designs/models';
import type { StudioDesignDraft } from '../types';

const secretCookie = 'printme-studio-e2e-secret';

interface StoredAsset {
  bytes: Uint8Array;
  contentType: string;
}

interface StudioE2EState {
  assets: Map<string, StoredAsset>;
  designs: Map<string, StudioDesignDraft>;
}

declare global {
  var __printmeStudioE2EState: StudioE2EState | undefined;
}

function state(): StudioE2EState {
  globalThis.__printmeStudioE2EState ??= {
    assets: new Map(),
    designs: new Map(),
  };
  return globalThis.__printmeStudioE2EState;
}

export function isStudioE2ERequest(request: NextRequest) {
  if (
    process.env.NODE_ENV === 'production' ||
    process.env.STUDIO_E2E_TEST_MODE !== 'true'
  ) {
    return false;
  }
  const expected = process.env.STUDIO_E2E_TEST_SECRET;
  const supplied = request.cookies.get(secretCookie)?.value;
  if (!expected || !supplied) return false;
  const expectedBytes = Buffer.from(expected);
  const suppliedBytes = Buffer.from(supplied);
  return (
    expectedBytes.length === suppliedBytes.length &&
    timingSafeEqual(expectedBytes, suppliedBytes)
  );
}

export function storeStudioE2EAsset(input: {
  bytes: Uint8Array;
  contentType: string;
}) {
  const id = `studio-e2e-asset-${randomUUID()}`;
  state().assets.set(id, input);
  return {
    id,
    checksum: createHash('sha256').update(input.bytes).digest('hex'),
    stableUrl: `http://localhost:3000/api/studio/e2e/assets/${id}`,
    storagePath: `e2e/${id}`,
  };
}

export function getStudioE2EAsset(id: string) {
  return state().assets.get(id) ?? null;
}

export function saveStudioE2EDesign(draft: StudioDesignDraft) {
  state().designs.set(draft.id, structuredClone(draft));
  return structuredClone(draft);
}

function toCuratedDesign(
  draft: StudioDesignDraft,
): CuratedDesignRecord | null {
  if (draft.publicationStatus !== 'published') return null;
  const display =
    draft.assets.find((asset) => asset.role === 'display') ??
    draft.assets.find((asset) => asset.role === 'production');
  const production = draft.assets.find(
    (asset) => asset.role === 'production',
  );
  const approved = draft.compatibility.filter((item) =>
    ['recommended', 'compatible'].includes(item.status),
  );
  const recommended =
    approved.find((item) => item.isDefault) ?? approved[0];
  if (!display || !production || !recommended) return null;
  return {
    id: draft.id,
    slug: draft.slug,
    title: draft.title,
    description: draft.description,
    collection: 'Studio review',
    asset: {
      id: display.id,
      version: draft.versionId,
      url: '/landing/transformations/pet-original.webp',
      productionUrl: '/landing/transformations/pet-original.webp',
      alt: display.altText,
      width: display.width,
      height: display.height,
      mimeType: display.mimeType,
      hasTransparency: display.hasTransparency,
      sourceType: 'curated',
      role: 'display',
      productionAssetId: production.id,
      storageKey: display.storagePath,
      byteSize: display.fileSizeBytes,
    },
    artistOrSource: draft.artistOrSource,
    rightsStatus: draft.usageRights,
    publicationStatus: 'published',
    publicationDate: new Date().toISOString(),
    tags: draft.tags,
    recommendedProductId: recommended.productId,
    defaultProductColor: recommended.defaultColor,
    defaultPlacement: {
      position: 'front',
      decorationMethod:
        recommended.productId === 'everyday-tee'
          ? 'dtg'
          : 'digital-printing',
      ...recommended.placement,
    },
    compatibleProductIds: approved.map((item) => item.productId),
    incompatibleProductIds: draft.compatibility
      .filter((item) => item.status === 'incompatible')
      .map((item) => item.productId),
    merchandisingPriority: 0,
    seoTitle: draft.seoTitle,
    seoDescription: draft.seoDescription,
    filters: draft.filters.filter(
      (
        filter,
      ): filter is 'new' | 'trending' | 'bestsellers' =>
        filter !== 'staff-pick',
    ),
  };
}

export function listPublishedStudioE2EDesigns() {
  if (
    process.env.NODE_ENV === 'production' ||
    process.env.STUDIO_E2E_TEST_MODE !== 'true'
  ) {
    return [];
  }
  return [...state().designs.values()].flatMap((draft) => {
    const design = toCuratedDesign(draft);
    return design ? [design] : [];
  });
}
