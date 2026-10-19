import type { MerchProduct, ProductVariant } from '../types';

/**
 * Garment colours a design was separated for. Artwork with dark ink must not
 * be offered on dark garments and vice versa, so every design is limited to
 * its own list (preference order); designs without one were made for light
 * garments.
 */
export const LIGHT_GARMENTS = ['White', 'Natural', 'Soft Cream', 'Athletic Heather', 'Sport Grey', 'Sand'];

export function allowedGarmentColors(design: { garmentColors?: string[] }) {
  return design.garmentColors ?? LIGHT_GARMENTS;
}

/** Variants of `product` the design may be printed on (non-apparel is unrestricted). */
export function variantsForDesign(product: MerchProduct, design: { garmentColors?: string[] }): ProductVariant[] {
  const available = product.variants.filter((variant) => variant.available);
  if (product.kind !== 'apparel') return available;
  const allowed = allowedGarmentColors(design);
  return available.filter((variant) => !variant.color || allowed.includes(variant.color));
}

/** First allowed colour this product actually comes in, in the design's preference order. */
export function preferredGarmentColor(product: MerchProduct, design: { garmentColors?: string[]; defaultProductColor?: string | null }) {
  if (product.kind !== 'apparel') return design.defaultProductColor ?? null;
  const colours = new Set(product.variants.filter((variant) => variant.available).map((variant) => variant.color));
  const order = [design.defaultProductColor, ...allowedGarmentColors(design)].filter((value): value is string => Boolean(value));
  return order.find((colour) => colours.has(colour) && allowedGarmentColors(design).includes(colour)) ?? null;
}

/** Products the design can actually be printed on (an apparel product needs at least one allowed colour). */
export function productsForDesign<T extends MerchProduct>(products: T[], design: { garmentColors?: string[] }) {
  return products.filter((product) => variantsForDesign(product, design).length > 0);
}
