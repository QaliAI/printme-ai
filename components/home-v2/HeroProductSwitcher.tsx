'use client';

import { MerchandisePreview } from '@/components/commerce/MerchandisePreview';
import { useState } from 'react';
import type { CuratedDesign, MerchProduct } from '@/lib/commerce/types';
import styles from '@/app/home-v2.module.css';

function formatPrice(cents: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export function HeroProductSwitcher({
  products,
  design,
}: {
  products: MerchProduct[];
  design: CuratedDesign;
}) {
  const [selectedId, setSelectedId] = useState(products[0]?.id ?? '');
  const selected =
    products.find((product) => product.id === selectedId) ?? products[0];
  if (!selected) return null;
  const startingPrice = Math.min(
    ...selected.variants
      .filter((variant) => variant.available)
      .map((variant) => variant.unitPrice),
  );

  return (
    <div className={styles.heroSwitcher} data-testid="home-hero-switcher">
      <div className={styles.heroImage}>
<MerchandisePreview design={design} product={selected} />
      </div>
      <div className={styles.heroProductControls}>
        <div>
          <span>Preview a product</span>
          <strong>
            {selected.name} from {formatPrice(startingPrice)}
          </strong>
        </div>
        <div role="group" aria-label="Choose a hero product">
          {products.map((product) => (
            <button
              type="button"
              key={product.id}
              aria-pressed={selected.id === product.id}
              onClick={() => setSelectedId(product.id)}
              data-testid={`home-hero-product-${product.id}`}
            >
              {product.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
