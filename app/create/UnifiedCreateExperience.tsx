'use client';

import Link from 'next/link';
import {
  AlignCenter,
  Camera,
  Check,
  ChevronRight,
  ImagePlus,
  Palette,
  Redo2,
  RotateCcw,
  ShoppingBag,
  Undo2,
  X,
} from 'lucide-react';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react';
import { InstantPreview } from '@/components/commerce/InstantPreview';
import { trackCommerceEvent } from '@/lib/commerce/analytics-events';
import {
  clearCreateSession,
  createAssetStorageKey,
  loadCreateAsset,
  readCreateSession,
  removeCreateAssets,
  saveCreateAsset,
  writeCreateSession,
} from '@/lib/commerce/create-session';
import {
  inspectImage,
  prepareImage,
  type ArtStyle,
  type PreparationMode,
} from '@/lib/commerce/image-preparation';
import {
  createCartSnapshot,
  readLocalCart,
  upsertCartItem,
  writeLocalCart,
} from '@/lib/commerce/local-cart';
import {
  changePreviewViewConfiguration,
  changeProductVariantConfiguration,
  clamp,
  createProductConfiguration,
  getSelectedVariant,
  isPlacementCompatible,
  placementFromConfiguration,
  refreshConfigurationPreview,
} from '@/lib/commerce/placement';
import { runDesignPreflight } from '@/lib/commerce/preflight';
import { upsertPersistentCartItem } from '@/lib/commerce/persistent-cart-client';
import {
  BrowserProductAdaptationService,
  recordAdaptationCost,
} from '@/lib/commerce/product-adaptation';
import { getPreviewTemplate } from '@/lib/commerce/templates';
import type {
  CuratedDesign,
  DesignAsset,
  DesignSourceType,
  MerchProduct,
  ProductConfiguration,
  ProductVariant,
} from '@/lib/commerce/types';
import styles from './create.module.css';

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const ACCEPTED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

interface UnifiedCreateExperienceProps {
  products: MerchProduct[];
}

type SheetName =
  | 'product'
  | 'variant'
  | 'view'
  | 'placement'
  | 'style'
  | null;

function formatPrice(cents: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100);
}

function getProduct(products: MerchProduct[], productId: string) {
  const product = products.find((candidate) => candidate.id === productId);
  if (!product) throw new Error(`Unknown product: ${productId}`);
  return product;
}

function getVariant(product: MerchProduct, printifyVariantId: number) {
  const variant = product.variants.find(
    (candidate) => candidate.printifyVariantId === printifyVariantId,
  );
  if (!variant) throw new Error(`Unknown variant: ${printifyVariantId}`);
  return variant;
}

function sourceTypeFor(
  mode: PreparationMode,
  fileType: string,
): DesignSourceType {
  if (mode === 'background-removed') return 'background-removed';
  if (mode === 'art') return 'ai-styled';
  return fileType === 'image/png' ? 'uploaded-artwork' : 'uploaded-photo';
}

function configurationAsset(
  asset: DesignAsset,
  revision: number,
  mode: PreparationMode,
): DesignAsset {
  return {
    ...asset,
    id: `${asset.id}-r${revision}`,
    version: `version-${revision}`,
    sourceType: sourceTypeFor(mode, asset.mimeType),
    role: mode === 'original' ? 'original' : 'production',
    productionAssetId: `${asset.id}-production-r${revision}`,
  };
}

function BottomSheet({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open || !sheetRef.current) return;
    previousFocus.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const sheet = sheetRef.current;
    const selector =
      'button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';
    const focusable = Array.from(
      sheet.querySelectorAll<HTMLElement>(selector),
    );
    (focusable[0] ?? sheet).focus();

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
        return;
      }
      if (event.key !== 'Tab' || focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => {
      window.removeEventListener('keydown', handleKey);
      previousFocus.current?.focus();
    };
  }, [onClose, open]);

  if (!open) return null;

  return (
    <div className={styles.sheetBackdrop} onPointerDown={onClose}>
      <div
        ref={sheetRef}
        className={styles.sheet}
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-sheet-title"
        tabIndex={-1}
        onPointerDown={(event) => event.stopPropagation()}
      >
        <div className={styles.sheetHandle} aria-hidden="true" />
        <header>
          <h2 id="create-sheet-title">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close options">
            <X aria-hidden="true" size={20} />
          </button>
        </header>
        <div className={styles.sheetContent}>{children}</div>
      </div>
    </div>
  );
}

