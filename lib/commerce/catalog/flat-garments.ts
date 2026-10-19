import flat from '../flat-templates.json';
import type { MerchProduct, PreviewTemplate, PreviewTemplateBinding, ProductVariant } from '../types';

/**
 * Additional garments and colours, generated from measured Printify data
 * (scripts/mockups/printify-blank-bases.mjs → lib/commerce/flat-templates.json):
 * print areas come from a calibration block rendered by Printify itself, and
 * bases are Printify's blank flat mockups. Provider: Printify Choice (99).
 */

type Position = 'front' | 'back';
type GarmentKey = keyof typeof flat.garments;
interface FlatView {
  printArea: { x: number; y: number; width: number; height: number };
  placeholderWidth: number;
  placeholderHeight: number;
}
interface FlatGarment {
  blueprint: number;
  provider: number;
  sizes: Record<string, Partial<Record<Position, FlatView>>>;
  colors: Record<string, { variantIds: Record<string, number> } & Partial<Record<Position, string>>>;
}

const garments = flat.garments as unknown as Record<GarmentKey, FlatGarment>;
const slug = (value: string) => value.toLowerCase().replace(/\s+/g, '-');
const positions: Position[] = ['front', 'back'];
const PPI = 300;

/**
 * The measured box can lose a few pixels to fold shading at an edge, so the
 * print area is the largest box with the placeholder's exact aspect ratio that
 * fits inside the measurement, centred on it.
 */
function fittedView(view: FlatView) {
  const aspect = view.placeholderWidth / view.placeholderHeight;
  const { x, y, width, height } = view.printArea;
  const w = Math.min(width, height * aspect);
  const h = w / aspect;
  return { printArea: { x: Math.round(x + (width - w) / 2), y: Math.round(y + (height - h) / 2), width: Math.round(w), height: Math.round(h) } };
}

export const flatTemplateId =(garment: GarmentKey, color: string, size: string) => `${garment}-${slug(color)}-${size.toLowerCase()}-flat`;

export const flatPreviewTemplates: PreviewTemplate[] = (Object.keys(garments) as GarmentKey[]).flatMap((key) => {
  const garment = garments[key];
  return Object.entries(garment.colors).flatMap(([color, colourData]) =>
    Object.entries(garment.sizes).map(([size, views]) => {
      const id = flatTemplateId(key, color, size);
      const available = positions.filter((position) => views[position] && colourData[position]);
      return {
        id,
        kind: 'apparel' as const,
        supportedPrintPositions: available,
        views: available.map((position) => {
          const view = views[position]!;
          return {
            ...fittedView(view),
            id: `${id}-${position}`,
            label: position === 'front' ? 'Front' : 'Back',
            position,
            baseProductImage: colourData[position]!,
            mockupWidth: 800,
            mockupHeight: 800,
            safeZoneInset: 10,
            placeholderWidth: view.placeholderWidth,
            placeholderHeight: view.placeholderHeight,
            productColor: color,
          };
        }),
      };
    }),
  );
});

export const flatBaseImages = (Object.keys(garments) as GarmentKey[]).flatMap((key) =>
  Object.values(garments[key].colors).flatMap((colour) => positions.map((position) => colour[position]).filter((value): value is string => Boolean(value))),
);

function variantsAndBindings(key: GarmentKey, idPrefix: string, unitPrice: number) {
  const garment = garments[key];
  const variants: ProductVariant[] = [];
  const bindings: PreviewTemplateBinding[] = [];
  for (const [color, colourData] of Object.entries(garment.colors)) {
    for (const [size, views] of Object.entries(garment.sizes)) {
      const printifyVariantId = colourData.variantIds[size];
      if (!printifyVariantId) continue;
      const templateId = flatTemplateId(key, color, size);
      variants.push({
        id: `${idPrefix}-${slug(color)}-${size.toLowerCase()}`,
        printifyVariantId,
        title: `${color} / ${size}`,
        color,
        size,
        unitPrice,
        unitCost: null,
        currency: 'USD',
        available: true,
        placeholders: positions
          .filter((position) => views[position])
          .map((position) => ({
            position,
            decorationMethod: 'dtg',
            width: views[position]!.placeholderWidth,
            height: views[position]!.placeholderHeight,
            printWidthInches: Math.round((views[position]!.placeholderWidth / PPI) * 100) / 100,
            printHeightInches: Math.round((views[position]!.placeholderHeight / PPI) * 100) / 100,
          })),
      });
      for (const position of positions) {
        if (!views[position] || !colourData[position]) continue;
        bindings.push({
          key: `${garment.blueprint}:${garment.provider}:${printifyVariantId}:${color}:${position}:dtg:${templateId}-${position}`,
          printifyBlueprintId: garment.blueprint,
          printifyProviderId: garment.provider,
          printifyVariantId,
          productColor: color,
          printPosition: position,
          decorationMethod: 'dtg',
          previewViewId: `${templateId}-${position}`,
          previewTemplateId: templateId,
        });
      }
    }
  }
  return { variants, bindings };
}

