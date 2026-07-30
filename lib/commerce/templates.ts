import type { PreviewTemplate } from './types';

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
];

export function getPreviewTemplate(templateId: string) {
  const template = previewTemplates.find((candidate) => candidate.id === templateId);
  if (!template) throw new Error(`Unknown preview template: ${templateId}`);
  return template;
}
