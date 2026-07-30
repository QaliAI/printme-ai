import { z } from 'zod';

export const studioPublicationStatusSchema = z.enum([
  'draft',
  'scheduled',
  'published',
  'archived',
]);

export const studioAssetSchema = z.object({
  id: z.string().min(1),
  role: z.enum(['original', 'display', 'thumbnail', 'production']),
  stableUrl: z.string().url(),
  storagePath: z.string().min(1),
  checksum: z.string().regex(/^[a-f0-9]{64}$/),
  altText: z.string().min(1),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  mimeType: z.enum(['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']),
  fileSizeBytes: z.number().int().nonnegative(),
  hasTransparency: z.boolean(),
});

export const studioProductCompatibilitySchema = z.object({
  productId: z.string().min(1),
  status: z.enum([
    'compatible',
    'incompatible',
    'needs-adjustment',
    'recommended',
  ]),
  defaultColor: z.string().nullable(),
  defaultVariantId: z.number().int().positive().nullable(),
  isDefault: z.boolean(),
  placement: z.object({
    normalizedX: z.number().min(0).max(1),
    normalizedY: z.number().min(0).max(1),
    normalizedScale: z.number().positive(),
    angle: z.number().min(-180).max(180),
    fit: z.enum(['contain', 'cover']),
  }),
  severeDpiWarning: z.boolean().default(false),
  severeSafeZoneWarning: z.boolean().default(false),
});

export const studioDesignDraftSchema = z.object({
  id: z.string().min(1),
  versionId: z.string().min(1),
  title: z.string().min(2).max(120),
  slug: z
    .string()
    .min(2)
    .max(120)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  description: z.string().min(10).max(2_000),
  artistOrSource: z.string().min(2).max(160),
  usageRights: z.string().min(2).max(240),
  rightsDocumentationNotes: z.string().min(2).max(2_000),
  tags: z.array(z.string().min(1).max(48)).max(30),
  seoTitle: z.string().min(2).max(70),
  seoDescription: z.string().min(10).max(170),
  altText: z.string().min(5).max(240),
  publicationStatus: studioPublicationStatusSchema,
  scheduledFor: z.string().datetime({ offset: true }).nullable(),
  filters: z.array(
    z.enum(['new', 'trending', 'bestsellers', 'staff-pick']),
  ),
  collectionIds: z.array(z.string().min(1)),
  dropIds: z.array(z.string().min(1)),
  assets: z.array(studioAssetSchema),
  compatibility: z.array(studioProductCompatibilitySchema).min(1),
  priorVersionId: z.string().min(1).nullable(),
});

export type StudioDesignDraft = z.infer<typeof studioDesignDraftSchema>;
export type StudioProductCompatibility = z.infer<
  typeof studioProductCompatibilitySchema
>;

export interface StudioChecklistItem {
  key: string;
  label: string;
  complete: boolean;
  critical: boolean;
}

export function getStudioPublicationChecklist(
  draft: StudioDesignDraft,
): StudioChecklistItem[] {
  const approved = draft.compatibility.filter((item) =>
    ['compatible', 'recommended'].includes(item.status),
  );
  return [
    {
      key: 'rights',
      label: 'Usage rights and documentation entered',
      complete: Boolean(
        draft.usageRights.trim() &&
          draft.rightsDocumentationNotes.trim(),
      ),
      critical: true,
    },
    {
      key: 'source',
      label: 'Untouched source asset exists',
      complete: draft.assets.some((asset) => asset.role === 'original'),
      critical: true,
    },
    {
      key: 'production',
      label: 'Production asset exists',
      complete: draft.assets.some((asset) => asset.role === 'production'),
      critical: true,
    },
    {
      key: 'thumbnail',
      label: 'Thumbnail exists',
      complete: draft.assets.some((asset) => asset.role === 'thumbnail'),
      critical: true,
    },
    {
      key: 'default-product',
      label: 'Default product configured',
      complete: approved.some((item) => item.isDefault),
      critical: true,
    },
    {
      key: 'approved-product',
      label: 'At least one approved product',
      complete: approved.length > 0,
      critical: true,
    },
    {
      key: 'dpi',
      label: 'No severe DPI warning',
      complete: !approved.some((item) => item.severeDpiWarning),
      critical: true,
    },
    {
      key: 'safe-zone',
      label: 'No severe safe-zone warning',
      complete: !approved.some(
        (item) => item.severeSafeZoneWarning,
      ),
      critical: true,
    },
    {
      key: 'seo-title',
      label: 'SEO title entered',
      complete: Boolean(draft.seoTitle.trim()),
      critical: true,
    },
    {
      key: 'seo-description',
      label: 'SEO description entered',
      complete: Boolean(draft.seoDescription.trim()),
      critical: true,
    },
  ];
}

export function canPublishStudioDesign(draft: StudioDesignDraft) {
  return getStudioPublicationChecklist(draft).every(
    (item) => !item.critical || item.complete,
  );
}

export function sanitizeStudioSvg(source: string) {
  const forbidden =
    /<script|<foreignObject|on[a-z]+\s*=|(?:href|xlink:href)\s*=\s*["'](?:https?:|data:|javascript:)/i;
  if (forbidden.test(source)) {
    throw new Error('SVG contains unsafe or externally loaded content.');
  }
  if (!/<svg[\s>]/i.test(source)) {
    throw new Error('SVG root element is missing.');
  }
  return source;
}
