export type CurrencyCode = 'USD';
export type ProductKind = 'flat' | 'apparel';
export type PrintPosition = 'front' | 'back' | 'all-over';
export type PreviewFit = 'contain' | 'cover';
export type DesignSourceType =
  | 'uploaded-photo'
  | 'uploaded-artwork'
  | 'ai-generated'
  | 'ai-styled'
  | 'background-removed'
  | 'curated'
  | 'text-personalized';
export type DesignAssetRole =
  | 'original'
  | 'preview'
  | 'display'
  | 'production'
  | 'product-derivative';

export interface DesignAsset {
  id: string;
  version: string;
  url: string;
  productionUrl?: string;
  alt: string;
  width: number;
  height: number;
  mimeType: string;
  hasTransparency: boolean;
  sourceType?: DesignSourceType;
  role?: DesignAssetRole;
  productionAssetId?: string;
  derivativeId?: string;
  storageKey?: string;
}

export interface CuratedDesign {
  id: string;
  title: string;
  description: string;
  collection: string;
  asset: DesignAsset;
  recommendedProductId: string;
}

export interface ProductProvider {
  id: string;
  printifyProviderId: number;
  name: string;
  decorationMethods: string[];
}

export interface PrintablePlaceholder {
  position: PrintPosition;
  decorationMethod: string;
  width: number;
  height: number;
}

export interface ProductVariant {
  id: string;
  printifyVariantId: number;
  title: string;
  color: string | null;
  size: string | null;
  unitPrice: number;
  unitCost?: number | null;
  currency: CurrencyCode;
  available: boolean;
  placeholders: PrintablePlaceholder[];
}

export interface PrintPlacement {
  position: PrintPosition;
  decorationMethod: string;
  normalizedX: number;
  normalizedY: number;
  normalizedScale: number;
  angle: number;
  fit: PreviewFit;
}

export interface PreviewBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PreviewTemplateView {
  id: string;
  label: string;
  position: PrintPosition;
  baseProductImage: string;
  mockupWidth: number;
  mockupHeight: number;
  printArea: PreviewBox;
  safeZoneInset: number;
  placeholderWidth: number;
  placeholderHeight: number;
  productMask?: string;
  shadowOverlay?: string;
  highlightOverlay?: string;
}

export interface PreviewTemplate {
  id: string;
  kind: ProductKind;
  supportedPrintPositions: PrintPosition[];
  views: PreviewTemplateView[];
}

export interface MerchProduct {
  id: string;
  name: string;
  description: string;
  kind: ProductKind;
  printifyBlueprintId: number;
  provider: ProductProvider;
  previewTemplateId: string;
  variants: ProductVariant[];
  defaultPlacement: PrintPlacement;
}

export interface InstantPreview {
  rendererId: string;
  state: 'ready';
  viewId: string;
  renderKey: string;
  url?: string;
}

export interface ProductConfiguration {
  designId: string;
  designVersion: string;
  designVersionId?: string;
  designSourceType?: DesignSourceType;
  designAssetId?: string;
  productionAssetId?: string;
  designDerivativeId?: string;
  designAssetUrl: string;
  designAssetWidth?: number;
  designAssetHeight?: number;
  designAssetAlt?: string;
  designAssetMimeType?: string;
  designAssetHasTransparency?: boolean;
  designAssetStorageKey?: string;
  productionAssetUrl: string;
  merchProductId: string;
  printifyBlueprintId: number;
  printifyProviderId: number;
  printifyVariantId: number;
  printPosition: PrintPosition;
  decorationMethod: string;
  normalizedX: number;
  normalizedY: number;
  normalizedScale: number;
  angle: number;
  fit?: PreviewFit;
  selectedColor: string | null;
  selectedSize: string | null;
  previewTemplateId: string;
  previewViewId: string;
  instantPreview: InstantPreview;
  officialMockupUrl?: string;
  unitPrice: number;
  currency: CurrencyCode;
}

export interface CartConfigurationSnapshot {
  schemaVersion: 2;
  id: string;
  configuration: ProductConfiguration;
  designTitle: string;
  productTitle: string;
  variantTitle: string;
  productCost: number | null;
  configurationHash: string;
  quantity: number;
  createdAt: string;
}

export interface PreviewRenderInput {
  artwork: Pick<DesignAsset, 'url' | 'width' | 'height'> &
    Partial<Pick<DesignAsset, 'id' | 'version'>>;
  template: PreviewTemplate;
  viewId: string;
  placement: PrintPlacement;
}

export interface PreviewRenderResult {
  rendererId: string;
  view: PreviewTemplateView;
  artworkBox: PreviewBox;
  safeZone: PreviewBox;
  clipBox: PreviewBox;
  rotationDegrees: number;
  preservesAspectRatio: true;
  isWithinSafeZone: boolean;
  renderKey: string;
}

export interface PreviewRendererAdapter {
  readonly id: string;
  supports(template: PreviewTemplate): boolean;
  render(input: PreviewRenderInput): PreviewRenderResult;
}
