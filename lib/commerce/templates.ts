import type {
  MerchProduct,
  PreviewTemplate,
  PreviewTemplateBinding,
  PrintPosition,
  ProductVariant,
} from './types';

export const previewTemplates: PreviewTemplate[] = [
  {
    id: 'poster-studio-v1',
    kind: 'flat',
    supportedPrintPositions: ['front'],
    views: [
      {
        id: 'poster-front',
        label: 'Front',
        position: 'front',
        baseProductImage: '/shop-v2/poster-base.svg',
        mockupWidth: 800,
        mockupHeight: 800,
        printArea: { x: 205, y: 116, width: 390, height: 552 },
        safeZoneInset: 24,
        placeholderWidth: 3600,
        placeholderHeight: 5100,
        shadowOverlay: '/shop-v2/poster-shadow.svg',
      },
    ],
  },
  {
    id: 'tee-studio-v1',
    kind: 'apparel',
    supportedPrintPositions: ['front'],
    views: [
      {
        id: 'tee-front',
        label: 'Front',
        position: 'front',
        baseProductImage: '/shop-v2/tee-base.svg',
        mockupWidth: 800,
        mockupHeight: 800,
        printArea: { x: 286, y: 258, width: 228, height: 300 },
        safeZoneInset: 16,
        placeholderWidth: 4500,
        placeholderHeight: 5700,
        productMask: '/shop-v2/tee-mask.svg',
        shadowOverlay: '/shop-v2/tee-shadow.svg',
        highlightOverlay: '/shop-v2/tee-highlight.svg',
      },
    ],
  },
  {
    id: 'poster-12x18-v2',
    kind: 'flat',
    supportedPrintPositions: ['front'],
    views: [
      {
        id: 'poster-12x18-front',
        label: 'Front',
        position: 'front',
        baseProductImage: '/shop-v2/poster-base.svg',
        mockupWidth: 800,
        mockupHeight: 800,
        printArea: { x: 205, y: 104, width: 390, height: 585 },
        safeZoneInset: 24,
        placeholderWidth: 3600,
        placeholderHeight: 5400,
        shadowOverlay: '/shop-v2/poster-shadow.svg',
      },
    ],
  },
  {
    id: 'poster-18x24-v2',
    kind: 'flat',
    supportedPrintPositions: ['front'],
    views: [
      {
        id: 'poster-18x24-front',
        label: 'Front',
        position: 'front',
        baseProductImage: '/shop-v2/poster-base.svg',
        mockupWidth: 800,
        mockupHeight: 800,
        printArea: { x: 190, y: 116, width: 420, height: 560 },
        safeZoneInset: 24,
        placeholderWidth: 5400,
        placeholderHeight: 7200,
        shadowOverlay: '/shop-v2/poster-shadow.svg',
      },
    ],
  },
  {
    id: 'tee-m-v2',
    kind: 'apparel',
    supportedPrintPositions: ['front', 'back'],
    views: [
      {
        id: 'tee-m-front',
        label: 'Front',
        position: 'front',
        baseProductImage: '/shop-v2/tee-base.svg',
        mockupWidth: 800,
        mockupHeight: 800,
        printArea: { x: 290, y: 264, width: 220, height: 267 },
        safeZoneInset: 16,
        placeholderWidth: 3591,
        placeholderHeight: 4364,
        productColor: 'White',
        productMask: '/shop-v2/tee-mask.svg',
        shadowOverlay: '/shop-v2/tee-shadow.svg',
        highlightOverlay: '/shop-v2/tee-highlight.svg',
      },
      {
        id: 'tee-m-back',
        label: 'Back',
        position: 'back',
        baseProductImage: '/shop-v2/tee-back.svg',
        mockupWidth: 800,
        mockupHeight: 800,
        printArea: { x: 290, y: 246, width: 220, height: 267 },
        safeZoneInset: 16,
        placeholderWidth: 3591,
        placeholderHeight: 4364,
        productColor: 'White',
        shadowOverlay: '/shop-v2/tee-shadow.svg',
      },
    ],
  },
  {
    id: 'tee-l-v2',
    kind: 'apparel',
    supportedPrintPositions: ['front', 'back'],
    views: [
      {
        id: 'tee-l-front',
        label: 'Front',
        position: 'front',
        baseProductImage: '/shop-v2/tee-base.svg',
        mockupWidth: 800,
        mockupHeight: 800,
        printArea: { x: 282, y: 250, width: 236, height: 287 },
        safeZoneInset: 16,
        placeholderWidth: 3951,
        placeholderHeight: 4800,
        productColor: 'White',
        productMask: '/shop-v2/tee-mask.svg',
        shadowOverlay: '/shop-v2/tee-shadow.svg',
        highlightOverlay: '/shop-v2/tee-highlight.svg',
      },
      {
        id: 'tee-l-back',
        label: 'Back',
        position: 'back',
        baseProductImage: '/shop-v2/tee-back.svg',
        mockupWidth: 800,
        mockupHeight: 800,
        printArea: { x: 282, y: 232, width: 236, height: 287 },
        safeZoneInset: 16,
        placeholderWidth: 3951,
        placeholderHeight: 4800,
        productColor: 'White',
        shadowOverlay: '/shop-v2/tee-shadow.svg',
      },
    ],
  },
  {
    id: 'mug-11oz-v1',
    kind: 'drinkware',
    supportedPrintPositions: ['front', 'back'],
    views: [
      {
        id: 'mug-left',
        label: 'Left of handle',
        position: 'front',
        baseProductImage: '/landing/mockups/product-mug.webp',
        mockupWidth: 800,
        mockupHeight: 800,
        printArea: { x: 218, y: 245, width: 270, height: 248 },
        safeZoneInset: 18,
        placeholderWidth: 1275,
        placeholderHeight: 1155,
        productColor: 'White',
      },
      {
        id: 'mug-right',
        label: 'Right of handle',
        position: 'back',
        baseProductImage: '/landing/mockups/product-mug.webp',
        mockupWidth: 800,
        mockupHeight: 800,
        printArea: { x: 316, y: 245, width: 270, height: 248 },
        safeZoneInset: 18,
        placeholderWidth: 1275,
        placeholderHeight: 1155,
        productColor: 'White',
      },
    ],
  },
];