export function UnifiedCreateExperience({
  products,
}: UnifiedCreateExperienceProps) {
  const [asset, setAsset] = useState<DesignAsset | null>(null);
  const [originalBlob, setOriginalBlob] = useState<Blob | null>(null);
  const [designId, setDesignId] = useState<string | null>(null);
  const [revision, setRevision] = useState(1);
  const [preparation, setPreparation] =
    useState<PreparationMode>('original');
  const [artStyle, setArtStyle] = useState<ArtStyle>('illustrated');
  const [adaptationLabel, setAdaptationLabel] = useState<string | null>(
    null,
  );
  const [configuration, setConfiguration] =
    useState<ProductConfiguration | null>(null);
  const [history, setHistory] = useState<ProductConfiguration[]>([]);
  const [future, setFuture] = useState<ProductConfiguration[]>([]);
  const [sheet, setSheet] = useState<SheetName>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [restored, setRestored] = useState(false);
  const [cartMessage, setCartMessage] = useState<string | null>(null);
  const [placementMessage, setPlacementMessage] = useState<string | null>(null);
  const closeSheet = useCallback(() => setSheet(null), []);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewStageRef = useRef<HTMLDivElement>(null);
  const activePointers = useRef(new Map<number, { x: number; y: number }>());
  const gestureOrigin = useRef<ProductConfiguration | null>(null);
  const pinchStart = useRef<{
    distance: number;
    scale: number;
  } | null>(null);
  const trackedPreviewKeys = useRef(new Set<string>());
  const trackedWarnings = useRef(new Set<string>());
  const adaptationService = useMemo(
    () => new BrowserProductAdaptationService(),
    [],
  );

  const selectedProduct = configuration
    ? getProduct(products, configuration.merchProductId)
    : products[0];
  const selectedVariant =
    configuration && selectedProduct
      ? getVariant(selectedProduct, configuration.printifyVariantId)
      : selectedProduct.variants.find((variant) => variant.available) ??
        selectedProduct.variants[0];
  const adaptationPlan = useMemo(
    () => adaptationService.plan(selectedProduct, selectedVariant),
    [adaptationService, selectedProduct, selectedVariant],
  );
  const selectedTemplate = configuration
    ? getPreviewTemplate(configuration.previewTemplateId)
    : null;
  const selectedView = selectedTemplate?.views.find(
    (view) => view.id === configuration?.previewViewId,
  );

  const qualityReport = useMemo(() => {
    if (!asset || !configuration) return null;
    return runDesignPreflight({
      asset,
      configuration,
      product: selectedProduct,
      variant: selectedVariant,
    });
  }, [asset, configuration, selectedProduct, selectedVariant]);

  useEffect(() => {
    const renderKey = configuration?.instantPreview.renderKey;
    if (!renderKey || trackedPreviewKeys.current.has(renderKey)) return;
    trackedPreviewKeys.current.add(renderKey);
    trackCommerceEvent('preview_generated', {
      productId: configuration.merchProductId,
      previewViewId: configuration.previewViewId,
    });
    if (
      configuration.officialMockupState === 'ready' &&
      configuration.officialMockupUrl
    ) {
      trackCommerceEvent('official_mockup_ready', {
        productId: configuration.merchProductId,
      });
    }
  }, [configuration]);

  useEffect(() => {
    if (!qualityReport || qualityReport.primary.severity === 'info') return;
    const key = `${configuration?.instantPreview.renderKey}:${qualityReport.primary.code}`;
    if (trackedWarnings.current.has(key)) return;
    trackedWarnings.current.add(key);
    trackCommerceEvent('quality_warning_seen', {
      code: qualityReport.primary.code,
      severity: qualityReport.primary.severity,
      productId: configuration?.merchProductId ?? 'unknown',
    });
  }, [configuration, qualityReport]);

  useEffect(() => {
    let cancelled = false;
    async function restore() {
      const saved = readCreateSession(window.localStorage);
      if (!saved) {
        setRestored(true);
        return;
      }
      const blob = await loadCreateAsset(
        createAssetStorageKey(saved.designId, saved.revision),
      );
      if (!blob || cancelled) {
        clearCreateSession(window.localStorage);
        setRestored(true);
        return;
      }
      const original =
        saved.revision === 1
          ? blob
          : await loadCreateAsset(createAssetStorageKey(saved.designId, 1));
      const url = URL.createObjectURL(blob);
      const restoredAsset: DesignAsset = {
        id: saved.asset.id,
        version: saved.versionId,
        url,
        productionUrl: url,
        alt: saved.asset.alt,
        width: saved.asset.width,
        height: saved.asset.height,
        mimeType: saved.asset.mimeType,
        hasTransparency: saved.asset.hasTransparency,
        sourceType: saved.sourceType,
        role: saved.adaptationLabel
          ? 'product-derivative'
          : saved.preparation === 'original'
            ? 'original'
            : 'production',
        productionAssetId: `${saved.asset.id}-production`,
        storageKey: createAssetStorageKey(
          saved.designId,
          saved.revision,
        ),
        byteSize: blob.size,
      };
      const product = getProduct(products, saved.productId);
      const next = createProductConfiguration({
        designId: saved.designId,
        design: restoredAsset,
        product,
        template: getPreviewTemplate(product.previewTemplateId),
      });
      setDesignId(saved.designId);
      setRevision(saved.revision);
      setPreparation(saved.preparation);
      setArtStyle(saved.artStyle);
      setAdaptationLabel(saved.adaptationLabel ?? null);
      setOriginalBlob(original ?? blob);
      setAsset(restoredAsset);
      const restoredVariant = getVariant(
        product,
        saved.printifyVariantId,
      );
      const variantAware = changeProductVariantConfiguration({
        configuration: next,
        design: restoredAsset,
        product,
        variant: restoredVariant,
      }).configuration;
      setConfiguration(
        refreshConfigurationPreview(
          {
            ...variantAware,
            normalizedX: saved.placement.normalizedX,
            normalizedY: saved.placement.normalizedY,
            normalizedScale: saved.placement.normalizedScale,
            angle: saved.placement.angle,
            fit: saved.placement.fit,
          },
          restoredAsset,
        ),
      );
      setRestored(true);
    }
    void restore();
    return () => {
      cancelled = true;
    };
  }, [products]);

  useEffect(() => {
    if (!restored || !asset || !configuration || !designId) return;
    writeCreateSession(window.localStorage, {
      schemaVersion: 1,
      designId,
      versionId: configuration.designVersionId ?? configuration.designVersion,
      revision,
      sourceType: asset.sourceType ?? 'uploaded-photo',
      preparation,
      artStyle,
      adaptationLabel: adaptationLabel ?? undefined,
      asset: {
        id: asset.id,
        alt: asset.alt,
        width: asset.width,
        height: asset.height,
        mimeType: asset.mimeType,
        hasTransparency: asset.hasTransparency,
      },
      productId: configuration.merchProductId,
      printifyVariantId: configuration.printifyVariantId,
      placement: {
        normalizedX: configuration.normalizedX,
        normalizedY: configuration.normalizedY,
        normalizedScale: configuration.normalizedScale,
        angle: configuration.angle,
        fit: configuration.fit ?? 'contain',
      },
      phase: cartMessage ? 'cart' : 'customize',
      updatedAt: new Date().toISOString(),
    });
  }, [
    artStyle,
    adaptationLabel,
    asset,
    cartMessage,
    configuration,
    designId,
    preparation,
    restored,
    revision,
  ]);

  useEffect(
    () => () => {
      if (asset?.url.startsWith('blob:')) URL.revokeObjectURL(asset.url);
    },
    [asset?.url],
  );

  function replaceConfiguration(
    next: ProductConfiguration,
    record = true,
  ) {
    setConfiguration((current) => {
      if (record && current) {
        setHistory((items) => [...items.slice(-29), current]);
        setFuture([]);
      }
      return next;
    });
  }

  async function acceptFile(file: File) {
    setUploadError(null);
    setCartMessage(null);
    if (!ACCEPTED_TYPES.has(file.type)) {
      setUploadError('Choose a JPEG, PNG, or WebP image.');
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setUploadError('Choose an image smaller than 10 MB.');
      return;
    }

    trackCommerceEvent('upload_started', {
      fileType: file.type,
      byteSize: file.size,
    });
    const inspected = await inspectImage(file);
    const nextDesignId = `customer-design-${crypto.randomUUID()}`;
    const url = URL.createObjectURL(file);
    const baseAsset: DesignAsset = {
      id: `asset-${crypto.randomUUID()}`,
      version: 'version-1',
      url,
      productionUrl: url,
      alt: file.name || 'Uploaded artwork',
      width: inspected.width,
      height: inspected.height,
      mimeType: inspected.mimeType,
      hasTransparency: inspected.hasTransparency,
      sourceType: sourceTypeFor('original', inspected.mimeType),
      role: 'original',
      productionAssetId: `production-${crypto.randomUUID()}`,
      storageKey: createAssetStorageKey(nextDesignId, 1),
      byteSize: file.size,
    };
    const product = products[0];
    await saveCreateAsset(createAssetStorageKey(nextDesignId, 1), file);
    setOriginalBlob(file);
    setDesignId(nextDesignId);
    setRevision(1);
    setPreparation('original');
    setAsset(baseAsset);
    setHistory([]);
    setFuture([]);
    setConfiguration(
      createProductConfiguration({
        designId: nextDesignId,
        design: baseAsset,
        product,
        template: getPreviewTemplate(product.previewTemplateId),
      }),
    );
    trackCommerceEvent('upload_completed', {
      fileType: inspected.mimeType,
      byteSize: file.size,
      width: inspected.width,
      height: inspected.height,
    });
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file) void acceptFile(file);
  }

  async function applyPreparation(mode: PreparationMode) {
    if (!asset || !originalBlob || !designId) return;
    setPreparing(true);
    setUploadError(null);
    try {
      const prepared = await prepareImage(originalBlob, mode, artStyle);
      const nextRevision = revision + 1;
      const url = URL.createObjectURL(prepared.blob);
      const nextAsset = configurationAsset(
        {
          ...asset,
          id: asset.id.replace(/-r\d+$/, ''),
          url,
          productionUrl: url,
          width: prepared.width,
          height: prepared.height,
          mimeType: prepared.mimeType,
          hasTransparency: prepared.hasTransparency,
          byteSize: prepared.blob.size,
        },
        nextRevision,
        mode,
      );
      nextAsset.storageKey = createAssetStorageKey(
        designId,
        nextRevision,
      );
      await saveCreateAsset(
        createAssetStorageKey(designId, nextRevision),
        prepared.blob,
      );
      const product = getProduct(
        products,
        configuration?.merchProductId ?? products[0].id,
      );
      const nextConfiguration = createProductConfiguration({
        designId,
        design: nextAsset,
        product,
        template: getPreviewTemplate(product.previewTemplateId),
        previous: configuration ?? undefined,
      });
      setRevision(nextRevision);
      setPreparation(mode);
      setAdaptationLabel(null);
      setAsset(nextAsset);
      replaceConfiguration(nextConfiguration);
      setSheet(null);
      trackCommerceEvent('preparation_selected', {
        mode,
        productId: product.id,
      });
    } catch (error) {
      setUploadError(
        error instanceof Error ? error.message : 'Image preparation failed.',
      );
    } finally {
      setPreparing(false);
    }
  }

  function switchProduct(product: MerchProduct) {
    if (!asset || !configuration || !designId) return;
    const template = getPreviewTemplate(product.previewTemplateId);
    const variant = getSelectedVariant(product, configuration);
    const compatible = isPlacementCompatible(
      placementFromConfiguration(configuration),
      template,
      variant,
    );
    const next = createProductConfiguration({
      designId,
      design: asset,
      product,
      template,
      previous: configuration,
    });
    setPlacementMessage(
      compatible
        ? 'Your placement was preserved. An optional product-ready adaptation is available.'
        : 'Recommended placement applied. An optional product-ready adaptation is available.',
    );
    replaceConfiguration(next);
    setSheet(null);
    trackCommerceEvent('product_changed', {
      productId: product.id,
      designVersion: asset.version,
    });
  }

  async function applyProductAdaptation() {
    if (!asset || !configuration || !designId) return;
    setPreparing(true);
    setUploadError(null);
    try {
      const source =
        (asset.storageKey
          ? await loadCreateAsset(asset.storageKey)
          : null) ?? originalBlob;
      if (!source) throw new Error('The current design source is unavailable.');
      const nextRevision = revision + 1;
      const result = await adaptationService.adapt({
        source,
        asset,
        product: selectedProduct,
        variant: selectedVariant,
        revision: nextRevision,
        designId,
      });
      const storageKey = createAssetStorageKey(designId, nextRevision);
      const url = URL.createObjectURL(result.blob);
      const derivative = {
        ...result.derivative,
        url,
        productionUrl: url,
        storageKey,
      };
      await saveCreateAsset(storageKey, result.blob);
      const nextConfiguration = createProductConfiguration({
        designId,
        design: derivative,
        product: selectedProduct,
        template: getPreviewTemplate(selectedProduct.previewTemplateId),
        previous: configuration,
      });
      recordAdaptationCost(window.localStorage, {
        designId,
        derivativeId: derivative.derivativeId!,
        productId: selectedProduct.id,
        kind: result.plan.kind,
        provider: result.cost.provider,
        amountUsd: result.cost.amountUsd,
        createdAt: new Date().toISOString(),
      });
      setRevision(nextRevision);
      setAsset(derivative);
      setAdaptationLabel(result.plan.label);
      replaceConfiguration(nextConfiguration);
      setPlacementMessage(
        `${result.plan.label} applied as an optional version. Your original is still available.`,
      );
    } catch (error) {
      setUploadError(
        error instanceof Error
          ? error.message
          : 'Product adaptation failed. Your current version was kept.',
      );
    } finally {
      setPreparing(false);
    }
  }

  function selectVariant(variant: ProductVariant) {
    if (!configuration || !asset) return;
    const changed = changeProductVariantConfiguration({
      configuration,
      design: asset,
      product: selectedProduct,
      variant,
    });
    replaceConfiguration(changed.configuration);
    setPlacementMessage(
      changed.printRegionChangedMaterially
        ? 'The print area changed for this variant. Your normalized placement was preserved and recalculated.'
        : 'Your placement was preserved for this variant.',
    );
    setSheet(null);
    trackCommerceEvent('variant_changed', {
      productId: selectedProduct.id,
      variantId: variant.id,
    });
  }

  function selectPreviewView(viewId: string) {
    if (!configuration || !asset) return;
    replaceConfiguration(
      changePreviewViewConfiguration({
        configuration,
        design: asset,
        product: selectedProduct,
        viewId,
      }),
    );
    setSheet(null);
  }

  function updatePlacement(
    patch: Partial<
      Pick<
        ProductConfiguration,
        | 'normalizedX'
        | 'normalizedY'
        | 'normalizedScale'
        | 'angle'
        | 'fit'
      >
    >,
    record = true,
  ) {
    if (!configuration || !asset) return;
    replaceConfiguration(
      refreshConfigurationPreview(
        {
          ...configuration,
          ...patch,
          normalizedX: clamp(
            patch.normalizedX ?? configuration.normalizedX,
            0,
            1,
          ),
          normalizedY: clamp(
            patch.normalizedY ?? configuration.normalizedY,
            0,
            1,
          ),
          normalizedScale: clamp(
            patch.normalizedScale ?? configuration.normalizedScale,
            0.2,
            2.4,
          ),
          angle: clamp(patch.angle ?? configuration.angle, -180, 180),
        },
        asset,
      ),
      record,
    );
  }

  function beginGesture(event: ReactPointerEvent<HTMLDivElement>) {
    if (!configuration) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    activePointers.current.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    });
    if (!gestureOrigin.current) gestureOrigin.current = configuration;
    if (activePointers.current.size === 2) {
      const [first, second] = [...activePointers.current.values()];
      pinchStart.current = {
        distance: Math.hypot(second.x - first.x, second.y - first.y),
        scale: configuration.normalizedScale,
      };
    }
  }

  function moveGesture(event: ReactPointerEvent<HTMLDivElement>) {
    const previous = activePointers.current.get(event.pointerId);
    if (!previous || !configuration || !previewStageRef.current) return;
    activePointers.current.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    });

    if (activePointers.current.size >= 2 && pinchStart.current) {
      const [first, second] = [...activePointers.current.values()];
      const distance = Math.hypot(second.x - first.x, second.y - first.y);
      updatePlacement(
        {
          normalizedScale:
            pinchStart.current.scale *
            (distance / Math.max(pinchStart.current.distance, 1)),
        },
        false,
      );
      return;
    }

    const bounds = previewStageRef.current.getBoundingClientRect();
    updatePlacement(
      {
        normalizedX:
          configuration.normalizedX +
          (event.clientX - previous.x) / bounds.width,
        normalizedY:
          configuration.normalizedY +
          (event.clientY - previous.y) / bounds.height,
      },
      false,
    );
  }

  function endGesture(event: ReactPointerEvent<HTMLDivElement>) {
    activePointers.current.delete(event.pointerId);
    if (activePointers.current.size < 2) pinchStart.current = null;
    if (activePointers.current.size === 0 && gestureOrigin.current) {
      const origin = gestureOrigin.current;
      setHistory((items) => [...items.slice(-29), origin]);
      setFuture([]);
      gestureOrigin.current = null;
      trackCommerceEvent('placement_changed', {
        productId: configuration?.merchProductId ?? 'unknown',
        input: 'gesture',
      });
    }
  }

  function handlePreviewKey(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (!configuration) return;
    const step = event.shiftKey ? 0.05 : 0.01;
    const movement: Record<string, Partial<ProductConfiguration>> = {
      ArrowLeft: { normalizedX: configuration.normalizedX - step },
      ArrowRight: { normalizedX: configuration.normalizedX + step },
      ArrowUp: { normalizedY: configuration.normalizedY - step },
      ArrowDown: { normalizedY: configuration.normalizedY + step },
    };
    const patch = movement[event.key];
    if (!patch) return;
    event.preventDefault();
    updatePlacement(patch);
  }

  function undo() {
    const previous = history.at(-1);
    if (!previous || !configuration) return;
    setHistory((items) => items.slice(0, -1));
    setFuture((items) => [configuration, ...items].slice(0, 30));
    setConfiguration(previous);
  }

  function redo() {
    const next = future[0];
    if (!next || !configuration) return;
    setFuture((items) => items.slice(1));
    setHistory((items) => [...items.slice(-29), configuration]);
    setConfiguration(next);
  }

  async function addToCart() {
    if (!asset || !configuration || !designId) return;
    const product = getProduct(products, configuration.merchProductId);
    const design: CuratedDesign = {
      id: designId,
      title: 'Your design',
      description: 'Customer-provided artwork',
      collection: 'Your uploads',
      asset,
      recommendedProductId: product.id,
    };
    const snapshot = createCartSnapshot({
      id: crypto.randomUUID(),
      configuration,
      design,
      product,
      createdAt: new Date().toISOString(),
    });
    const persisted = await upsertPersistentCartItem(snapshot);
    const current = readLocalCart(window.localStorage);
    writeLocalCart(
      window.localStorage,
      upsertCartItem(current, persisted ?? snapshot),
    );
    setCartMessage(`${product.name} added with your exact placement.`);
    trackCommerceEvent('add_to_cart', {
      productId: product.id,
      variantId: selectedVariant.id,
      quantity: 1,
      source: 'create',
    });
  }

  async function startOver() {
    if (designId) {
      await removeCreateAssets(
        Array.from({ length: revision }, (_, index) =>
          createAssetStorageKey(designId, index + 1),
        ),
      );
    }
    clearCreateSession(window.localStorage);
    setAsset(null);
    setOriginalBlob(null);
    setDesignId(null);
    setConfiguration(null);
    setRevision(1);
    setAdaptationLabel(null);
    setHistory([]);
    setFuture([]);
    setCartMessage(null);
  }

  if (!restored) {
    return (
      <main className={styles.loadingShell} aria-busy="true">
        <div />
        <div />
      </main>
    );
  }

  if (!asset || !configuration) {
    return (
      <main className={styles.createPage}>
        <section className={styles.uploadShell}>
          <div className={styles.uploadIntro}>
            <span>PrintMe Create</span>
            <h1>Start with one image.</h1>
            <p>
              Upload once, then prepare and place it on every compatible
              product.
            </p>
          </div>
          <div
            className={styles.dropZone}
            onDragOver={(event) => event.preventDefault()}
            onDrop={handleDrop}
            data-testid="create-drop-zone"
          >
            <ImagePlus aria-hidden="true" size={34} strokeWidth={1.6} />
            <strong>Use your camera or choose a photo</strong>
            <span>JPEG, PNG, or WebP up to 10 MB</span>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              data-testid="choose-image"
            >
              <Camera aria-hidden="true" size={18} />
              Choose image
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              capture="environment"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void acceptFile(file);
              }}
              aria-label="Upload a photo or artwork"
            />
            <small>On desktop, you can also drag and drop here.</small>
          </div>
          {uploadError && <p role="alert">{uploadError}</p>}
        </section>
      </main>
    );
  }

  return (
    <main className={styles.createPage}>
      <header className={styles.createHeader}>
        <div>
          <span>PrintMe Create</span>
          <strong>
            {adaptationLabel ??
              (preparation === 'original' ? 'Original' : 'Prepared')}{' '}
            artwork
          </strong>
        </div>
        <button type="button" onClick={() => void startOver()}>
          Start over
        </button>
      </header>

      <div className={styles.workspace}>
        <section className={styles.previewPanel}>
          <div
            ref={previewStageRef}
            className={styles.previewStage}
            data-testid="create-preview-stage"
          >
            <InstantPreview design={asset} configuration={configuration} />
            <div
              className={styles.gestureLayer}
              role="application"
              tabIndex={0}
              aria-label="Artwork placement. Drag to move, pinch to scale, or use arrow keys."
              aria-describedby="placement-help"
              onPointerDown={beginGesture}
              onPointerMove={moveGesture}
              onPointerUp={endGesture}
              onPointerCancel={endGesture}
              onKeyDown={handlePreviewKey}
              data-testid="artwork-gesture-layer"
            />
          </div>
          <p id="placement-help" className={styles.previewHelp}>
            Drag to move. Pinch or use the scale control to resize.
          </p>
          <div className={styles.historyActions}>
            <button type="button" onClick={undo} disabled={!history.length}>
              <Undo2 aria-hidden="true" size={17} />
              Undo
            </button>
            <button type="button" onClick={redo} disabled={!future.length}>
              <Redo2 aria-hidden="true" size={17} />
              Redo
            </button>
          </div>
          <div
            className={
              qualityReport?.primary.severity === 'info'
                ? styles.goodPrint
                : styles.printWarning
            }
            role="status"
            data-testid="print-quality-status"
          >
            {qualityReport?.primary.severity === 'info' ? (
              <Check aria-hidden="true" size={18} />
            ) : (
              <Palette aria-hidden="true" size={18} />
            )}
            <span>
              <strong>
                {qualityReport?.primary.message ?? 'Checking print quality'}
              </strong>
              <small>
                {qualityReport?.primary.detail ??
                  'Reviewing image resolution and placement.'}
              </small>
            </span>
          </div>
        </section>

        <section className={styles.controlsPanel}>
          <div className={styles.prepareBlock}>
            <h1>Prepare your image</h1>
            <p>Your original stays available. Each treatment creates a new version.</p>
            <div className={styles.prepareOptions}>
              {(
                [
                  ['original', 'Keep Original'],
                  ['background-removed', 'Remove Background'],
                  ['art', 'Make It Art'],
                ] as const
              ).map(([mode, label]) => (
                <button
                  type="button"
                  key={mode}
                  aria-pressed={preparation === mode}
                  className={preparation === mode ? styles.selectedOption : ''}
                  onClick={() => void applyPreparation(mode)}
                  disabled={preparing}
                  data-testid={`prepare-${mode}`}
                >
                  {preparation === mode && (
                    <Check aria-hidden="true" size={16} />
                  )}
                  {label}
                </button>
              ))}
            </div>
            <button
              type="button"
              className={styles.moreStyles}
              onClick={() => setSheet('style')}
            >
              More Styles
              <ChevronRight aria-hidden="true" size={17} />
            </button>
            <div className={styles.adaptationCard}>
              <span>
                <strong>
                  {adaptationPlan.label}
                </strong>
                <small>
                  {adaptationPlan.explanation}{' '}
                  Optional. Your original stays available.
                </small>
              </span>
              <button
                type="button"
                onClick={() => void applyProductAdaptation()}
                disabled={preparing}
                data-testid="apply-product-adaptation"
              >
                Apply product fit
              </button>
            </div>
            {preparing && <span role="status">Preparing a new version...</span>}
            {uploadError && <span role="alert">{uploadError}</span>}
          </div>

          <div className={styles.optionRows}>
            <button type="button" onClick={() => setSheet('product')}>
              <span>
                <small>Product</small>
                <strong>{selectedProduct.name}</strong>
              </span>
              <ChevronRight aria-hidden="true" size={19} />
            </button>
            <button type="button" onClick={() => setSheet('variant')}>
              <span>
                <small>Color and size</small>
                <strong>{selectedVariant.title}</strong>
              </span>
              <ChevronRight aria-hidden="true" size={19} />
            </button>
            {selectedTemplate && selectedTemplate.views.length > 1 && (
              <button type="button" onClick={() => setSheet('view')}>
                <span>
                  <small>Preview view</small>
                  <strong>{selectedView?.label ?? 'Front'}</strong>
                </span>
                <ChevronRight aria-hidden="true" size={19} />
              </button>
            )}
            <button type="button" onClick={() => setSheet('placement')}>
              <span>
                <small>Placement</small>
                <strong>
                  Scale {configuration.normalizedScale.toFixed(2)}, angle{' '}
                  {Math.round(configuration.angle)}°
                </strong>
              </span>
              <ChevronRight aria-hidden="true" size={19} />
            </button>
          </div>

          {placementMessage && (
            <p className={styles.placementMessage} role="status">
              {placementMessage}
            </p>
          )}

          <div className={styles.desktopPlacement}>
            <label htmlFor="create-scale">Scale</label>
            <input
              id="create-scale"
              type="range"
              min="0.2"
              max="2.4"
              step="0.01"
              value={configuration.normalizedScale}
              onChange={(event) =>
                updatePlacement({
                  normalizedScale: Number(event.target.value),
                })
              }
            />
            <label htmlFor="create-rotation">Rotate</label>
            <input
              id="create-rotation"
              type="range"
              min="-180"
              max="180"
              step="1"
              value={configuration.angle}
              onChange={(event) =>
                updatePlacement({ angle: Number(event.target.value) })
              }
            />
            <div>
              <button
                type="button"
                onClick={() =>
                  updatePlacement({ normalizedX: 0.5, normalizedY: 0.5 })
                }
              >
                <AlignCenter aria-hidden="true" size={17} />
                Center
              </button>
              <button
                type="button"
                onClick={() =>
                  updatePlacement({
                    normalizedX: 0.5,
                    normalizedY: 0.5,
                    normalizedScale: selectedProduct.defaultPlacement.normalizedScale,
                    angle: 0,
                    fit: selectedProduct.defaultPlacement.fit,
                  })
                }
              >
                <RotateCcw aria-hidden="true" size={17} />
                Reset
              </button>
            </div>
          </div>
        </section>
      </div>

      <footer className={styles.mobileCommerceBar}>
        <div>
          <small>{selectedProduct.name}</small>
          <strong>{formatPrice(configuration.unitPrice)}</strong>
        </div>
        <button
          type="button"
          onClick={() => void addToCart()}
          disabled={!qualityReport?.canAddToCart}
          data-testid="create-add-to-cart"
        >
          <ShoppingBag aria-hidden="true" size={18} />
          Add to Cart
        </button>
      </footer>

      {cartMessage && (
        <aside className={styles.cartConfirmation} role="status">
          <Check aria-hidden="true" size={20} />
          <span>
            <strong>{cartMessage}</strong>
            <Link href="/shop-v2">View cart and matching products</Link>
          </span>
        </aside>
      )}

      <BottomSheet
        open={sheet === 'product'}
        title="Choose a product"
        onClose={closeSheet}
      >
        <div className={styles.sheetChoices}>
          {products.map((product) => (
            <button
              type="button"
              key={product.id}
              aria-pressed={product.id === selectedProduct.id}
              onClick={() => switchProduct(product)}
            >
              <span>
                <strong>{product.name}</strong>
                <small>{product.description}</small>
              </span>
              <b>from {formatPrice(product.variants[0].unitPrice)}</b>
            </button>
          ))}
        </div>
      </BottomSheet>

      <BottomSheet
        open={sheet === 'variant'}
        title="Choose color and size"
        onClose={closeSheet}
      >
        <div className={styles.sheetChoices}>
          {selectedProduct.variants.map((variant) => (
            <button
              type="button"
              key={variant.id}
              disabled={!variant.available}
              aria-pressed={
                variant.printifyVariantId === configuration.printifyVariantId
              }
              onClick={() => selectVariant(variant)}
            >
              <span>
                <strong>{variant.title}</strong>
                <small>{variant.available ? 'Available' : 'Unavailable'}</small>
              </span>
              <b>{formatPrice(variant.unitPrice)}</b>
            </button>
          ))}
        </div>
      </BottomSheet>

      <BottomSheet
        open={sheet === 'view'}
        title="Choose a preview view"
        onClose={closeSheet}
      >
        <div className={styles.sheetChoices}>
          {selectedTemplate?.views.map((view) => (
            <button
              type="button"
              key={view.id}
              aria-pressed={view.id === configuration.previewViewId}
              onClick={() => selectPreviewView(view.id)}
            >
              <span>
                <strong>{view.label}</strong>
                <small>{view.position} print area</small>
              </span>
              {view.id === configuration.previewViewId && (
                <Check aria-hidden="true" size={18} />
              )}
            </button>
          ))}
        </div>
      </BottomSheet>

      <BottomSheet
        open={sheet === 'placement'}
        title="Adjust placement"
        onClose={closeSheet}
      >
        <div className={styles.sheetSliders}>
          <label htmlFor="sheet-scale">
            Scale
            <span>{configuration.normalizedScale.toFixed(2)}</span>
          </label>
          <input
            id="sheet-scale"
            type="range"
            min="0.2"
            max="2.4"
            step="0.01"
            value={configuration.normalizedScale}
            onChange={(event) =>
              updatePlacement({
                normalizedScale: Number(event.target.value),
              })
            }
          />
          <label htmlFor="sheet-rotation">
            Rotate
            <span>{Math.round(configuration.angle)}°</span>
          </label>
          <input
            id="sheet-rotation"
            type="range"
            min="-180"
            max="180"
            step="1"
            value={configuration.angle}
            onChange={(event) =>
              updatePlacement({ angle: Number(event.target.value) })
            }
          />
          <div className={styles.fitChoices}>
            <button
              type="button"
              aria-pressed={(configuration.fit ?? 'contain') === 'contain'}
              onClick={() => updatePlacement({ fit: 'contain' })}
            >
              Contain
            </button>
            <button
              type="button"
              aria-pressed={configuration.fit === 'cover'}
              onClick={() => updatePlacement({ fit: 'cover' })}
            >
              Fill
            </button>
            <button
              type="button"
              onClick={() =>
                updatePlacement({ normalizedX: 0.5, normalizedY: 0.5 })
              }
            >
              Center
            </button>
          </div>
        </div>
      </BottomSheet>

      <BottomSheet
        open={sheet === 'style'}
        title="More art styles"
        onClose={closeSheet}
      >
        <div className={styles.sheetChoices}>
          {(
            [
              ['illustrated', 'Illustrated', 'Balanced color and detail'],
              ['poster', 'Poster', 'Bold shapes and fewer colors'],
              ['soft-paint', 'Soft Paint', 'Gentler contrast and texture'],
            ] as const
          ).map(([value, label, description]) => (
            <button
              type="button"
              key={value}
              aria-pressed={artStyle === value}
              onClick={() => setArtStyle(value)}
            >
              <span>
                <strong>{label}</strong>
                <small>{description}</small>
              </span>
              {artStyle === value && <Check aria-hidden="true" size={18} />}
            </button>
          ))}
          <button type="button" onClick={() => void applyPreparation('art')}>
            Apply selected style
          </button>
        </div>
      </BottomSheet>
    </main>
  );
}
