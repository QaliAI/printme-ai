import type {
  DesignAsset,
  MerchProduct,
  ProductVariant,
} from './types';

export type AdaptationKind =
  | 'apparel-breathing-room'
  | 'poster-composition'
  | 'mug-handle-safe';

export interface ProductAdaptationPlan {
  kind: AdaptationKind;
  label: string;
  explanation: string;
  automated: true;
  optional: true;
  targetAspect: number;
  preserveTransparency: boolean;
}

export interface ProductAdaptationResult {
  blob: Blob;
  width: number;
  height: number;
  mimeType: string;
  hasTransparency: boolean;
  derivative: DesignAsset;
  plan: ProductAdaptationPlan;
  warnings: string[];
  cost: {
    provider: 'deterministic-browser';
    amountUsd: 0;
  };
}

export interface ProductAdaptationService {
  plan(
    product: MerchProduct,
    variant: ProductVariant,
  ): ProductAdaptationPlan;
  adapt(input: {
    source: Blob;
    asset: DesignAsset;
    product: MerchProduct;
    variant: ProductVariant;
    revision: number;
    designId: string;
    border?: boolean;
  }): Promise<ProductAdaptationResult>;
}

export interface AdaptationCostLogEntry {
  designId: string;
  derivativeId: string;
  productId: string;
  kind: AdaptationKind;
  provider: 'deterministic-browser';
  amountUsd: 0;
  createdAt: string;
}

type CostStorage = Pick<Storage, 'getItem' | 'setItem'>;
export const ADAPTATION_COST_STORAGE_KEY =
  'printme:adaptation-costs:v1';

export function recordAdaptationCost(
  storage: CostStorage,
  entry: AdaptationCostLogEntry,
) {
  let current: AdaptationCostLogEntry[] = [];
  try {
    const parsed = JSON.parse(
      storage.getItem(ADAPTATION_COST_STORAGE_KEY) ?? '[]',
    ) as unknown;
    if (Array.isArray(parsed)) {
      current = parsed.filter(
        (item): item is AdaptationCostLogEntry =>
          Boolean(item) && typeof item === 'object',
      );
    }
  } catch {
    current = [];
  }
  storage.setItem(
    ADAPTATION_COST_STORAGE_KEY,
    JSON.stringify([...current.slice(-49), entry]),
  );
}

export function planProductAdaptation(
  product: MerchProduct,
  variant: ProductVariant,
): ProductAdaptationPlan {
  if (product.kind === 'apparel') {
    return {
      kind: 'apparel-breathing-room',
      label: 'Apparel-ready spacing',
      explanation:
        'Trims empty edges and adds balanced chest-print breathing room.',
      automated: true,
      optional: true,
      targetAspect: 0.82,
      preserveTransparency: true,
    };
  }
  if (product.kind === 'drinkware') {
    return {
      kind: 'mug-handle-safe',
      label: 'Handle-safe mug layout',
      explanation:
        'Builds a wider composition for the selected side of the handle.',
      automated: true,
      optional: true,
      targetAspect: 1.1,
      preserveTransparency: true,
    };
  }
  const placeholder = variant.placeholders[0];
  return {
    kind: 'poster-composition',
    label: 'Poster-ready composition',
    explanation:
      'Fits the full image to the selected poster ratio with an optional border.',
    automated: true,
    optional: true,
    targetAspect: placeholder
      ? placeholder.width / placeholder.height
      : 2 / 3,
    preserveTransparency: false,
  };
}

async function sourceCanvas(source: Blob) {
  const bitmap = await createImageBitmap(source);
  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error('This browser cannot adapt images.');
  context.drawImage(bitmap, 0, 0);
  bitmap.close();
  return { canvas, context };
}

function alphaBounds(
  data: Uint8ClampedArray,
  width: number,
  height: number,
) {
  let left = width;
  let right = 0;
  let top = height;
  let bottom = 0;
  let found = false;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (data[(y * width + x) * 4 + 3] < 8) continue;
      found = true;
      left = Math.min(left, x);
      right = Math.max(right, x);
      top = Math.min(top, y);
      bottom = Math.max(bottom, y);
    }
  }
  return found
    ? { x: left, y: top, width: right - left + 1, height: bottom - top + 1 }
    : { x: 0, y: 0, width, height };
}

