'use client';

import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';
import { InstantPreview } from '@/components/commerce/InstantPreview';
import {
  createCartSnapshot,
  readLocalCart,
  upsertCartItem,
  writeLocalCart,
} from '@/lib/commerce/local-cart';
import {
  createProductConfiguration,
} from '@/lib/commerce/placement';
import {
  readPersistentCart,
  removePersistentCartItem,
  upsertPersistentCartItem,
} from '@/lib/commerce/persistent-cart-client';
import { getPreviewTemplate } from '@/lib/commerce/templates';
import type {
  CartConfigurationSnapshot,
  CuratedDesign,
  MerchProduct,
  ProductConfiguration,
  ProductVariant,
} from '@/lib/commerce/types';
import styles from './shop-v2.module.css';

interface ShopV2ExperienceProps {
  designs: CuratedDesign[];
  products: MerchProduct[];
}

function formatPrice(cents: number, currency = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(cents / 100);
}

function findById<T extends { id: string }>(items: T[], id: string, label: string) {
  const item = items.find((candidate) => candidate.id === id);
  if (!item) throw new Error(`Unknown ${label}: ${id}`);
  return item;
}

export function ShopV2Experience({
  designs,
  products,
}: ShopV2ExperienceProps) {
  const [selectedDesignId, setSelectedDesignId] = useState<string | null>(null);
  const [configuration, setConfiguration] =
    useState<ProductConfiguration | null>(null);
  const [cartItems, setCartItems] = useState<CartConfigurationSnapshot[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [cartPending, setCartPending] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const localItems = readLocalCart(window.localStorage);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCartItems(localItems);

    async function restorePersistentCart() {
      const persistedItems = await readPersistentCart();
      if (cancelled || persistedItems === null) return;

      if (persistedItems.length > 0) {
        writeLocalCart(window.localStorage, persistedItems);
        setCartItems(persistedItems);
        return;
      }

      if (localItems.length === 0) return;
      const restored = (
        await Promise.all(
          localItems.map((item) => upsertPersistentCartItem(item))
        )
      ).filter(
        (item): item is CartConfigurationSnapshot => item !== null
      );
      if (cancelled || restored.length === 0) return;
      writeLocalCart(window.localStorage, restored);
      setCartItems(restored);
    }

    void restorePersistentCart();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (cartOpen) setCartOpen(false);
      else if (selectedDesignId) setSelectedDesignId(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [cartOpen, selectedDesignId]);

  const selectedDesign = selectedDesignId
    ? findById(designs, selectedDesignId, 'design')
    : null;
  const selectedProduct = configuration
    ? findById(products, configuration.merchProductId, 'product')
    : null;
  const cartTotal = useMemo(
    () =>
      cartItems.reduce(
        (total, item) =>
          total + item.configuration.unitPrice * item.quantity,
        0
      ),
    [cartItems]
  );

  function openDesign(design: CuratedDesign) {
    const product = findById(
      products,
      design.recommendedProductId,
      'recommended product'
    );
    const template = getPreviewTemplate(product.previewTemplateId);
    setSelectedDesignId(design.id);
    setConfiguration(
      createProductConfiguration({
        designId: design.id,
        design: design.asset,
        product,
        template,
      })
    );
    setEditingItemId(null);
  }

  function switchProduct(product: MerchProduct) {
    if (!selectedDesign || !configuration) return;
    const template = getPreviewTemplate(product.previewTemplateId);
    setConfiguration(
      createProductConfiguration({
        designId: selectedDesign.id,
        design: selectedDesign.asset,
        product,
        template,
        previous: configuration,
      })
    );
  }

  function selectVariant(variant: ProductVariant) {
    if (!configuration) return;
    setConfiguration({
      ...configuration,
      printifyVariantId: variant.printifyVariantId,
      selectedColor: variant.color,
      selectedSize: variant.size,
      unitPrice: variant.unitPrice,
      currency: variant.currency,
    });
  }

  function closeConfigurator() {
    setSelectedDesignId(null);
    setConfiguration(null);
    setEditingItemId(null);
  }

  function persistCart(nextItems: CartConfigurationSnapshot[]) {
    writeLocalCart(window.localStorage, nextItems);
    setCartItems(nextItems);
  }

  async function addToCart() {
    if (!selectedDesign || !selectedProduct || !configuration) return;
    setCartPending(true);
    try {
      const existing = editingItemId
        ? cartItems.find((item) => item.id === editingItemId)
        : undefined;
      const snapshot = createCartSnapshot({
        id: editingItemId ?? crypto.randomUUID(),
        configuration,
        design: selectedDesign,
        product: selectedProduct,
        createdAt: existing?.createdAt ?? new Date().toISOString(),
      });
      const persisted = await upsertPersistentCartItem(snapshot);
      persistCart(upsertCartItem(cartItems, persisted ?? snapshot));
      closeConfigurator();
      setCartOpen(true);
    } finally {
      setCartPending(false);
    }
  }

  function editCartItem(item: CartConfigurationSnapshot) {
    setCartOpen(false);
    setSelectedDesignId(item.configuration.designId);
    setConfiguration(item.configuration);
    setEditingItemId(item.id);
  }

  function removeCartItem(itemId: string) {
    persistCart(cartItems.filter((item) => item.id !== itemId));
    void removePersistentCartItem(itemId);
  }

  return (
    <div className={styles.shop}>
      <header className={styles.hero}>
        <p className={styles.eyebrow}>The PrintMe edit · Sprint 1 preview</p>
        <div className={styles.heroRow}>
          <div>
            <h1>Art worth living with.</h1>
            <p className={styles.heroCopy}>
              Five curated starting points, paired with a product that suits the work.
            </p>
          </div>
          <button
            type="button"
            className={styles.cartButton}
            onClick={() => setCartOpen(true)}
            aria-label={`Open cart with ${cartItems.length} items`}
            data-testid="open-cart"
          >
            Bag <span>{cartItems.length}</span>
          </button>
        </div>
      </header>

      <main className={styles.catalog}>
        <div className={styles.sectionHeading}>
          <h2>Curated designs</h2>
          <p>Choose a piece to see its recommended format.</p>
        </div>
        <div className={styles.designGrid}>
          {designs.map((design, index) => (
            <article className={styles.designCard} key={design.id}>
              <button
                type="button"
                onClick={() => openDesign(design)}
                data-testid={`open-design-${design.id}`}
                aria-label={`Configure ${design.title}`}
              >
                <span className={styles.cardImage}>
                  <Image
                    src={design.asset.url}
                    alt={design.asset.alt}
                    width={design.asset.width}
                    height={design.asset.height}
                    sizes="(max-width: 600px) 46vw, (max-width: 1000px) 31vw, 260px"
                    priority={index < 2}
                  />
                  <span className={styles.cardIndex}>
                    {String(index + 1).padStart(2, '0')}
                  </span>
                </span>
                <span className={styles.cardMeta}>
                  <span>
                    <strong>{design.title}</strong>
                    <small>{design.collection}</small>
                  </span>
                  <span aria-hidden="true">↗</span>
                </span>
              </button>
            </article>
          ))}
        </div>
      </main>

      {selectedDesign && configuration && selectedProduct && (
        <div className={styles.backdrop} onMouseDown={closeConfigurator}>
          <section
            className={styles.configurator}
            role="dialog"
            aria-modal="true"
            aria-labelledby="configurator-title"
            onMouseDown={(event) => event.stopPropagation()}
            data-testid="configurator"
          >
            <div className={styles.sheetHandle} aria-hidden="true" />
            <button
              type="button"
              className={styles.closeButton}
              onClick={closeConfigurator}
              aria-label="Close configurator"
            >
              ×
            </button>
            <div className={styles.previewColumn}>
              <InstantPreview
                design={selectedDesign.asset}
                configuration={configuration}
              />
            </div>
            <div className={styles.configColumn}>
              <div className={styles.configScroll}>
                <p className={styles.eyebrow}>{selectedDesign.collection}</p>
                <h2 id="configurator-title">{selectedDesign.title}</h2>
                <p className={styles.designDescription}>
                  {selectedDesign.description}
                </p>

                <fieldset className={styles.controlGroup}>
                  <legend>Choose a product</legend>
                  <div className={styles.productSwitcher}>
                    {products.map((product) => (
                      <button
                        type="button"
                        key={product.id}
                        className={
                          product.id === selectedProduct.id
                            ? styles.selectedControl
                            : ''
                        }
                        onClick={() => switchProduct(product)}
                        data-testid={`product-switch-${product.id}`}
                        aria-pressed={product.id === selectedProduct.id}
                      >
                        <strong>{product.name}</strong>
                        <span>
                          from {formatPrice(product.variants[0].unitPrice)}
                        </span>
                      </button>
                    ))}
                  </div>
                </fieldset>

                <div className={styles.selectionSummary}>
                  <div>
                    <span>Product</span>
                    <strong>{selectedProduct.name}</strong>
                  </div>
                  <div>
                    <span>Color</span>
                    <strong>{configuration.selectedColor ?? 'Natural'}</strong>
                  </div>
                  <div>
                    <span>Size</span>
                    <strong>{configuration.selectedSize ?? 'Standard'}</strong>
                  </div>
                </div>

                <fieldset className={styles.controlGroup}>
                  <legend>Format</legend>
                  <div className={styles.variantList}>
                    {selectedProduct.variants
                      .filter((variant) => variant.available)
                      .map((variant) => (
                        <button
                          type="button"
                          key={variant.id}
                          className={
                            variant.printifyVariantId ===
                            configuration.printifyVariantId
                              ? styles.selectedControl
                              : ''
                          }
                          onClick={() => selectVariant(variant)}
                          aria-pressed={
                            variant.printifyVariantId ===
                            configuration.printifyVariantId
                          }
                        >
                          {variant.title}
                        </button>
                      ))}
                  </div>
                </fieldset>

                <div className={styles.placementNote}>
                  <span>Placement</span>
                  <strong>
                    {configuration.printPosition} ·{' '}
                    {configuration.decorationMethod}
                  </strong>
                  <small>
                    Center {configuration.normalizedX.toFixed(2)} /{' '}
                    {configuration.normalizedY.toFixed(2)} · Scale{' '}
                    {configuration.normalizedScale.toFixed(2)} · Angle{' '}
                    {configuration.angle}°
                  </small>
                </div>
              </div>

              <footer className={styles.configFooter}>
                <div>
                  <span>Current price</span>
                  <strong data-testid="current-price">
                    {formatPrice(configuration.unitPrice, configuration.currency)}
                  </strong>
                </div>
                <button
                  type="button"
                  className={styles.primaryButton}
                  onClick={addToCart}
                  data-testid="add-to-cart"
                  disabled={cartPending}
                >
                  {cartPending
                    ? 'Saving...'
                    : editingItemId
                      ? 'Save changes'
                      : 'Add to bag'}
                </button>
              </footer>
            </div>
          </section>
        </div>
      )}

      {cartOpen && (
        <div className={styles.backdrop} onMouseDown={() => setCartOpen(false)}>
          <aside
            className={styles.cartDrawer}
            role="dialog"
            aria-modal="true"
            aria-labelledby="cart-title"
            onMouseDown={(event) => event.stopPropagation()}
            data-testid="cart-drawer"
          >
            <header className={styles.cartHeader}>
              <div>
                <p className={styles.eyebrow}>Your exact configurations</p>
                <h2 id="cart-title">Bag</h2>
              </div>
              <button
                type="button"
                className={styles.closeButton}
                onClick={() => setCartOpen(false)}
                aria-label="Close cart"
              >
                ×
              </button>
            </header>

            <div className={styles.cartItems}>
              {cartItems.length === 0 ? (
                <div className={styles.emptyCart}>
                  <p>Your bag is ready for something personal.</p>
                  <button type="button" onClick={() => setCartOpen(false)}>
                    Browse designs
                  </button>
                </div>
              ) : (
                cartItems.map((item) => {
                  const design = findById(
                    designs,
                    item.configuration.designId,
                    'cart design'
                  );
                  return (
                    <article
                      className={styles.cartItem}
                      key={item.id}
                      data-testid="cart-item"
                      data-render-key={item.configuration.instantPreview.renderKey}
                    >
                      <InstantPreview
                        design={design.asset}
                        configuration={item.configuration}
                        showSafeZone={false}
                        compact
                      />
                      <div className={styles.cartItemDetails}>
                        <div className={styles.cartItemTitle}>
                          <div>
                            <strong>{item.designTitle}</strong>
                            <span>{item.productTitle}</span>
                          </div>
                          <strong>
                            {formatPrice(
                              item.configuration.unitPrice,
                              item.configuration.currency
                            )}
                          </strong>
                        </div>
                        <dl>
                          <div>
                            <dt>Color</dt>
                            <dd>{item.configuration.selectedColor ?? 'Natural'}</dd>
                          </div>
                          <div>
                            <dt>Size</dt>
                            <dd>{item.configuration.selectedSize ?? 'Standard'}</dd>
                          </div>
                          <div>
                            <dt>Qty</dt>
                            <dd>{item.quantity}</dd>
                          </div>
                        </dl>
                        <p className={styles.cartPlacement}>
                          {item.configuration.printPosition} ·{' '}
                          {item.configuration.decorationMethod} · x{' '}
                          {item.configuration.normalizedX.toFixed(2)} · y{' '}
                          {item.configuration.normalizedY.toFixed(2)} · scale{' '}
                          {item.configuration.normalizedScale.toFixed(2)} ·{' '}
                          {item.configuration.angle}°
                        </p>
                        <div className={styles.cartActions}>
                          <button
                            type="button"
                            onClick={() => editCartItem(item)}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => removeCartItem(item.id)}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })
              )}
            </div>

            <footer className={styles.cartFooter}>
              <span>Subtotal</span>
              <strong>{formatPrice(cartTotal)}</strong>
              <small>
                Resilient cart · checkout is intentionally disabled
              </small>
            </footer>
          </aside>
        </div>
      )}
    </div>
  );
}
