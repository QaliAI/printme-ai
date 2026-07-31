import type {
  DesignAsset,
  MerchProduct,
  PreviewBox,
  PreviewRenderInput,
  PreviewRenderResult,
  PreviewRendererAdapter,
  PreviewTemplate,
  PrintPlacement,
  ProductConfiguration,
  ProductVariant,
} from './types';
import {
  getPreviewBinding,
  getPreviewTemplate,
  resolvePreviewTemplate,
} from './templates';

const EPSILON = 0.0001;

export function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

export function getSafeZone(printArea: PreviewBox, inset: number): PreviewBox {
  const safeInset = clamp(inset, 0, Math.min(printArea.width, printArea.height) / 2);
  return {
    x: printArea.x + safeInset,
    y: printArea.y + safeInset,
    width: printArea.width - safeInset * 2,
    height: printArea.height - safeInset * 2,
  };
}

export function getAspectFitSize(input: {
  artworkWidth: number;
  artworkHeight: number;
  targetWidth: number;
  targetHeight: number;
  fit: 'contain' | 'cover';
}) {
  if (
    input.artworkWidth <= 0 ||
    input.artworkHeight <= 0 ||
    input.targetWidth <= 0 ||
    input.targetHeight <= 0
  ) {
    throw new Error('Artwork and target dimensions must be positive.');
  }

  const widthRatio = input.targetWidth / input.artworkWidth;
  const heightRatio = input.targetHeight / input.artworkHeight;
  const ratio =
    input.fit === 'contain'
      ? Math.min(widthRatio, heightRatio)
      : Math.max(widthRatio, heightRatio);

  return {
    width: input.artworkWidth * ratio,
    height: input.artworkHeight * ratio,
  };
}

export function getRotatedBounds(box: PreviewBox, angle: number): PreviewBox {
  const radians = (Math.abs(angle) * Math.PI) / 180;
  const rotatedWidth =
    Math.abs(box.width * Math.cos(radians)) +
    Math.abs(box.height * Math.sin(radians));
  const rotatedHeight =
    Math.abs(box.width * Math.sin(radians)) +
    Math.abs(box.height * Math.cos(radians));
  const centerX = box.x + box.width / 2;
  const centerY = box.y + box.height / 2;

  return {
    x: centerX - rotatedWidth / 2,
    y: centerY - rotatedHeight / 2,
    width: rotatedWidth,
    height: rotatedHeight,
  };
}

export function isBoxInside(inner: PreviewBox, outer: PreviewBox) {
  return (
    inner.x + EPSILON >= outer.x &&
    inner.y + EPSILON >= outer.y &&
    inner.x + inner.width <= outer.x + outer.width + EPSILON &&
    inner.y + inner.height <= outer.y + outer.height + EPSILON
  );
}

export function calculateArtworkBox(
  input: PreviewRenderInput
): Omit<PreviewRenderResult, 'rendererId' | 'renderKey'> {
  const view = input.template.views.find((candidate) => candidate.id === input.viewId);
  if (!view) {
    throw new Error(`Unknown preview view: ${input.viewId}`);
  }
  if (!input.template.supportedPrintPositions.includes(input.placement.position)) {
    throw new Error(
      `Template ${input.template.id} does not support ${input.placement.position}.`
    );
  }

  const safeZone = getSafeZone(view.printArea, view.safeZoneInset);
  const baseSize = getAspectFitSize({
    artworkWidth: input.artwork.width,
    artworkHeight: input.artwork.height,
    targetWidth: safeZone.width,
    targetHeight: safeZone.height,
    fit: input.placement.fit,
  });
  const scale = Math.max(input.placement.normalizedScale, EPSILON);
  const width = baseSize.width * scale;
  const height = baseSize.height * scale;
  const centerX =
    view.printArea.x + clamp(input.placement.normalizedX, 0, 1) * view.printArea.width;
  const centerY =
    view.printArea.y + clamp(input.placement.normalizedY, 0, 1) * view.printArea.height;
  const artworkBox = {
    x: centerX - width / 2,
    y: centerY - height / 2,
    width,
    height,
  };
  const rotatedBounds = getRotatedBounds(artworkBox, input.placement.angle);

  return {
    view,
    artworkBox,
    safeZone,
    clipBox: view.printArea,
    rotationDegrees: input.placement.angle,
    preservesAspectRatio: true,
    isWithinSafeZone: isBoxInside(rotatedBounds, safeZone),
  };
}

