'use client';

import Image from 'next/image';
import { useEffect, useMemo, useRef, useState } from 'react';
import { PersistedInstantPreview } from '@/components/commerce/PersistedInstantPreview';
import { trackCommerceEvent } from '@/lib/commerce/analytics-events';
import {
  createCartSnapshot,
  readLocalCart,
  upsertCartItem,
  writeLocalCart,
} from '@/lib/commerce/local-cart';
import {
  changeProductVariantConfiguration,
  createProductConfiguration,
} from '@/lib/commerce/placement';
import {
  readPersistentCart,
  removePersistentCartItem,
  upsertPersistentCartItem,
} from '@/lib/commerce/persistent-cart-client';
import { getPreviewTemplate } from '@/lib/commerce/templates';
import {
  getSameDesignUpsells,
  type SameDesignUpsell,
} from '@/lib/commerce/upsells';
import {
  assertDesignProductCompatible,
  getRecommendedProduct,
  isDesignProductCompatible,
} from '@/lib/commerce/designs/rules';
import type { CuratedDesignRecord } from '@/lib/commerce/designs/models';
import type {
  CartConfigurationSnapshot,
  MerchProduct,
  ProductConfiguration,
  ProductVariant,
} from '@/lib/commerce/types';
import styles from './shop-v2.module.css';

interface ShopV2ExperienceProps {
  designs: CuratedDesignRecord[];
  products: MerchProduct[];
  initialDesignSlug?: string;
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

function designFromConfiguration(
  configuration: ProductConfiguration,
  productIds: string[],
): CuratedDesignRecord | null {
  if (
    !configuration.designAssetWidth ||
    !configuration.designAssetHeight
  ) {
    return null;
  }

  return {
    id: configuration.designId,
    slug: configuration.designId,
    title: 'Your design',
    description: 'Customer-provided artwork prepared in PrintMe Create.',
    collection: 'Your uploads',
    asset: {
      id: configuration.designAssetId ?? configuration.designId,
      version: configuration.designVersionId ?? configuration.designVersion,
      url: configuration.designAssetUrl,
      productionUrl: configuration.productionAssetUrl,
      alt: configuration.designAssetAlt ?? 'Customer-provided artwork',
      width: configuration.designAssetWidth,
      height: configuration.designAssetHeight,
      mimeType: configuration.designAssetMimeType ?? 'image/png',
      hasTransparency:
        configuration.designAssetHasTransparency ?? false,
      sourceType: configuration.designSourceType,
      productionAssetId: configuration.productionAssetId,
      derivativeId: configuration.designDerivativeId,
      storageKey: configuration.designAssetStorageKey,
    },
    artistOrSource: 'Customer upload',
    rightsStatus: 'customer-provided',
    publicationStatus: 'draft',
    publicationDate: null,
    tags: [],
    recommendedProductId: configuration.merchProductId,
    defaultProductColor: configuration.selectedColor,
    defaultPlacement: {
      position: configuration.printPosition,
      decorationMethod: configuration.decorationMethod,
      normalizedX: configuration.normalizedX,
      normalizedY: configuration.normalizedY,
      normalizedScale: configuration.normalizedScale,
      angle: configuration.angle,
      fit: 'contain',
    },
    compatibleProductIds: productIds,
    incompatibleProductIds: [],
    merchandisingPriority: 0,
    seoTitle: 'Your design',
    seoDescription: 'Customer-provided artwork.',
    filters: [],
  };
}

export function ShopV2Experience({
  designs,
  products,
  initialDesignSlug,
}: ShopV2ExperienceProps) {
  const [selectedDesignId, setSelectedDesignId] = useState<string | null>(null);
  const [configuration, setConfiguration] =
    useState<ProductConfiguration | null>(null);
  const [cartItems, setCartItems] = useState<CartConfigurationSnapshot[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [cartPending, setCartPending] = useState(false);
  const [upsellPendingId, setUpsellPendingId] = useState<string | null>(
    null,
  );
  const [checkoutPending, setCheckoutPending] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const deepLinkOpened = useRef(false);
  const viewedUpsellsRef = useRef(new Set<string>());
  const configuratorRef = useRef<HTMLElement>(null);
  const cartDialogRef = useRef<HTMLElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (deepLinkOpened.current) return;
    const design = designs.find(
      (candidate) => candidate.slug === initialDesignSlug,
    );
    if (!design) return;
    deepLinkOpened.current = true;
    openDesign(design);
  }, [designs, initialDesignSlug]);

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
    const dialog = cartOpen
      ? cartDialogRef.current
      : selectedDesignId
        ? configuratorRef.current
        : null;