function toBlob(canvas: HTMLCanvasElement, mimeType: string) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) =>
        blob
          ? resolve(blob)
          : reject(new Error('Product adaptation failed to render.')),
      mimeType,
      0.95,
    );
  });
}

export class BrowserProductAdaptationService
  implements ProductAdaptationService
{
  plan(product: MerchProduct, variant: ProductVariant) {
    return planProductAdaptation(product, variant);
  }

  async adapt(input: {
    source: Blob;
    asset: DesignAsset;
    product: MerchProduct;
    variant: ProductVariant;
    revision: number;
    designId: string;
    border?: boolean;
  }): Promise<ProductAdaptationResult> {
    const plan = this.plan(input.product, input.variant);
    const { canvas: source, context } = await sourceCanvas(input.source);
    const pixels = context.getImageData(0, 0, source.width, source.height);
    const bounds = input.asset.hasTransparency
      ? alphaBounds(pixels.data, source.width, source.height)
      : { x: 0, y: 0, width: source.width, height: source.height };
    const longEdge = Math.min(3600, Math.max(bounds.width, bounds.height));
    let targetWidth =
      plan.targetAspect >= 1
        ? longEdge
        : Math.round(longEdge * plan.targetAspect);
    let targetHeight =
      plan.targetAspect >= 1
        ? Math.round(longEdge / plan.targetAspect)
        : longEdge;
    const breathingRoom =
      plan.kind === 'apparel-breathing-room' ? 0.84 : 0.92;
    targetWidth = Math.max(1, targetWidth);
    targetHeight = Math.max(1, targetHeight);

    const output = document.createElement('canvas');
    output.width = targetWidth;
    output.height = targetHeight;
    const outputContext = output.getContext('2d');
    if (!outputContext) throw new Error('This browser cannot adapt images.');
    if (!plan.preserveTransparency) {
      outputContext.fillStyle = input.border ? '#f7f4ed' : '#ffffff';
      outputContext.fillRect(0, 0, targetWidth, targetHeight);
    }
    const scale = Math.min(
      (targetWidth * breathingRoom) / bounds.width,
      (targetHeight * breathingRoom) / bounds.height,
    );
    const drawWidth = bounds.width * scale;
    const drawHeight = bounds.height * scale;
    outputContext.drawImage(
      source,
      bounds.x,
      bounds.y,
      bounds.width,
      bounds.height,
      (targetWidth - drawWidth) / 2,
      (targetHeight - drawHeight) / 2,
      drawWidth,
      drawHeight,
    );
    if (input.border) {
      outputContext.strokeStyle = '#e8e2d7';
      outputContext.lineWidth = Math.max(8, targetWidth * 0.012);
      outputContext.strokeRect(
        outputContext.lineWidth / 2,
        outputContext.lineWidth / 2,
        targetWidth - outputContext.lineWidth,
        targetHeight - outputContext.lineWidth,
      );
    }

    const mimeType = plan.preserveTransparency ? 'image/png' : 'image/webp';
    const blob = await toBlob(output, mimeType);
    const derivativeId = `${input.designId}:${input.product.id}:adaptation:${input.revision}`;
    return {
      blob,
      width: targetWidth,
      height: targetHeight,
      mimeType,
      hasTransparency: plan.preserveTransparency,
      derivative: {
        ...input.asset,
        id: `${input.asset.id.replace(/-r\d+$/, '')}-r${input.revision}`,
        version: `version-${input.revision}`,
        url: '',
        productionUrl: '',
        width: targetWidth,
        height: targetHeight,
        mimeType,
        hasTransparency: plan.preserveTransparency,
        role: 'product-derivative',
        derivativeId,
        byteSize: blob.size,
      },
      plan,
      warnings:
        input.product.kind === 'apparel' &&
        ['Black', 'Navy'].includes(input.variant.color ?? '')
          ? ['Review contrast on this dark garment before adding to cart.']
          : [],
      cost: {
        provider: 'deterministic-browser',
        amountUsd: 0,
      },
    };
  }
}
