'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { X, Check, ShoppingBag, Sparkles, ArrowRight } from 'lucide-react';
import {
  type PersonalizationFields,
  defaultPersonalization,
  buildPersonalizedSvg,
  addPersonalizedDesignToCart,
} from '@/lib/commerce/personalization-engine';
import { trackCommerceEvent } from '@/lib/commerce/analytics-events';
import type { SeasonalTrendCard } from '@/lib/commerce/seasonal-trends';
import type { CuratedDesign, MerchProduct } from '@/lib/commerce/types';
import styles from './seasonal.module.css';

interface PersonalizationModalProps {
  card: SeasonalTrendCard;
  product: MerchProduct;
  design: CuratedDesign;
  onClose: () => void;
}

export function PersonalizationModal({
  card,
  product,
  design,
  onClose,
}: PersonalizationModalProps) {
  const [fields, setFields] = useState<PersonalizationFields>(() => ({
    ...(defaultPersonalization[card.relatedDesignSlug] || {}),
  }));
  const [isAdding, setIsAdding] = useState(false);
  const [added, setAdded] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  // Close on escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Generate live SVG data URL
  const previewSvgDataUrl = useMemo(() => {
    const svg = buildPersonalizedSvg(card.relatedDesignSlug, fields);
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  }, [card.relatedDesignSlug, fields]);

  const handleFieldChange = (key: keyof PersonalizationFields, val: string) => {
    setFields((prev) => ({ ...prev, [key]: val }));
  };

  const handleAddToCart = async () => {
    setIsAdding(true);
    try {
      await addPersonalizedDesignToCart({
        slug: card.relatedDesignSlug,
        fields,
        product,
        design,
      });
      trackCommerceEvent('add_to_cart', {
        productId: product.id,
        sourceType: 'text-personalized',
      });
      setAdded(true);
    } catch (err) {
      console.error('Failed to add personalized item to cart:', err);
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div
      className={styles.modalBackdrop}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        className={styles.modalContent}
        ref={modalRef}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className={styles.modalCloseButton}
          onClick={onClose}
          aria-label="Close personalization editor"
        >
          <X size={20} />
        </button>

        <header className={styles.modalHeader}>
          <span className={styles.modalCategoryBadge}>{card.categoryLabel}</span>
          <h2 id="modal-title">{card.headline}</h2>
          <p>
            Personalize this design with your custom names, details, and traditions.
          </p>
        </header>

        <div className={styles.modalBody}>
          {/* Live Preview Area */}
          <div className={styles.modalPreviewCol}>
            <div className={styles.modalPreviewFrame}>
              {/* Product Mockup Base */}
              <Image
                src={card.mockupUrl}
                alt={card.headline}
                fill
                sizes="(max-width: 768px) 100vw, 400px"
                className={styles.modalBaseImage}
              />
              {/* Live Overlay Badge */}
              <div className={styles.liveOverlayPill}>
                <Sparkles size={14} /> Live Customization
              </div>
            </div>
            <p className={styles.modalPreviewCaption}>
              Printed on {card.recommendedProductName} · {card.verifiedPriceFormatted}
            </p>
          </div>

          {/* Configuration Form Controls */}
          <div className={styles.modalFormCol}>
            {card.relatedDesignSlug === 'haunted-household' && (
              <div className={styles.formGroupList}>
                <div className={styles.formField}>
                  <label htmlFor="field-family-name">Family / Household Name</label>
                  <input
                    id="field-family-name"
                    type="text"
                    value={fields.familyName || ''}
                    onChange={(e) => handleFieldChange('familyName', e.target.value)}
                    maxLength={32}
                    placeholder="e.g. THE MILLER COVEN"
                  />
                  <small>Appears in bold lettering on the lower banner</small>
                </div>
                <div className={styles.formField}>
                  <label htmlFor="field-subtitle">Motto / Subtitle</label>
                  <input
                    id="field-subtitle"
                    type="text"
                    value={fields.householdSubtitle || ''}
                    onChange={(e) => handleFieldChange('householdSubtitle', e.target.value)}
                    maxLength={36}
                    placeholder="e.g. ALL SOULS' EVE • EST. 2026"
                  />
                </div>
                <div className={styles.formField}>
                  <label htmlFor="field-members">Family Members &amp; Pet Names</label>
                  <input
                    id="field-members"
                    type="text"
                    value={fields.membersText || ''}
                    onChange={(e) => handleFieldChange('membersText', e.target.value)}
                    maxLength={48}
                    placeholder="e.g. SARAH • LIAM • MAYA • LUNA (PET)"
                  />
                  <small>List children, partners, or companion pets</small>
                </div>
              </div>
            )}

            {card.relatedDesignSlug === 'library-of-lost-hours' && (
              <div className={styles.formGroupList}>
                <div className={styles.formField}>
                  <label htmlFor="field-patron">Reader / Patron Name</label>
                  <input
                    id="field-patron"
                    type="text"
                    value={fields.patronName || ''}
                    onChange={(e) => handleFieldChange('patronName', e.target.value)}
                    maxLength={28}
                    placeholder="e.g. ELEANOR VANCE"
                  />
                </div>
                <div className={styles.formField}>
                  <label htmlFor="field-card-no">Library Card Number</label>
                  <input
                    id="field-card-no"
                    type="text"
                    value={fields.cardNumber || ''}
                    onChange={(e) => handleFieldChange('cardNumber', e.target.value)}
                    maxLength={16}
                    placeholder="e.g. #1031-B"
                  />
                </div>
                <div className={styles.formField}>
                  <label htmlFor="field-due-date">Featured Stamp Date</label>
                  <input
                    id="field-due-date"
                    type="text"
                    value={fields.dueDate || ''}
                    onChange={(e) => handleFieldChange('dueDate', e.target.value)}
                    maxLength={14}
                    placeholder="e.g. OCT 31"
                  />
                </div>
                <div className={styles.formField}>
                  <label htmlFor="field-subject">Classification Genre</label>
                  <input
                    id="field-subject"
                    type="text"
                    value={fields.specialSubject || ''}
                    onChange={(e) => handleFieldChange('specialSubject', e.target.value)}
                    maxLength={32}
                    placeholder="e.g. SUPERNATURAL / VOL. VII"
                  />
                </div>
              </div>
            )}

            {card.relatedDesignSlug === 'midnight-hayride' && (
              <div className={styles.formGroupList}>
                <div className={styles.formField}>
                  <label htmlFor="field-location">City or Chapter Location</label>
                  <input
                    id="field-location"
                    type="text"
                    value={fields.locationName || ''}
                    onChange={(e) => handleFieldChange('locationName', e.target.value)}
                    maxLength={30}
                    placeholder="e.g. SLEEPY HOLLOW, NY"
                  />
                </div>
                <div className={styles.formField}>
                  <label htmlFor="field-chapter">Chapter Designation</label>
                  <input
                    id="field-chapter"
                    type="text"
                    value={fields.chapterNumber || ''}
                    onChange={(e) => handleFieldChange('chapterNumber', e.target.value)}
                    maxLength={20}
                    placeholder="e.g. CHAPTER NO. 31"
                  />
                </div>
              </div>
            )}

            {card.relatedDesignSlug === 'field-notes-after-dark' && (
              <div className={styles.formGroupList}>
                <div className={styles.formField}>
                  <label htmlFor="field-animal">Woodland Specimen</label>
                  <select
                    id="field-animal"
                    value={fields.woodlandAnimal || 'TYTO ALBA (BARN OWL)'}
                    onChange={(e) => handleFieldChange('woodlandAnimal', e.target.value)}
                  >
                    <option value="TYTO ALBA (BARN OWL)">Barn Owl (Tyto alba)</option>
                    <option value="VULPES VULPES (RED FOX)">Red Fox (Vulpes vulpes)</option>
                    <option value="ODOCOILEUS VIRGINIANUS (DEER)">Whitetail Deer (Odocoileus virginianus)</option>
                  </select>
                </div>
                <div className={styles.formField}>
                  <label htmlFor="field-f-location">Observation Location</label>
                  <input
                    id="field-f-location"
                    type="text"
                    value={fields.fieldLocation || ''}
                    onChange={(e) => handleFieldChange('fieldLocation', e.target.value)}
                    maxLength={44}
                    placeholder="e.g. WHITE MOUNTAIN WILDERNESS • NH"
                  />
                </div>
                <div className={styles.formField}>
                  <label htmlFor="field-observer">Observer / Naturalist Name</label>
                  <input
                    id="field-observer"
                    type="text"
                    value={fields.observerName || ''}
                    onChange={(e) => handleFieldChange('observerName', e.target.value)}
                    maxLength={28}
                    placeholder="e.g. E. HEMINGWAY"
                  />
                </div>
              </div>
            )}

            {card.relatedDesignSlug === 'leftovers-league' && (
              <div className={styles.formGroupList}>
                <div className={styles.formField}>
                  <label htmlFor="field-l-family">Family / Group Name</label>
                  <input
                    id="field-l-family"
                    type="text"
                    value={fields.leagueFamilyName || ''}
                    onChange={(e) => handleFieldChange('leagueFamilyName', e.target.value)}
                    maxLength={30}
                    placeholder="e.g. THE HENDERSON CLAN"
                  />
                </div>
                <div className={styles.formField}>
                  <label htmlFor="field-l-year">Year</label>
                  <input
                    id="field-l-year"
                    type="text"
                    value={fields.leagueYear || '2026'}
                    onChange={(e) => handleFieldChange('leagueYear', e.target.value)}
                    maxLength={4}
                    placeholder="2026"
                  />
                </div>
                <div className={styles.formField}>
                  <label htmlFor="field-l-role">Member Role</label>
                  <select
                    id="field-l-role"
                    value={fields.memberRole || 'OFFICIAL PIE INSPECTOR'}
                    onChange={(e) => handleFieldChange('memberRole', e.target.value)}
                  >
                    <option value="OFFICIAL PIE INSPECTOR">Official Pie Inspector</option>
                    <option value="UNDEFEATED NAP CHAMPION">Undefeated Nap Champion</option>
                    <option value="CHIEF TURKEY CARVER">Chief Turkey Carver</option>
                    <option value="LEFTOVER SECURITY OFFICER">Leftover Security Officer</option>
                    <option value="CRANBERRY SAUCE SPECIALIST">Cranberry Sauce Specialist</option>
                  </select>
                </div>
              </div>
            )}

            {/* Modal Actions */}
            <div className={styles.modalActionRow}>
              {added ? (
                <div className={styles.addedSuccessBanner}>
                  <span className={styles.successCheck}>
                    <Check size={18} /> Added to your shopping bag!
                  </span>
                  <div className={styles.successLinks}>
                    <Link href="/shop-v2" className={styles.primaryActionButton}>
                      View Bag &amp; Checkout <ArrowRight size={16} />
                    </Link>
                    <button
                      type="button"
                      className={styles.secondaryActionButton}
                      onClick={onClose}
                    >
                      Keep Browsing
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <button
                    type="button"
                    className={styles.primaryActionButton}
                    onClick={handleAddToCart}
                    disabled={isAdding}
                  >
                    <ShoppingBag size={18} />
                    {isAdding
                      ? 'Preparing custom print...'
                      : `Add Custom Design to Bag · ${card.verifiedPriceFormatted}`}
                  </button>
                  <button
                    type="button"
                    className={styles.secondaryActionButton}
                    onClick={onClose}
                  >
                    Cancel
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
