'use client';

import { useMemo, useState } from 'react';
import { Check, Upload } from 'lucide-react';
import { InstantPreview } from '@/components/commerce/InstantPreview';
import { inspectImage } from '@/lib/commerce/image-preparation';
import {
  createProductConfiguration,
  refreshConfigurationPreview,
} from '@/lib/commerce/placement';
import { getPreviewTemplate } from '@/lib/commerce/templates';
import type {
  DesignAsset,
  MerchProduct,
} from '@/lib/commerce/types';
import {
  createDefaultCompatibility,
  saveStudioDesign,
  uploadStudioAsset,
} from '@/lib/studio/client';
import {
  canPublishStudioDesign,
  getStudioPublicationChecklist,
  sanitizeStudioSvg,
  type StudioDesignDraft,
} from '@/lib/studio/types';

interface StudioDesignEditorProps {
  products: MerchProduct[];
  existingDesignId?: string;
}

const initialMetadata = {
  title: '',
  slug: '',
  description: '',
  artistOrSource: '',
  usageRights: '',
  rightsDocumentationNotes: '',
  tags: '',
  seoTitle: '',
  seoDescription: '',
  altText: '',
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

async function inspectStudioFile(file: File) {
  if (file.size > 20 * 1024 * 1024) {
    throw new Error('Choose an asset smaller than 20 MB.');
  }
  if (
    !['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'].includes(
      file.type,
    )
  ) {
    throw new Error('Choose a PNG, JPEG, WebP, or sanitized SVG.');
  }
  if (file.type === 'image/svg+xml') {
    const source = sanitizeStudioSvg(await file.text());
    const documentNode = new DOMParser().parseFromString(
      source,
      'image/svg+xml',
    );
    const svg = documentNode.documentElement;
    const viewBox = svg
      .getAttribute('viewBox')
      ?.split(/\s+/)
      .map(Number);
    const width = Number(svg.getAttribute('width')) || viewBox?.[2] || 0;
    const height = Number(svg.getAttribute('height')) || viewBox?.[3] || 0;
    if (!width || !height) {
      throw new Error('SVG dimensions or viewBox are required.');
    }
    return {
      width: Math.round(width),
      height: Math.round(height),
      mimeType: file.type,
      hasTransparency: true,
    };
  }
  return inspectImage(file);
}

export function StudioDesignEditor({
  products,
  existingDesignId,
}: StudioDesignEditorProps) {
  const [designId] = useState(
    () => existingDesignId ?? `curated-${crypto.randomUUID()}`,
  );
  const [versionId] = useState(() => `${designId}-version-1`);
  const [metadata, setMetadata] = useState(initialMetadata);
  const [file, setFile] = useState<File | null>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [fileInfo, setFileInfo] = useState<{
    width: number;
    height: number;
    mimeType: string;
    hasTransparency: boolean;
  } | null>(null);
  const [compatibility, setCompatibility] = useState(() =>
    createDefaultCompatibility(products),
  );
  const [previewProductId, setPreviewProductId] = useState(products[0].id);
  const [filters, setFilters] = useState<
    Array<'new' | 'trending' | 'bestsellers' | 'staff-pick'>
  >(['new']);
  const [scheduledFor, setScheduledFor] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const localAssets = useMemo<StudioDesignDraft['assets']>(
    () =>
      file && fileInfo && metadata.altText
        ? (['original', 'display', 'thumbnail', 'production'] as const).map(
            (role) => ({
              id: `local-${role}`,
              role,
              stableUrl: `https://local.invalid/${role}`,
              storagePath: `pending/${role}`,
              checksum: '0'.repeat(64),
              altText: metadata.altText,
              width: fileInfo.width,
              height: fileInfo.height,
              mimeType: fileInfo.mimeType as
                | 'image/png'
                | 'image/jpeg'
                | 'image/webp'
                | 'image/svg+xml',
              fileSizeBytes: file.size,
              hasTransparency: fileInfo.hasTransparency,
            }),
          )
        : [],
    [file, fileInfo, metadata.altText],
  );

  function draft(
    publicationStatus: StudioDesignDraft['publicationStatus'],
    assets = localAssets,
  ): StudioDesignDraft {
    return {
      id: designId,
      versionId,
      ...metadata,
      tags: metadata.tags
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean),
      publicationStatus,
      scheduledFor:
        publicationStatus === 'scheduled' && scheduledFor
          ? new Date(scheduledFor).toISOString()
          : null,
      filters,
      collectionIds: [],
      dropIds: [],
      assets,
      compatibility,
      priorVersionId: null,
    };
  }

  const checklist = getStudioPublicationChecklist(draft('draft'));
  const previewProduct =
    products.find((product) => product.id === previewProductId) ??
    products[0];
  const previewCompatibility = compatibility.find(
    (item) => item.productId === previewProduct.id,
  )!;
  const previewVariant =
    previewProduct.variants.find(
      (variant) =>
        variant.printifyVariantId ===
        previewCompatibility.defaultVariantId,
    ) ?? previewProduct.variants[0];
  const previewAsset = useMemo<DesignAsset | null>(
    () =>
      fileUrl && fileInfo
        ? {
            id: `preview-${designId}`,
            version: versionId,
            url: fileUrl,
            productionUrl: fileUrl,
            alt: metadata.altText || 'Studio design preview',
            width: fileInfo.width,
            height: fileInfo.height,
            mimeType: fileInfo.mimeType,
            hasTransparency: fileInfo.hasTransparency,
            sourceType: 'curated',
            role: 'preview',
          }
        : null,
    [designId, fileInfo, fileUrl, metadata.altText, versionId],
  );
  const previewConfiguration = useMemo(() => {
    if (!previewAsset) return null;
    const base = createProductConfiguration({
      designId,
      design: previewAsset,
      product: previewProduct,
      template: getPreviewTemplate(previewProduct.previewTemplateId),
      previous: {
        ...createProductConfiguration({
          designId,
          design: previewAsset,
          product: previewProduct,
          template: getPreviewTemplate(previewProduct.previewTemplateId),
        }),
        selectedColor: previewVariant.color,
        selectedSize: previewVariant.size,
        printifyVariantId: previewVariant.printifyVariantId,
      },
    });
    return refreshConfigurationPreview(
      {
        ...base,
        ...previewCompatibility.placement,
      },
      previewAsset,
    );
  }, [
    designId,
    previewAsset,
    previewCompatibility.placement,
    previewProduct,
    previewVariant,
  ]);

  function updateMetadata(key: keyof typeof metadata, value: string) {
    setMetadata((current) => ({
      ...current,
      [key]: value,
      ...(key === 'title' && !current.slug
        ? { slug: slugify(value) }
        : {}),
    }));
  }

  async function acceptFile(nextFile: File) {
    setError(null);
    try {
      const inspected = await inspectStudioFile(nextFile);
      if (fileUrl) URL.revokeObjectURL(fileUrl);
      setFile(nextFile);
      setFileInfo(inspected);
      setFileUrl(URL.createObjectURL(nextFile));
      setMetadata((current) => ({
        ...current,
        altText:
          current.altText ||
          nextFile.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' '),
      }));
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : 'Asset validation failed.',
      );
    }
  }

  function updateCompatibility(
    productId: string,
    patch: Partial<(typeof compatibility)[number]>,
  ) {
    setCompatibility((items) =>
      items.map((item) => {
        if (patch.isDefault && item.productId !== productId) {
          return { ...item, isDefault: false };
        }
        return item.productId === productId ? { ...item, ...patch } : item;
      }),
    );
  }

  async function save(
    publicationStatus: StudioDesignDraft['publicationStatus'],
  ) {
    if (!file || !fileInfo) {
      setError('Upload and validate an asset first.');
      return;
    }
    const candidate = draft(publicationStatus);
    if (
      ['published', 'scheduled'].includes(publicationStatus) &&
      !canPublishStudioDesign(candidate)
    ) {
      setError('Complete every critical publication check first.');
      return;
    }
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const assets = await Promise.all(
        (['original', 'display', 'thumbnail', 'production'] as const).map(
          (role) =>
            uploadStudioAsset({
              file,
              role,
              width: fileInfo.width,
              height: fileInfo.height,
              altText: metadata.altText,
              hasTransparency: fileInfo.hasTransparency,
            }),
        ),
      );
      await saveStudioDesign(draft(publicationStatus, assets));
      setMessage(
        publicationStatus === 'published'
          ? 'Published. The public design route can now read this version.'
          : publicationStatus === 'scheduled'
            ? 'Scheduled for publication.'
            : 'Draft saved.',
      );
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : 'Studio save failed.',
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="studio-editor">
      <header className="studio-page-header">
        <div>
          <p>Curated design workflow</p>
          <h1>{existingDesignId ? 'Edit design' : 'New design'}</h1>
        </div>
        <div className="studio-editor-actions">
          <button
            className="studio-secondary"
            type="button"
            onClick={() => void save('draft')}
            disabled={saving}
          >
            Save draft
          </button>
          <button
            className="studio-primary"
            type="button"
            onClick={() => void save('published')}
            disabled={saving || !canPublishStudioDesign(draft('published'))}
          >
            Publish
          </button>
        </div>
      </header>

      <div className="studio-editor-grid">
        <div className="studio-editor-form">
          <section className="studio-form-section">
            <h2>1. Source asset</h2>
            <label className="studio-upload">
              <Upload aria-hidden="true" size={24} />
              <strong>Upload source artwork</strong>
              <span>PNG, high-resolution JPG, WebP, or sanitized SVG</span>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                onChange={(event) => {
                  const selected = event.target.files?.[0];
                  if (selected) void acceptFile(selected);
                }}
                aria-label="Upload curated design"
              />
            </label>
            {fileInfo && (
              <p className="studio-file-summary">
                {file?.name} · {fileInfo.width} × {fileInfo.height} ·{' '}
                {fileInfo.mimeType}
              </p>
            )}
          </section>

          <section className="studio-form-section">
            <h2>2. Metadata and rights</h2>
            <div className="studio-field-grid">
              {(
                [
                  ['title', 'Title'],
                  ['slug', 'Slug'],
                  ['artistOrSource', 'Artist or source'],
                  ['usageRights', 'Usage rights'],
                  ['altText', 'Alt text'],
                  ['tags', 'Tags, comma separated'],
                  ['seoTitle', 'SEO title'],
                  ['seoDescription', 'SEO description'],
                ] as const
              ).map(([key, label]) => (
                <label key={key}>
                  {label}
                  <input
                    value={metadata[key]}
                    onChange={(event) =>
                      updateMetadata(key, event.target.value)
                    }
                  />
                </label>
              ))}
              <label className="studio-field-wide">
                Description
                <textarea
                  value={metadata.description}
                  onChange={(event) =>
                    updateMetadata('description', event.target.value)
                  }
                />
              </label>
              <label className="studio-field-wide">
                Rights documentation notes
                <textarea
                  value={metadata.rightsDocumentationNotes}
                  onChange={(event) =>
                    updateMetadata(
                      'rightsDocumentationNotes',
                      event.target.value,
                    )
                  }
                />
              </label>
            </div>
          </section>

          <section className="studio-form-section">
            <h2>3. Merchandising</h2>
            <div className="studio-filter-row">
              {(['new', 'trending', 'bestsellers', 'staff-pick'] as const).map(
                (filter) => (
                  <label key={filter}>
                    <input
                      type="checkbox"
                      checked={filters.includes(filter)}
                      onChange={(event) =>
                        setFilters((current) =>
                          event.target.checked
                            ? [...current, filter]
                            : current.filter((item) => item !== filter),
                        )
                      }
                    />
                    {filter}
                  </label>
                ),
              )}
            </div>
            <label>
              Schedule
              <input
                type="datetime-local"
                value={scheduledFor}
                onChange={(event) => setScheduledFor(event.target.value)}
              />
            </label>
            <button
              type="button"
              className="studio-secondary"
              disabled={!scheduledFor || saving}
              onClick={() => void save('scheduled')}
            >
              Schedule publication
            </button>
          </section>

          <section className="studio-form-section">
            <h2>4. Product compatibility</h2>
            <div className="studio-compatibility">
              {products.map((product) => {
                const item = compatibility.find(
                  (candidate) => candidate.productId === product.id,
                )!;
                return (
                  <article key={product.id}>
                    <button
                      type="button"
                      onClick={() => setPreviewProductId(product.id)}
                    >
                      <strong>{product.name}</strong>
                      <small>Preview and adjust</small>
                    </button>
                    <select
                      value={item.status}
                      onChange={(event) =>
                        updateCompatibility(product.id, {
                          status: event.target.value as typeof item.status,
                        })
                      }
                      aria-label={`${product.name} compatibility`}
                    >
                      <option value="recommended">Recommended</option>
                      <option value="compatible">Compatible</option>
                      <option value="needs-adjustment">Needs adjustment</option>
                      <option value="incompatible">Incompatible</option>
                    </select>
                    <label>
                      <input
                        type="radio"
                        name="default-product"
                        checked={item.isDefault}
                        onChange={() =>
                          updateCompatibility(product.id, {
                            isDefault: true,
                          })
                        }
                      />
                      Default
                    </label>
                  </article>
                );
              })}
            </div>
          </section>
        </div>

        <aside className="studio-editor-preview">
          <div className="studio-preview-card">
            <span>Public preview · {previewProduct.name}</span>
            {previewAsset && previewConfiguration ? (
              <InstantPreview
                design={previewAsset}
                configuration={previewConfiguration}
              />
            ) : (
              <div className="studio-preview-placeholder">
                Upload an asset to preview
              </div>
            )}
            <label>
              Placement scale
              <input
                type="range"
                min="0.25"
                max="1.5"
                step="0.01"
                value={previewCompatibility.placement.normalizedScale}
                onChange={(event) =>
                  updateCompatibility(previewProduct.id, {
                    placement: {
                      ...previewCompatibility.placement,
                      normalizedScale: Number(event.target.value),
                    },
                  })
                }
              />
            </label>
            <button className="studio-secondary" type="button" disabled>
              Official mockup requires staging Printify access
            </button>
          </div>
          <div className="studio-checklist">
            <h2>Prepublication checklist</h2>
            {checklist.map((item) => (
              <div key={item.key} data-complete={item.complete}>
                <Check aria-hidden="true" size={16} />
                <span>{item.label}</span>
              </div>
            ))}
          </div>
          {error && <p className="studio-error" role="alert">{error}</p>}
          {message && <p className="studio-success" role="status">{message}</p>}
        </aside>
      </div>
    </div>
  );
}