export const instant2dRenderer: PreviewRendererAdapter = {
  id: 'instant-2d-v1',
  supports(template) {
    return (
      template.kind === 'flat' ||
      template.kind === 'apparel' ||
      template.kind === 'drinkware'
    );
  },
  render(input) {
    if (!this.supports(input.template)) {
      throw new Error(`Unsupported preview template: ${input.template.id}`);
    }
    const result = calculateArtworkBox(input);
    const renderKey = [
      input.artwork.id && input.artwork.version
        ? `${input.artwork.id}@${input.artwork.version}`
        : input.artwork.url,
      input.template.id,
      input.viewId,
      input.placement.position,
      input.placement.decorationMethod,
      input.placement.normalizedX.toFixed(4),
      input.placement.normalizedY.toFixed(4),
      input.placement.normalizedScale.toFixed(4),
      input.placement.angle.toFixed(2),
      input.placement.fit,
    ].join('|');

    return {
      rendererId: this.id,
      renderKey,
      ...result,
    };
  },
};

export function getSelectedVariant(
  product: MerchProduct,
  previous?: Pick<ProductConfiguration, 'selectedColor' | 'selectedSize'>
): ProductVariant {
  const available = product.variants.filter((variant) => variant.available);
  if (!available.length) {
    throw new Error(`Product ${product.id} has no available variants.`);
  }

  return (
    available.find(
      (variant) =>
        variant.color === previous?.selectedColor &&
        variant.size === previous?.selectedSize
    ) ??
    available.find((variant) => variant.color === previous?.selectedColor) ??
    available.find((variant) => variant.size === previous?.selectedSize) ??
    available[0]
  );
}

export function isPlacementCompatible(
  placement: PrintPlacement,
  template: PreviewTemplate,
  variant: ProductVariant
) {
  return (
    template.supportedPrintPositions.includes(placement.position) &&
    variant.placeholders.some(
      (placeholder) =>
        placeholder.position === placement.position &&
        placeholder.decorationMethod === placement.decorationMethod
    )
  );
}

export function placementFromConfiguration(
  configuration: ProductConfiguration
): PrintPlacement {
  return {
    position: configuration.printPosition,
    decorationMethod: configuration.decorationMethod,
    normalizedX: configuration.normalizedX,
    normalizedY: configuration.normalizedY,
    normalizedScale: configuration.normalizedScale,
    angle: configuration.angle,
    fit: configuration.fit ?? 'contain',
  };
}

export function createProductConfiguration(input: {
  designId: string;
  design: DesignAsset;
  product: MerchProduct;
  template: PreviewTemplate;
  previous?: ProductConfiguration;
}): ProductConfiguration {
  const variant = getSelectedVariant(input.product, input.previous);
  const resolved = resolvePreviewTemplate({
    product: input.product,
    variant,
    position: input.previous?.printPosition,
    viewId: input.previous?.previewViewId,
  });
  const template = resolved.binding ? resolved.template : input.template;
  const previousPlacement = input.previous
    ? placementFromConfiguration(input.previous)
    : undefined;
  const placement =
    previousPlacement &&
    isPlacementCompatible(previousPlacement, template, variant)
      ? previousPlacement
      : input.product.defaultPlacement;
  const view =
    template.views.find(
      (candidate) =>
        candidate.id === resolved.viewId ||
        candidate.position === placement.position,
    ) ?? template.views[0];
  const render = instant2dRenderer.render({
    artwork: input.design,
    template,
    viewId: view.id,
    placement,
  });

  return {
    designId: input.designId,
    designVersion: input.design.version,
    designVersionId: input.design.version,
    designSourceType: input.design.sourceType,
    designAssetId: input.design.id,
    productionAssetId:
      input.design.productionAssetId ?? input.design.id,
    designDerivativeId: input.design.derivativeId,
    designAssetUrl: input.design.url,
    designAssetWidth: input.design.width,
    designAssetHeight: input.design.height,
    designAssetAlt: input.design.alt,
    designAssetMimeType: input.design.mimeType,
    designAssetHasTransparency: input.design.hasTransparency,
    designAssetStorageKey: input.design.storageKey,
    productionAssetUrl: input.design.productionUrl ?? input.design.url,
    merchProductId: input.product.id,
    printifyBlueprintId: input.product.printifyBlueprintId,
    printifyProviderId: input.product.provider.printifyProviderId,
    printifyVariantId: variant.printifyVariantId,
    printPosition: placement.position,
    decorationMethod: placement.decorationMethod,
    normalizedX: placement.normalizedX,
    normalizedY: placement.normalizedY,
    normalizedScale: placement.normalizedScale,
    angle: placement.angle,
    fit: placement.fit,
    selectedColor: variant.color,
    selectedSize: variant.size,
    previewTemplateId: template.id,
    previewBindingKey: resolved.binding?.key,
    previewViewId: view.id,
    instantPreview: {
      rendererId: render.rendererId,
      state: 'ready',
      viewId: view.id,
      renderKey: render.renderKey,
    },
    unitPrice: variant.unitPrice,
    currency: variant.currency,
  };
}