    if (!dialog) {
      previousFocusRef.current?.focus();
      previousFocusRef.current = null;
      return;
    }

    if (!previousFocusRef.current) {
      previousFocusRef.current =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null;
    }

    const focusableSelector =
      'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';
    const focusable = Array.from(
      dialog.querySelectorAll<HTMLElement>(focusableSelector)
    );
    (focusable[0] ?? dialog).focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (cartOpen) setCartOpen(false);
        else setSelectedDesignId(null);
        return;
      }
      if (event.key !== 'Tab' || focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [cartOpen, selectedDesignId]);

  const selectedDesign = selectedDesignId
    ? designs.find((design) => design.id === selectedDesignId) ??
      (configuration
        ? designFromConfiguration(
            configuration,
            products.map((product) => product.id),
          )
        : null)
    : null;
  const selectedProduct = configuration
    ? findById(products, configuration.merchProductId, 'product')
    : null;
  const compatibleProducts = selectedDesign
    ? products.filter((product) =>
        isDesignProductCompatible(selectedDesign, product.id)
      )
    : products;
  const cartTotal = useMemo(
    () =>
      cartItems.reduce(
        (total, item) =>
          total + item.configuration.unitPrice * item.quantity,
        0
      ),
    [cartItems]
  );
  const cartUpsells = useMemo(
    () =>
      cartItems.flatMap((sourceItem) => {
        const design = designs.find(
          (candidate) =>
            candidate.id === sourceItem.configuration.designId,
        );
        return getSameDesignUpsells({
          sourceItem,
          cartItems,
          products,
          compatibleProductIds: design?.compatibleProductIds,
        });
      }),
    [cartItems, designs, products],
  );

  useEffect(() => {
    for (const upsell of cartUpsells) {
      const key = `${upsell.sourceItemId}:${upsell.product.id}`;
      if (viewedUpsellsRef.current.has(key)) continue;
      viewedUpsellsRef.current.add(key);
      trackCommerceEvent('upsell_viewed', {
        sourceItemId: upsell.sourceItemId,
        productId: upsell.product.id,
      });
    }
  }, [cartUpsells]);

  function openDesign(design: CuratedDesignRecord) {
    const product = getRecommendedProduct(design, products);
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
    trackCommerceEvent('design_view', { designId: design.id });
    trackCommerceEvent('design_selected', { designId: design.id });
  }

  function switchProduct(product: MerchProduct) {
    if (!selectedDesign || !configuration) return;
    assertDesignProductCompatible(selectedDesign, product.id);
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
    trackCommerceEvent('product_changed', {
      designId: selectedDesign.id,
      productId: product.id,
    });
  }

  function selectVariant(variant: ProductVariant) {
    if (!configuration || !selectedDesign || !selectedProduct) return;
    setConfiguration(
      changeProductVariantConfiguration({
        configuration,
        design: selectedDesign.asset,
        product: selectedProduct,
        variant,
      }).configuration,
    );
    trackCommerceEvent('variant_changed', {
      productId: selectedProduct.id,
      variantId: variant.id,
    });
  }

  function closeConfigurator() {
    setSelectedDesignId(null);
    setConfiguration(null);
    setEditingItemId(null);
  }

  function persistCart(nextItems: CartConfigurationSnapshot[]) {
    writeLocalCart(window.localStorage, nextItems);
    window.sessionStorage.removeItem('printme:checkout:idempotency');
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
      trackCommerceEvent('add_to_cart', {
        designId: selectedDesign.id,
        productId: selectedProduct.id,
        variantId:
          selectedProduct.variants.find(
            (variant) =>
              variant.printifyVariantId ===
              configuration.printifyVariantId,
          )?.id ?? 'unknown',
        quantity: snapshot.quantity,
      });
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

  async function changeQuantity(
    item: CartConfigurationSnapshot,
    delta: number,
  ) {
    const quantity = Math.min(10, Math.max(1, item.quantity + delta));
    if (quantity === item.quantity) return;
    const next = { ...item, quantity };
    persistCart(upsertCartItem(cartItems, next));
    const persisted = await upsertPersistentCartItem(next);
    if (persisted) {
      setCartItems((current) => {
        const merged = upsertCartItem(current, persisted);
        writeLocalCart(window.localStorage, merged);
        return merged;
      });
    }
  }

  async function addUpsell(upsell: SameDesignUpsell) {
    const sourceItem = cartItems.find(
      (item) => item.id === upsell.sourceItemId,
    );
    if (!sourceItem) return;
    setUpsellPendingId(upsell.product.id);
    try {
      const sourceDesign =
        designs.find(
          (design) => design.id === sourceItem.configuration.designId,
        ) ??
        designFromConfiguration(
          sourceItem.configuration,
          products.map((product) => product.id),
        );
      if (!sourceDesign) return;
      const snapshot = createCartSnapshot({
        id: crypto.randomUUID(),
        configuration: upsell.configuration,
        design: {
          ...sourceDesign,
          title: sourceItem.designTitle,
          asset: upsell.design,
        },
        product: upsell.product,
        createdAt: new Date().toISOString(),
      });
      const persisted = await upsertPersistentCartItem(snapshot);
      persistCart(upsertCartItem(cartItems, persisted ?? snapshot));
      trackCommerceEvent('upsell_added', {
        sourceItemId: upsell.sourceItemId,
        productId: upsell.product.id,
        designVersion: upsell.design.version,
      });
    } finally {
      setUpsellPendingId(null);
    }
  }

  async function beginCheckout() {
    trackCommerceEvent('begin_checkout', {
      itemCount: cartItems.reduce(
        (total, item) => total + item.quantity,
        0,
      ),
      subtotal: cartTotal,
    });
    setCheckoutPending(true);
    setCheckoutError(null);
    try {
      const storageKey = 'printme:checkout:idempotency';
      const idempotencyKey =
        window.sessionStorage.getItem(storageKey) ?? crypto.randomUUID();
      window.sessionStorage.setItem(storageKey, idempotencyKey);
      const response = await fetch('/api/commerce/checkout', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ idempotencyKey }),
      });
      const payload = (await response.json()) as {
        redirectUrl?: string;
        error?: string;
      };
      if (
        !response.ok ||
        !payload.redirectUrl?.startsWith('https://checkout.stripe.com/')
      ) {
        throw new Error(
          payload.error ?? 'Test checkout is not available yet.',
        );
      }
      window.location.assign(payload.redirectUrl);
    } catch (error) {
      setCheckoutError(
        error instanceof Error
          ? error.message
          : 'Test checkout is not available yet.',
      );
      setCheckoutPending(false);
    }
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
            ref={configuratorRef}
            className={styles.configurator}
            role="dialog"
            aria-modal="true"
            aria-labelledby="configurator-title"
            tabIndex={-1}
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
              <PersistedInstantPreview
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
                    {compatibleProducts.map((product) => (
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
            ref={cartDialogRef}
            className={styles.cartDrawer}
            role="dialog"
            aria-modal="true"
            aria-labelledby="cart-title"
            tabIndex={-1}
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
                  const design =
                    designs.find(
                      (candidate) =>
                        candidate.id === item.configuration.designId,
                    ) ??
                    designFromConfiguration(
                      item.configuration,
                      products.map((product) => product.id),
                    );
                  return (
                    <article
                      className={styles.cartItem}
                      key={item.id}
                      data-testid="cart-item"
                      data-render-key={item.configuration.instantPreview.renderKey}
                    >
                      {design ? (
                        <PersistedInstantPreview
                          design={design.asset}
                          configuration={item.configuration}
                          showSafeZone={false}
                          compact
                        />
                      ) : (
                        <div role="img" aria-label="Preview unavailable">
                          Preview unavailable for this legacy item
                        </div>
                      )}
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
                            <dd className={styles.quantityControl}>
                              <button
                                type="button"
                                onClick={() => void changeQuantity(item, -1)}
                                disabled={item.quantity <= 1}
                                aria-label={`Decrease quantity for ${item.productTitle}`}
                              >
                                −
                              </button>
                              <span data-testid="cart-item-quantity">
                                {item.quantity}
                              </span>
                              <button
                                type="button"
                                onClick={() => void changeQuantity(item, 1)}
                                disabled={item.quantity >= 10}
                                aria-label={`Increase quantity for ${item.productTitle}`}
                              >
                                +
                              </button>
                            </dd>
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
              {cartItems.length > 0 && cartUpsells.length === 0 && (
                <section
                  className={styles.upsellUnavailable}
                  data-testid="upsell-unavailable"
                >
                  <strong>Matching products are paused</strong>
                  <p>
                    Recommendations unlock after provider cost and shipping
                    data are synchronized, so every offer stays margin-safe.
                  </p>
                </section>
              )}
              {cartUpsells.length > 0 && (
                <section
                  className={styles.upsellSection}
                  aria-labelledby="matching-products-title"
                  data-testid="same-design-upsells"
                >
                  <div className={styles.upsellHeading}>
                    <p className={styles.eyebrow}>Keep the same artwork</p>
                    <h3 id="matching-products-title">Make it a set</h3>
                  </div>
                  <div className={styles.upsellGrid}>
                    {cartUpsells.map((upsell) => (
                      <article
                        className={styles.upsellCard}
                        key={`${upsell.sourceItemId}:${upsell.product.id}`}
                      >
                        <PersistedInstantPreview
                          design={upsell.design}
                          configuration={upsell.configuration}
                          showSafeZone={false}
                          compact
                        />
                        <div>
                          <strong>{upsell.product.name}</strong>
                          <span>
                            {formatPrice(
                              upsell.configuration.unitPrice,
                              upsell.configuration.currency,
                            )}
                          </span>
                          <button
                            type="button"
                            onClick={() => void addUpsell(upsell)}
                            disabled={upsellPendingId === upsell.product.id}
                            data-testid={`add-upsell-${upsell.product.id}`}
                          >
                            {upsellPendingId === upsell.product.id
                              ? 'Adding…'
                              : 'Add matching product'}
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              )}
            </div>

            <footer className={styles.cartFooter}>
              <span>Subtotal</span>
              <strong>{formatPrice(cartTotal)}</strong>
              {cartItems.length > 0 && (
                <button
                  type="button"
                  className={styles.primaryButton}
                  onClick={beginCheckout}
                  disabled={checkoutPending}
                  data-testid="begin-checkout"
                >
                  {checkoutPending
                    ? 'Opening test checkout...'
                    : 'Secure test checkout'}
                </button>
              )}
              {checkoutError && (
                <small role="alert">{checkoutError}</small>
              )}
              <small>Preview only · Stripe test mode is required</small>
            </footer>
          </aside>
        </div>
      )}
    </div>
  );
}