export function getPreviewTemplate(templateId: string) {
  const template = previewTemplates.find((candidate) => candidate.id === templateId);
  if (!template) throw new Error(`Unknown preview template: ${templateId}`);
  return template;
}

export function getPreviewBinding(input: {
  product: MerchProduct;
  variant: ProductVariant;
  position?: PrintPosition;
  viewId?: string;
}): PreviewTemplateBinding | null {
  const bindings = input.product.previewBindings ?? [];
  const exactView = input.viewId
    ? bindings.find(
        (binding) =>
          binding.printifyVariantId === input.variant.printifyVariantId &&
          binding.previewViewId === input.viewId,
      )
    : undefined;
  if (exactView) return exactView;

  const preferredPosition =
    input.position ?? input.product.defaultPlacement.position;
  return (
    bindings.find(
      (binding) =>
        binding.printifyVariantId === input.variant.printifyVariantId &&
        binding.productColor === input.variant.color &&
        binding.printPosition === preferredPosition,
    ) ??
    bindings.find(
      (binding) =>
        binding.printifyVariantId === input.variant.printifyVariantId &&
        binding.productColor === input.variant.color,
    ) ??
    null
  );
}

export function resolvePreviewTemplate(input: {
  product: MerchProduct;
  variant: ProductVariant;
  position?: PrintPosition;
  viewId?: string;
}) {
  const binding = getPreviewBinding(input);
  return {
    binding,
    template: getPreviewTemplate(
      binding?.previewTemplateId ?? input.product.previewTemplateId,
    ),
    viewId: binding?.previewViewId,
  };
}
