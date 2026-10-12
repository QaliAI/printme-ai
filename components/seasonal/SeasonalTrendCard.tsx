'use client';

import { MerchandisePreview } from '@/components/commerce/MerchandisePreview';
import type { CuratedDesign, MerchProduct } from '@/lib/commerce/types';
import Link from 'next/link';
import { ArrowRight, Sparkles } from 'lucide-react';
import type { SeasonalTrendCard as SeasonalTrendCardType } from '@/lib/commerce/seasonal-trends';
import { trackCommerceEvent } from '@/lib/commerce/analytics-events';
import styles from './seasonal.module.css';
interface SeasonalTrendCardProps {
  card: SeasonalTrendCardType;
  design: CuratedDesign;
  product: MerchProduct;
  onPersonalize: (card: SeasonalTrendCardType) => void;
}
export function SeasonalTrendCard({
  card,
  design,
  product,
  onPersonalize
}: SeasonalTrendCardProps) {
  const handleShopClick = () => {
    trackCommerceEvent('design_selected', {
      designId: card.relatedDesignId,
      productId: card.recommendedProductId,
      source: 'seasonal_edit_shop'
    });
  };
  const handleMakeItMineClick = () => {
    trackCommerceEvent('preparation_selected', {
      designId: card.relatedDesignId,
      productId: card.recommendedProductId,
      source: 'seasonal_edit_personalize'
    });
    onPersonalize(card);
  };
  return <article className={styles.card} data-testid={`seasonal-card-${card.relatedDesignSlug}`}>
      <div className={styles.cardImageContainer}>
<MerchandisePreview design={design} product={product} />
        <span className={styles.categoryBadge}>{card.categoryLabel}</span>
      </div>

      <div className={styles.cardContent}>
        <div className={styles.cardHeader}>
          <h3 className={styles.cardTitle}>{card.headline}</h3>
          <span className={styles.productPricePill}>
            {product.name} · {new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
          }).format(Math.min(...product.variants.filter(variant => variant.available).map(variant => variant.unitPrice)) / 100)}
          </span>
        </div>

        <p className={styles.cardDescription}>{card.description}</p>

        <div className={styles.cardActions}>
          <Link href={`/shop-v2?design=${encodeURIComponent(card.relatedDesignSlug)}`} className={styles.shopDesignButton} onClick={handleShopClick} data-testid={`shop-design-${card.relatedDesignSlug}`}>
            Shop This Design
            <ArrowRight size={15} aria-hidden="true" />
          </Link>

          {card.isPersonalizationSupported && <button type="button" className={styles.makeItMineButton} onClick={handleMakeItMineClick} data-testid={`make-it-mine-${card.relatedDesignSlug}`}>
              <Sparkles size={14} aria-hidden="true" />
              Make It Mine
            </button>}
        </div>
      </div>
    </article>;
}
