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
        baseProductImage: '/shop-v2/photo/poster-12x18.webp',
        mockupWidth: 800,
        mockupHeight: 800,
        printArea: { x: 178, y: 62, width: 462, height: 693 },
        safeZoneInset: 20,
        placeholderWidth: 3600,
        placeholderHeight: 5100,
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
        baseProductImage: '/shop-v2/photo/tee-front.webp',
        mockupWidth: 800,
        mockupHeight: 800,
        printArea: { x: 242, y: 262, width: 275, height: 348 },
        safeZoneInset: 12,
        placeholderWidth: 4500,
        placeholderHeight: 5700,
        shadeOverlay: '/shop-v2/photo/tee-front-shade.png',
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
        baseProductImage: '/shop-v2/photo/poster-12x18.webp',
        mockupWidth: 800,
        mockupHeight: 800,
        printArea: { x: 178, y: 62, width: 462, height: 693 },
        safeZoneInset: 20,
        placeholderWidth: 3600,
        placeholderHeight: 5400,
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
        baseProductImage: '/shop-v2/photo/poster-18x24.webp',
        mockupWidth: 800,
        mockupHeight: 800,
        printArea: { x: 148, y: 62, width: 520, height: 693 },
        safeZoneInset: 20,
        placeholderWidth: 5400,
        placeholderHeight: 7200,
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
        baseProductImage: '/shop-v2/photo/tee-front.webp',
        mockupWidth: 800,
        mockupHeight: 800,
        printArea: { x: 242, y: 268, width: 275, height: 334 },
        safeZoneInset: 12,
        placeholderWidth: 3591,
        placeholderHeight: 4364,
        productColor: 'White',
        shadeOverlay: '/shop-v2/photo/tee-front-shade.png',
      },
      {
        id: 'tee-m-back',
        label: 'Back',
        position: 'back',
        baseProductImage: '/shop-v2/photo/tee-back.webp',
        mockupWidth: 800,
        mockupHeight: 800,
        printArea: { x: 248, y: 250, width: 275, height: 334 },
        safeZoneInset: 12,
        placeholderWidth: 3591,
        placeholderHeight: 4364,
        productColor: 'White',
        shadeOverlay: '/shop-v2/photo/tee-back-shade.png',
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
        baseProductImage: '/shop-v2/photo/tee-front.webp',
        mockupWidth: 800,
        mockupHeight: 800,
        printArea: { x: 229, y: 252, width: 302, height: 367 },
        safeZoneInset: 12,
        placeholderWidth: 3951,
        placeholderHeight: 4800,
        productColor: 'White',
        shadeOverlay: '/shop-v2/photo/tee-front-shade.png',
      },
      {
        id: 'tee-l-back',
        label: 'Back',
        position: 'back',
        baseProductImage: '/shop-v2/photo/tee-back.webp',
        mockupWidth: 800,
        mockupHeight: 800,
        printArea: { x: 235, y: 234, width: 302, height: 367 },
        safeZoneInset: 12,
        placeholderWidth: 3951,
        placeholderHeight: 4800,
        productColor: 'White',
        shadeOverlay: '/shop-v2/photo/tee-back-shade.png',
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
        baseProductImage: '/shop-v2/mug-left-base.webp',
        shadeOverlay: '/shop-v2/photo/mug-left-shade.png',
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
        baseProductImage: '/shop-v2/mug-right-base.webp',
        shadeOverlay: '/shop-v2/photo/mug-right-shade.png',
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

/** Only visually verified blank assets may be used as product bases. */
export const verifiedBlankProductImages = new Set([
  '/shop-v2/tee-base.svg', '/shop-v2/tee-back.svg', '/shop-v2/poster-base.svg',
  '/shop-v2/mug-left-base.webp', '/shop-v2/mug-right-base.webp',
  // Official Printify catalog photography of the approved blanks (scripts/mockups/build-photo-bases.mjs)
  '/shop-v2/photo/tee-front.webp', '/shop-v2/photo/tee-back.webp',
  '/shop-v2/photo/poster-12x18.webp', '/shop-v2/photo/poster-18x24.webp',
]);

export function getPreviewTemplate(templateId: string) {
  const template = previewTemplates.find((candidate) => candidate.id === templateId);
  if (!template) throw new Error(`Unknown preview template: ${templateId}`);
  if (template.views.some(view => !verifiedBlankProductImages.has(view.baseProductImage))) {
    throw new Error('Preview template uses an unverified product base.');
  }
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
