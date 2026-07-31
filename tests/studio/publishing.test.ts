import { describe, expect, it } from 'vitest';
import {
  canPublishStudioDesign,
  getStudioPublicationChecklist,
  sanitizeStudioSvg,
  studioDesignDraftSchema,
} from '@/lib/studio/types';

const completeDraft = studioDesignDraftSchema.parse({
  id: 'design-studio-1',
  versionId: 'design-studio-1-v1',
  title: 'Lake Morning',
  slug: 'lake-morning',
  description: 'A calm illustrated lake scene for everyday spaces.',
  artistOrSource: 'PrintMe Studio',
  usageRights: 'Owned original artwork',
  rightsDocumentationNotes: 'Source agreement on file.',
  tags: ['lake', 'calm'],
  seoTitle: 'Lake Morning Art',
  seoDescription: 'Shop the Lake Morning design across approved products.',
  altText: 'Warm sunrise over a quiet lake',
  publicationStatus: 'draft',
  scheduledFor: null,
  filters: ['staff-pick'],
  collectionIds: [],
  dropIds: [],
  assets: [
    {
      id: 'source',
      role: 'original',
      stableUrl: 'https://cdn.example.test/source.png',
      storagePath: 'design/source.png',
      checksum: 'a'.repeat(64),
      altText: 'Warm sunrise over a quiet lake',
      width: 3600,
      height: 4500,
      mimeType: 'image/png',
      fileSizeBytes: 100,
      hasTransparency: true,
    },
    {
      id: 'production',
      role: 'production',
      stableUrl: 'https://cdn.example.test/production.png',
      storagePath: 'design/production.png',
      checksum: 'b'.repeat(64),
      altText: 'Warm sunrise over a quiet lake',
      width: 3600,
      height: 4500,
      mimeType: 'image/png',
      fileSizeBytes: 100,
      hasTransparency: true,
    },
    {
      id: 'thumbnail',
      role: 'thumbnail',
      stableUrl: 'https://cdn.example.test/thumb.webp',
      storagePath: 'design/thumb.webp',
      checksum: 'c'.repeat(64),
      altText: 'Warm sunrise over a quiet lake',
      width: 600,
      height: 750,
      mimeType: 'image/webp',
      fileSizeBytes: 50,
      hasTransparency: false,
    },
  ],
  compatibility: [
    {
      productId: 'gallery-poster',
      status: 'recommended',
      defaultColor: 'Matte',
      defaultVariantId: 43138,
      isDefault: true,
      placement: {
        normalizedX: 0.5,
        normalizedY: 0.5,
        normalizedScale: 1,
        angle: 0,
        fit: 'contain',
      },
      severeDpiWarning: false,
      severeSafeZoneWarning: false,
    },
  ],
  priorVersionId: null,
});

describe('Studio publication gate', () => {
  it('requires every critical checklist item', () => {
    expect(getStudioPublicationChecklist(completeDraft)).toHaveLength(10);
    expect(canPublishStudioDesign(completeDraft)).toBe(true);
    expect(
      canPublishStudioDesign({
        ...completeDraft,
        assets: completeDraft.assets.filter(
          (asset) => asset.role !== 'production',
        ),
      }),
    ).toBe(false);
  });

  it('rejects active and externally loaded SVG content', () => {
    expect(() =>
      sanitizeStudioSvg('<svg><script>alert(1)</script></svg>'),
    ).toThrow(/unsafe/i);
    expect(() =>
      sanitizeStudioSvg('<svg><image href="https://example.com/x"/></svg>'),
    ).toThrow(/unsafe/i);
    expect(sanitizeStudioSvg('<svg><path d="M0 0"/></svg>')).toContain(
      '<path',
    );
  });
});
