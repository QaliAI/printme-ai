'use client';

import { useState, useMemo, useEffect } from 'react';
import {
  type SeasonalCategory,
  type SeasonalTrendCard as SeasonalTrendCardType,
  getActiveSeasonalTrends,
} from '@/lib/commerce/seasonal-trends';
import { SeasonalTrendCard } from './SeasonalTrendCard';
import { PersonalizationModal } from './PersonalizationModal';
import { trackCommerceEvent } from '@/lib/commerce/analytics-events';
import type { CuratedDesign, MerchProduct } from '@/lib/commerce/types';
import styles from './seasonal.module.css';

interface SeasonalEditSectionProps {
  products: MerchProduct[];
  designs: CuratedDesign[];
}

const CATEGORY_TABS: Array<{ key: SeasonalCategory | 'all'; label: string }> = [
  { key: 'all', label: 'All Seasonal' },
  { key: 'halloween', label: 'Halloween' },
  { key: 'cozy-fall', label: 'Cozy Fall' },
  { key: 'thanksgiving', label: 'Thanksgiving' },
];

export function SeasonalEditSection({
  products,
  designs,
}: SeasonalEditSectionProps) {
  const [activeTab, setActiveTab] = useState<SeasonalCategory | 'all'>('all');
  const [personalizingCard, setPersonalizingCard] =
    useState<SeasonalTrendCardType | null>(null);

  // Track impression of The Seasonal Edit section
  useEffect(() => {
    trackCommerceEvent('design_view', {
      section: 'the_seasonal_edit',
      category: activeTab,
    });
  }, [activeTab]);

  const allCards = useMemo(() => getActiveSeasonalTrends(), []);

  const filteredCards = useMemo(() => {
    if (activeTab === 'all') return allCards;
    return allCards.filter((card) => card.category === activeTab);
  }, [activeTab, allCards]);

  const selectedProduct = useMemo(() => {
    if (!personalizingCard) return products[0];
    return (
      products.find(
        (p) => p.id === personalizingCard.recommendedProductId,
      ) || products[0]
    );
  }, [personalizingCard, products]);

  const selectedDesign = useMemo(() => {
    if (!personalizingCard) return designs[0];
    return (
      designs.find(
        (d) => d.id === personalizingCard.relatedDesignId,
      ) || designs[0]
    );
  }, [personalizingCard, designs]);

  return (
    <section
      className={styles.section}
      id="seasonal-edit"
      aria-labelledby="seasonal-edit-heading"
      data-testid="the-seasonal-edit-section"
    >
      <div className={styles.sectionHeader}>
        <span className={styles.eyebrow}>Curated Trends · Original Art</span>
        <h2 id="seasonal-edit-heading" className={styles.heading}>
          THE SEASONAL EDIT
        </h2>
        <p className={styles.subheading}>Fresh ideas. Your version.</p>
        <p className={styles.description}>
          Explore original Halloween, autumn, and Thanksgiving designs grounded
          in real seasonal trends. Order ready-to-wear classics or personalize your
          own keepsake.
        </p>

        {/* Category Navigation Tabs */}
        <nav
          className={styles.tabNav}
          aria-label="Filter seasonal categories"
        >
          {CATEGORY_TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                type="button"
                key={tab.key}
                className={`${styles.tabButton} ${
                  isActive ? styles.tabButtonActive : ''
                }`}
                onClick={() => setActiveTab(tab.key)}
                aria-pressed={isActive}
                data-testid={`seasonal-tab-${tab.key}`}
              >
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Responsive Cards Grid */}
      <div className={styles.grid}>
        {filteredCards.map((card) => (
          <SeasonalTrendCard
            key={card.id}
            card={card}
            onPersonalize={(selected) => setPersonalizingCard(selected)}
          />
        ))}
      </div>

      {/* Interactive Personalization Modal */}
      {personalizingCard && selectedProduct && selectedDesign && (
        <PersonalizationModal
          card={personalizingCard}
          product={selectedProduct}
          design={selectedDesign}
          onClose={() => setPersonalizingCard(null)}
        />
      )}
    </section>
  );
}