/** Extra Bella+Canvas 3001 colours for the Everyday Tee (same blueprint, provider and price). */
export const extraTeeColours = variantsAndBindings('tee', 'tee', 3400);

const commonMerchandising = {
  printMethod: 'Direct-to-garment front or back print',
  productionEstimate: 'Calculated from the selected provider before checkout.',
  deliveryEstimate: null,
  shippingExplanation: 'Production time is separate from carrier transit. A delivery promise appears only when live rates are available.',
  returnPolicy: 'Made-to-order sizing is final; verified damage or production defects qualify for review and reprint.',
  shippingCost: null,
  stripeFeeRate: 0.029,
  stripeFixedFee: 30,
  aiProcessingCost: 0,
};

function garmentProduct(input: {
  key: GarmentKey;
  id: string;
  name: string;
  description: string;
  unitPrice: number;
  material: string;
  fit: string;
  care: string[];
  supportReserve: number;
  defaultScale: number;
}): MerchProduct {
  const { variants, bindings } = variantsAndBindings(input.key, input.id, input.unitPrice);
  const first = variants[0];
  const garment = garments[input.key];
  return {
    id: input.id,
    name: input.name,
    description: input.description,
    kind: 'apparel',
    printifyBlueprintId: garment.blueprint,
    previewTemplateId: flatTemplateId(input.key, first.color!, first.size!),
    previewBindings: bindings,
    provider: { id: `printify-choice-${input.key}`, printifyProviderId: garment.provider, name: 'Printify Choice', decorationMethods: ['dtg'] },
    variants,
    defaultPlacement: { position: 'front', decorationMethod: 'dtg', normalizedX: 0.5, normalizedY: 0.5, normalizedScale: input.defaultScale, angle: 0, fit: 'contain' },
    merchandising: {
      ...commonMerchandising,
      slug: input.id,
      material: input.material,
      fit: input.fit,
      careInstructions: input.care,
      sizeGuide: Object.keys(garment.sizes).map((size) => ({ label: size, detail: `${size} provider variant` })),
      faq: [
        { question: 'Can I print on the back?', answer: 'Yes. Switch the preview to the back view before adding to cart.' },
        { question: 'How should I choose a size?', answer: 'It is a relaxed unisex fit; size down for a closer fit.' },
      ],
      supportReserve: input.supportReserve,
    },
  };
}

export const cozyCrewneck = garmentProduct({
  key: 'crewneck',
  id: 'cozy-crewneck',
  name: 'Cozy Crewneck',
  description: 'Gildan 18000 heavy blend crewneck sweatshirt with a front print.',
  unitPrice: 4900,
  material: 'Gildan 18000: 50% cotton, 50% polyester heavy blend fleece',
  fit: 'Unisex relaxed fit, ribbed collar, cuffs and waistband',
  care: ['Wash cold, inside out.', 'Tumble dry low; do not iron the print.'],
  supportReserve: 350,
  defaultScale: 0.82,
});

export const heavyHoodie = garmentProduct({
  key: 'hoodie',
  id: 'heavy-hoodie',
  name: 'Heavy Blend Hoodie',
  description: 'Gildan 18500 heavy blend hooded sweatshirt with a chest print above the pocket.',
  unitPrice: 5900,
  material: 'Gildan 18500: cotton-polyester heavy blend fleece',
  fit: 'Unisex relaxed fit, double-lined hood, front pouch pocket',
  care: ['Wash cold, inside out.', 'Tumble dry low; do not iron the print.'],
  supportReserve: 400,
  defaultScale: 0.95,
});
