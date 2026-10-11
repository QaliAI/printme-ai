import type { SameDesignUpsell } from './upsells';
import type { CartConfigurationSnapshot } from './types';

export interface SameDesignSet { id: string; label: string; source: CartConfigurationSnapshot; existing: CartConfigurationSnapshot[]; additions: SameDesignUpsell[]; total: number }
const sets = [
  { id: 'tee-mug', label: 'Tee + Mug', products: ['everyday-tee', 'keepsake-mug'] },
  { id: 'tee-poster', label: 'Tee + Poster', products: ['everyday-tee', 'gallery-poster'] },
  { id: 'tee-mug-poster', label: 'Tee + Mug + Poster', products: ['everyday-tee', 'keepsake-mug', 'gallery-poster'] },
];

// Recommendations already carry verified catalog prices and margin checks.
// A set charges those full prices; bundle discounts are not checkout-enforced.
export function getSameDesignSets(source: CartConfigurationSnapshot, items: CartConfigurationSnapshot[], upsells: SameDesignUpsell[]): SameDesignSet[] {
  const existing = items.filter(item => item.configuration.designId === source.configuration.designId && item.configuration.designVersion === source.configuration.designVersion);
  if (existing.some(item => item.quantity !== 1) || existing[0]?.id !== source.id) return [];
  return sets.flatMap(set => {
    if (existing.some(item => !set.products.includes(item.configuration.merchProductId))) return [];
    const missing = set.products.filter(id => !existing.some(item => item.configuration.merchProductId === id));
    const additions = missing.map(id => upsells.find(offer => offer.sourceItemId === source.id && offer.product.id === id));
    if (!missing.length || additions.some(offer => !offer)) return [];
    const offers = additions as SameDesignUpsell[];
    return [{ id: `${source.id}:${set.id}`, label: set.label, source, existing, additions: offers,
      total: existing.reduce((sum, item) => sum + item.configuration.unitPrice, 0) + offers.reduce((sum, offer) => sum + offer.configuration.unitPrice, 0) }];
  });
}
