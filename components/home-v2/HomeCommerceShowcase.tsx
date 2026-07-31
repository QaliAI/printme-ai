'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { InstantPreview } from '@/components/commerce/InstantPreview';
import {
  getRecommendedProduct,
  isDesignProductCompatible,
} from '@/lib/commerce/designs/rules';
import type { CuratedDesignRecord } from '@/lib/commerce/designs/models';
import {
  createProductConfiguration,
} from '@/lib/commerce/placement';
import { getPreviewTemplate } from '@/lib/commerce/templates';
import type {
  MerchProduct,
  ProductConfiguration,
} from '@/lib/commerce/types';
import styles from '@/app/home-v2.module.css';

function formatPrice(cents: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function configure(
  design: CuratedDesignRecord,
  product: MerchProduct,
  previous?: ProductConfiguration,
) {
  return createProductConfiguration({
    designId: design.id,
    design: design.asset,
    product,
    template: getPreviewTemplate(product.previewTemplateId),
    previous,
  });
}

export function HomeCommerceShowcase({
  designs,
  products,
}: {
  designs: CuratedDesignRecord[];
  products: MerchProduct[];
}) {
  const initialDesign = designs[0];
  const initialProduct = initialDesign
    ? getRecommendedProduct(initialDesign, products)
    : products[0];
  const [designId, setDesignId] = useState(initialDesign?.id ?? '');
  const [configuration, setConfiguration] =
    useState<ProductConfiguration | null>(() =>
      initialDesign && initialProduct
        ? configure(initialDesign, initialProduct)
        : null,
    );
  const design =
    designs.find((candidate) => candidate.id === designId) ?? initialDesign;
  const product = configuration
    ? products.find(
        (candidate) => candidate.id === configuration.merchProductId,
      )
    : initialProduct;
  const compatibleProducts = useMemo(
    () =>
      design
        ? products.filter((candidate) =>
            isDesignProductCompatible(design, candidate.id),
          )
        : [],
    [design, products],
  );

  if (!design || !product || !configuration) return null;
  const currentConfiguration = configuration;

  function selectDesign(nextDesign: CuratedDesignRecord) {
    const nextProduct =
      products.find(
        (candidate) =>
          candidate.id === currentConfiguration.merchProductId &&
          isDesignProductCompatible(nextDesign, candidate.id),
      ) ?? getRecommendedProduct(nextDesign, products);
    setDesignId(nextDesign.id);
    setConfiguration(configure(nextDesign, nextProduct, currentConfiguration));
  }

  function selectProduct(nextProduct: MerchProduct) {
    setConfiguration(configure(design, nextProduct, currentConfiguration));
  }

  return (
    <div className={styles.commerceShowcase} data-testid="home-commerce-showcase">
      <div className={styles.designRail} aria-label="Featured designs">
        {designs.slice(0, 4).map((candidate) => (
          <button
            type="button"
            key={candidate.id}
            aria-pressed={candidate.id === design.id}
            onClick={() => selectDesign(candidate)}
          >
            <Image
              src={candidate.asset.url}
              alt=""
              width={candidate.asset.width}
              height={candidate.asset.height}
              sizes="(max-width: 767px) 24vw, 120px"
            />
            <span>{candidate.title}</span>
          </button>
        ))}
      </div>
      <div className={styles.featuredPreview}>
        <InstantPreview
          design={design.asset}
          configuration={configuration}
          showSafeZone={false}
        />
      </div>
      <div className={styles.featuredControls}>
        <p>{design.collection}</p>
        <h3>{design.title}</h3>
        <span>{design.description}</span>
        <div className={styles.productButtons}>
          {compatibleProducts.map((candidate) => (
            <button
              type="button"
              key={candidate.id}
              aria-pressed={candidate.id === product.id}
              onClick={() => selectProduct(candidate)}
              data-testid={`home-featured-product-${candidate.id}`}
            >
              <strong>{candidate.name}</strong>
              <span>from {formatPrice(candidate.variants[0].unitPrice)}</span>
            </button>
          ))}
        </div>
        <div className={styles.featuredPrice}>
          <div>
            <small>Current preview</small>
            <strong>{formatPrice(configuration.unitPrice)}</strong>
          </div>
          <Link
            href={`/shop-v2?design=${encodeURIComponent(design.id)}&product=${encodeURIComponent(product.id)}`}
          >
            Configure
          </Link>
        </div>
      </div>
    </div>
  );
}
