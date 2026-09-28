'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Sparkles } from 'lucide-react';
import type { SeasonalTrendCard as SeasonalTrendCardType } from '@/lib/commerce/seasonal-trends';
import { trackCommerceEvent } from '@/lib/commerce/analytics-events';
import styles from './seasonal.module.css';

interface SeasonalTrendCardProps {
  card: SeasonalTrendCardType;
  onPersonalize: (card: SeasonalTrendCardType) => void;
}

export function SeasonalTrendCard({
  card,
  onPersonalize,
}: SeasonalTrendCardProps) {
  const handleShopClick = () => {
    trackCommerceEvent('design_selected', {
      designId: card.relatedDesignId,
      productId: card.recommendedProductId,
      source: 'seasonal_edit_shop',
    });
  };

  const handleMakeItMineClick = () => {
    trackCommerceEvent('preparation_selected', {
      designId: card.relatedDesignId,
      productId: card.recommendedProductId,
      source: 'seasonal_edit_personalize',
    });
    onPersonalize(card);
  };

  return (
    <article
      className={styles.card}
      data-testid={`seasonal-card-${card.relatedDesignSlug}`}
    >
      <div className={styles.cardImageContainer}>
        <Image
          src={card.mockupUrl}
          alt={`${card.headline} on ${card.recommendedProductName}`}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className={styles.cardImage}
        />
        <span className={styles.categoryBadge}>{card.categoryLabel}</span>
      </div>

      <div className={styles.cardContent}>
        <div className={styles.cardHeader}>
          <h3 className={styles.cardTitle}>{card.headline}</h3>
          <span className={styles.productPricePill}>
            {card.recommendedProductName} · {card.verifiedPriceFormatted}
          </span>
        </div>

        <p className={styles.cardDescription}>{card.description}</p>

        <div className={styles.cardActions}>
          <Link
            href={`/shop-v2?design=${encodeURIComponent(card.relatedDesignSlug)}`}
            className={styles.shopDesignButton}
            onClick={handleShopClick}
            data-testid={`shop-design-${card.relatedDesignSlug}`}
          >
            Shop This Design
            <ArrowRight size={15} aria-hidden="true" />
          </Link>

          {card.isPersonalizationSupported && (
            <button
              type="button"
              className={styles.makeItMineButton}
              onClick={handleMakeItMineClick}
              data-testid={`make-it-mine-${card.relatedDesignSlug}`}
            >
              <Sparkles size={14} aria-hidden="true" />
              Make It Mine
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
