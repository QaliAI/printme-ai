'use client';

import Image from 'next/image';
import { useState } from 'react';
import type { MerchProduct } from '@/lib/commerce/types';
import styles from '@/app/home-v2.module.css';

const productImages: Record<
  string,
  { src: string; width: number; height: number; alt: string }
> = {
  'gallery-poster': {
    src: '/home-v2/hero-print-products.webp',
    width: 1536,
    height: 1024,
    alt: 'A framed dog portrait, printed tee, and mug in a product studio',
  },
  'everyday-tee': {
    src: '/landing/mockups/product-tshirt.webp',
    width: 960,
    height: 960,
    alt: 'A finished personalized t-shirt photographed on a neutral background',
  },
};

function formatPrice(cents: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export function HeroProductSwitcher({
  products,
}: {
  products: MerchProduct[];
}) {
  const [selectedId, setSelectedId] = useState(products[0]?.id ?? '');
  const selected =
    products.find((product) => product.id === selectedId) ?? products[0];
  if (!selected) return null;
  const image = productImages[selected.id] ?? productImages['gallery-poster'];
  const startingPrice = Math.min(
    ...selected.variants
      .filter((variant) => variant.available)
      .map((variant) => variant.unitPrice),
  );

  return (
    <div className={styles.heroSwitcher} data-testid="home-hero-switcher">
      <div className={styles.heroImage}>
        <Image
          key={image.src}
          src={image.src}
          alt={image.alt}
          width={image.width}
          height={image.height}
          sizes="(max-width: 767px) 100vw, 52vw"
          preload
        />
      </div>
      <div className={styles.heroProductControls}>
        <div>
          <span>Now showing</span>
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