function placeholderAspect(
  variant: ProductVariant,
  position: PrintPlacement['position'],
  decorationMethod: string,
) {
  const placeholder = variant.placeholders.find(
    (candidate) =>
      candidate.position === position &&
      candidate.decorationMethod === decorationMethod,
  );
  return placeholder ? placeholder.width / placeholder.height : null;
}

export function changeProductVariantConfiguration(input: {
  configuration: ProductConfiguration;
  design: DesignAsset;
  product: MerchProduct;
  variant: ProductVariant;
}) {
  const previousVariant = input.product.variants.find(
    (candidate) =>
      candidate.printifyVariantId === input.configuration.printifyVariantId,
  );
  const previousAspect = previousVariant
    ? placeholderAspect(
        previousVariant,
        input.configuration.printPosition,
        input.configuration.decorationMethod,
      )
    : null;
  const nextAspect = placeholderAspect(
    input.variant,
    input.configuration.printPosition,
    input.configuration.decorationMethod,
  );
  const previous = {
    ...input.configuration,
    selectedColor: input.variant.color,
    selectedSize: input.variant.size,
    printifyVariantId: input.variant.printifyVariantId,
  };
  const configuration = createProductConfiguration({
    designId: input.configuration.designId,
    design: input.design,
    product: input.product,
    template: getPreviewTemplate(input.configuration.previewTemplateId),
    previous,
  });
  const printRegionChangedMaterially =
    previousAspect !== null &&
    nextAspect !== null &&
    Math.abs(previousAspect - nextAspect) / previousAspect > 0.05;

  return { configuration, printRegionChangedMaterially };
}

export function changePreviewViewConfiguration(input: {
  configuration: ProductConfiguration;
  design: DesignAsset;
  product: MerchProduct;
  viewId: string;
}) {
  const variant = input.product.variants.find(
    (candidate) =>
      candidate.printifyVariantId === input.configuration.printifyVariantId,
  );
  if (!variant) throw new Error('Selected variant is not available.');
  const binding = getPreviewBinding({
    product: input.product,
    variant,
    viewId: input.viewId,
  });
  if (!binding) throw new Error('Selected preview view is not available.');
  return createProductConfiguration({
    designId: input.configuration.designId,
    design: input.design,
    product: input.product,
    template: getPreviewTemplate(binding.previewTemplateId),
    previous: {
      ...input.configuration,
      previewViewId: binding.previewViewId,
      printPosition: binding.printPosition,
      decorationMethod: binding.decorationMethod,
    },
  });
}

export function refreshConfigurationPreview(
  configuration: ProductConfiguration,
  design: DesignAsset,
): ProductConfiguration {
  const template = getPreviewTemplate(configuration.previewTemplateId);
  const view = template.views.find(
    (candidate) => candidate.id === configuration.previewViewId,
  );
  if (!view) {
    throw new Error(
      `Unknown preview view ${configuration.previewViewId} for ${template.id}.`,
    );
  }
  const render = instant2dRenderer.render({
    artwork: design,
    template,
    viewId: view.id,
    placement: placementFromConfiguration(configuration),
  });
  return {
    ...configuration,
    instantPreview: {
      rendererId: render.rendererId,
      state: 'ready',
      viewId: view.id,
      renderKey: render.renderKey,
    },
    officialMockupState:
      configuration.officialMockupState === 'ready' ||
      configuration.officialMockupState === 'review'
        ? 'not-requested'
        : configuration.officialMockupState,
    officialMockupUrl: undefined,
    officialMockupRenderKey: undefined,
  };
}
