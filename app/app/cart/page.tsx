'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/Button';
import { Container } from '@/components/Container';
import { Card, CardBody, CardHeader } from '@/components/Card';
import { supabase } from '@/lib/supabase';
import {
  CartItemWithRelations,
  GeneratedDesign,
  PrintifyCachedMockup,
  getFirstOrValue,
} from '@/lib/types';
import { blueprintIdForProductName, PRODUCT_PHOTOS } from '@/lib/assets';

/**
 * Pick the best Printify mockup image for a cart item by matching the
 * cart item's product (by name) to a Printify blueprint and finding the
 * default/first mockup in the design's cache.
 */
function getCartItemMockupUrl(item: CartItemWithRelations): string | undefined {
  const productVariant = getFirstOrValue(item.product_variant);
  const product = productVariant?.product;
  const design = getFirstOrValue(item.design) as GeneratedDesign | undefined;

  const blueprintId = blueprintIdForProductName(product?.name);
  if (!blueprintId || !design?.printify_mockups) return undefined;

  const blueprintEntry = (design.printify_mockups as PrintifyCachedMockup[]).find(
    (m) => m.blueprintId === blueprintId
  );
  if (!blueprintEntry?.mockups?.length) return undefined;

  const defaultMockup = blueprintEntry.mockups.find((m) => m.isDefault);
  return defaultMockup?.src || blueprintEntry.mockups[0]?.src;
}

interface CartData {
  id: string;
  user_id: string;
  created_at: string;
  cart_items: CartItemWithRelations[];
}

interface GuestCartItem {
  productId: string;
  variantId: string;
  quantity: number;
  designId: string;
  designUrl?: string;
  originalImageUrl?: string;
  styleId?: string;
}

export default function CartPage() {
  const router = useRouter();
  const [cart, setCart] = useState<CartData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);

  /**
   * Fetch cached Printify mockup data for the given design IDs.
   * Gracefully no-ops if the migration hasn't been applied yet.
   */
  const fetchMockupCache = async (
    designIds: string[]
  ): Promise<Record<string, PrintifyCachedMockup[]>> => {
    if (designIds.length === 0) return {};
    try {
      const { data, error: mockupErr } = await supabase
        .from('generated_designs')
        .select('id, printify_mockups')
        .in('id', designIds);

      if (mockupErr) {
        // Column doesn't exist yet (migration not applied) — silently skip
        console.warn('Mockup cache query failed (likely missing migration):', mockupErr.message);
        return {};
      }

      const byDesignId: Record<string, PrintifyCachedMockup[]> = {};
      for (const row of data || []) {
        if (row.printify_mockups) {
          byDesignId[row.id] = row.printify_mockups as PrintifyCachedMockup[];
        }
      }
      return byDesignId;
    } catch (err) {
      console.warn('Mockup cache fetch failed:', err);
      return {};
    }
  };

  const fetchCart = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        // Guest mode: load cart from localStorage
        const guestCartStr = localStorage.getItem('printme_guest_cart');
        const guestCart = guestCartStr
          ? (JSON.parse(guestCartStr) as GuestCartItem[])
          : [];

        if (guestCart.length === 0) {
          setCart(null);
          setLoading(false);
          return;
        }

        const productIds = guestCart.map((item) => item.productId);
        const variantIds = guestCart.map((item) => item.variantId);

        const { data: products } = await supabase.from('products').select('*').in('id', productIds);
        const { data: variants } = await supabase.from('product_variants').select('*').in('id', variantIds);

        const itemsMapped = guestCart.map((guestItem) => {
          const variant = variants?.find(v => v.id === guestItem.variantId);
          const product = products?.find(p => p.id === guestItem.productId);

          return {
            id: `${guestItem.variantId}-${guestItem.designId}`, // temporary ID
            cart_id: 'guest',
            quantity: guestItem.quantity,
            product_id: guestItem.productId,
            product_variant_id: guestItem.variantId,
            design_id: guestItem.designId,
            unit_price: product && variant ? (Number(product.base_price) + Number(variant.price_modifier)) : 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            product_variant: variant ? {
              ...variant,
              product: product || null
            } : null,
            design: {
              id: guestItem.designId,
              design_url: guestItem.designUrl,
              original_image_url: guestItem.originalImageUrl,
              style_preset_id: guestItem.styleId,
              status: 'completed',
            }
          };
        });

        setCart({
          id: 'guest',
          user_id: 'guest',
          created_at: new Date().toISOString(),
          cart_items: itemsMapped as unknown as CartItemWithRelations[]
        });
        setLoading(false);
        return;
      }

      const { data, error: fetchError } = await supabase
        .from('carts')
        .select(
          `
          id,
          user_id,
          created_at,
          cart_items (
            id,
            cart_id,
            quantity,
            product_id,
            product_variant_id,
            design_id,
            unit_price,
            created_at,
            updated_at,
            product_variant:product_variants(
              id,
              product_id,
              size,
              color,
              price_modifier,
              product:products(
                id,
                name,
                base_price,
                emoji,
                mockup_url
              )
            ),
            design:generated_designs(
              id,
              user_id,
              upload_id,
              design_url,
              style_preset_id,
              original_image_url,
              status,
              ai_provider,
              is_approved,
              created_at,
              updated_at
            )
          )
        `
        )
        .limit(1)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError;
      }

      // Hydrate cached Printify mockups onto each cart item's design.
      // Non-blocking: if it fails, the cart still renders with design URLs.
      if (data?.cart_items?.length) {
        const designIds = Array.from(
          new Set(
            data.cart_items
              .map((item: CartItemWithRelations) => {
                const design = getFirstOrValue(item.design);
                return design?.id;
              })
              .filter((id: string | undefined): id is string => !!id)
          )
        );
        const mockupsByDesignId = await fetchMockupCache(designIds);

        // Merge mockup data onto each cart item's design.
        // Cast through unknown because Supabase's inferred type doesn't include
        // the dynamically-added printify_mockups field.
        for (const item of data.cart_items) {
          const design = getFirstOrValue(item.design);
          if (design && mockupsByDesignId[design.id]) {
            const mockups = mockupsByDesignId[design.id];
            if (Array.isArray(item.design)) {
              (item.design[0] as unknown as GeneratedDesign).printify_mockups = mockups;
            } else if (item.design) {
              (item.design as unknown as GeneratedDesign).printify_mockups = mockups;
            }
          }
        }
      }

      setCart(data || null);
    } catch (err) {
      console.error('Error fetching cart:', err);
      setError('Failed to load cart');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Fetching the initial browser-backed cart is the purpose of this effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchCart();
  }, []);

  const handleUpdateQuantity = async (itemId: string, quantity: number) => {
    if (quantity < 1) return;

    setUpdating(itemId);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        // Guest mode: update quantity in localStorage
        const guestCartStr = localStorage.getItem('printme_guest_cart');
        const guestCart = guestCartStr
          ? (JSON.parse(guestCartStr) as GuestCartItem[])
          : [];

        const updatedCart = guestCart.map((item) => {
          const tempId = `${item.variantId}-${item.designId}`;
          if (tempId === itemId) {
            return { ...item, quantity };
          }
          return item;
        });

        localStorage.setItem('printme_guest_cart', JSON.stringify(updatedCart));
        await fetchCart();
        setUpdating(null);
        return;
      }

      const { error: updateError } = await supabase
        .from('cart_items')
        .update({ quantity })
        .eq('id', itemId);

      if (updateError) throw updateError;

      setCart(
        cart
          ? {
              ...cart,
              cart_items: cart.cart_items.map((item) =>
                item.id === itemId ? { ...item, quantity } : item
              ),
            }
          : null
      );
    } catch (err) {
      console.error('Error updating quantity:', err);
      setError('Failed to update quantity');
    } finally {
      setUpdating(null);
    }
  };

  const handleRemoveItem = async (itemId: string) => {
    setUpdating(itemId);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        // Guest mode: remove item from localStorage
        const guestCartStr = localStorage.getItem('printme_guest_cart');
        const guestCart = guestCartStr
          ? (JSON.parse(guestCartStr) as GuestCartItem[])
          : [];

        const updatedCart = guestCart.filter((item) => {
          const tempId = `${item.variantId}-${item.designId}`;
          return tempId !== itemId;
        });

        localStorage.setItem('printme_guest_cart', JSON.stringify(updatedCart));
        await fetchCart();
        setUpdating(null);
        return;
      }

      const { error: deleteError } = await supabase
        .from('cart_items')
        .delete()
        .eq('id', itemId);

      if (deleteError) throw deleteError;

      setCart(
        cart
          ? {
              ...cart,
              cart_items: cart.cart_items.filter((item) => item.id !== itemId),
            }
          : null
      );
    } catch (err) {
      console.error('Error removing item:', err);
      setError('Failed to remove item');
    } finally {
      setUpdating(null);
    }
  };

  const handleCheckout = async () => {
    if (!cart || cart.cart_items.length === 0) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      let body: { guestItems: GuestCartItem[] } | { cartId: string };

      if (!user) {
        // Guest mode: pass guestItems
        const guestCartStr = localStorage.getItem('printme_guest_cart');
        const guestCart = guestCartStr
          ? (JSON.parse(guestCartStr) as GuestCartItem[])
          : [];
        body = { guestItems: guestCart };
      } else {
        body = { cartId: cart.id };
      }

      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error('Failed to create checkout session');
      }

      const { sessionId, redirectUrl } = await response.json();

      // Clear local guest cart on redirect
      if (!user) {
        localStorage.removeItem('printme_guest_cart');
      }

      if (redirectUrl) {
        window.location.href = redirectUrl;
      } else {
        router.push(`/checkout/${sessionId}`);
      }
    } catch (err) {
      console.error('Checkout error:', err);
      setError('Failed to proceed to checkout');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360, scale: [1, 1.1, 1] }}
          transition={{ rotate: { duration: 2, repeat: Infinity, ease: 'linear' }, scale: { duration: 1, repeat: Infinity } }}
          className="text-6xl"
        >
          🛒
        </motion.div>
      </div>
    );
  }

  const isEmpty = !cart || cart.cart_items.length === 0;

  if (isEmpty) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
        <Container size="lg" className="py-12 relative">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-2">
              Your <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Cart</span>
            </h1>
            <p className="text-lg text-gray-600">Time to fill it with magic ✨</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="mb-8 backdrop-blur-xl bg-white/70 border-white/40 shadow-xl">
              <CardBody className="text-center py-16">
                <motion.div
                  animate={{ y: [0, -10, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="text-8xl mb-6"
                >
                  🛒
                </motion.div>
                <p className="text-xl text-gray-700 mb-2 font-semibold">Your cart is empty</p>
                <p className="text-gray-600 mb-6">Ready to create something amazing?</p>
                <Link href="/app">
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="inline-block">
                    <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 px-8">
                      ✨ Start Creating
                    </Button>
                  </motion.div>
                </Link>
              </CardBody>
            </Card>
          </motion.div>
        </Container>
      </div>
    );
  }

  // Calculate totals
  const cartTotal = cart.cart_items.reduce((sum, item) => {
    const productVariant = getFirstOrValue(item.product_variant);
    const product = productVariant?.product;
    const basePrice = product?.base_price || 0;
    const modifier = productVariant?.price_modifier || 0;
    const itemPrice = basePrice + modifier;
    return sum + itemPrice * item.quantity;
  }, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      {/* Background blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute top-0 -left-20 w-96 h-96 bg-blue-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20"
          animate={{ x: [0, 100, 0], y: [0, 50, 0] }}
          transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute bottom-0 right-0 w-96 h-96 bg-pink-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20"
          animate={{ x: [0, -100, 0], y: [0, -100, 0] }}
          transition={{ duration: 25, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      <Container size="lg" className="py-12 relative">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12 text-center"
        >
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-2">
            Your <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Cart</span>
          </h1>
          <p className="text-lg text-gray-600">{cart.cart_items.length} item{cart.cart_items.length !== 1 ? 's' : ''} ready to ship</p>
        </motion.div>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 p-4 bg-red-50 border border-red-200 rounded-lg"
        >
          <p className="text-sm text-red-700">{error}</p>
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Cart Items */}
        <div className="lg:col-span-2 space-y-4">
          <AnimatePresence>
          {cart.cart_items.map((item, i) => {
            const productVariant = getFirstOrValue(item.product_variant);
            const design = getFirstOrValue(item.design);
            const product = productVariant?.product;
            const basePrice = product?.base_price || 0;
            const modifier = productVariant?.price_modifier || 0;
            const itemPrice = basePrice + modifier;

            return (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20, height: 0 }}
                transition={{ delay: i * 0.05 }}
              >
              <Card className="backdrop-blur-xl bg-white/80 border-white/40 shadow-lg hover:shadow-xl transition-shadow">
                <CardBody className="p-4">
                  <div className="flex gap-4">
                    {/* Personalized Printify mockup → design URL → emoji */}
                    {(() => {
                      const mockupUrl = getCartItemMockupUrl(item);
                      const blueprintId = blueprintIdForProductName(product?.name);
                      const photoKey = Object.keys(PRODUCT_PHOTOS).find(
                        (k) => PRODUCT_PHOTOS[k as keyof typeof PRODUCT_PHOTOS].blueprintId === blueprintId
                      ) as keyof typeof PRODUCT_PHOTOS | undefined;
                      const photoData = photoKey ? PRODUCT_PHOTOS[photoKey] : undefined;
                      const isMockup = !!mockupUrl;

                      return (
                        <div className="relative w-24 h-24 flex-shrink-0 bg-slate-100 rounded-lg overflow-hidden ring-1 ring-slate-200 flex items-center justify-center">
                          {isMockup ? (
                            <img
                              src={mockupUrl}
                              alt={product?.name}
                              className="w-full h-full object-cover"
                            />
                          ) : photoData?.image && design?.design_url ? (
                            <div className="relative w-full h-full">
                              <img
                                src={photoData.image}
                                alt={product?.name}
                                className="w-full h-full object-contain"
                              />
                              <div
                                className="absolute pointer-events-none"
                                style={{
                                  top: photoData.designArea.top,
                                  left: photoData.designArea.left,
                                  width: photoData.designArea.width,
                                  height: photoData.designArea.height,
                                }}
                              >
                                <img
                                  src={design.design_url}
                                  alt="Design overlay"
                                  className="w-full h-full object-cover mix-blend-multiply"
                                />
                              </div>
                            </div>
                          ) : design?.design_url ? (
                            <img
                              src={design.design_url}
                              alt={product?.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-2xl">
                              {product?.emoji}
                            </div>
                          )}
                          {isMockup && (
                            <div className="absolute top-1 right-1 bg-emerald-500/95 text-white text-[8px] font-semibold tracking-wider uppercase px-1.5 py-0.5 rounded-full shadow-sm flex items-center gap-1">
                              <span className="w-1 h-1 rounded-full bg-white" />
                              Live
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {/* Item Details */}
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-1">{product?.name}</h3>
                      <p className="text-sm text-gray-600 mb-2">
                        {productVariant?.size && productVariant?.color
                          ? `${productVariant.size}, ${productVariant.color}`
                          : productVariant?.size || productVariant?.color}
                      </p>
                      <p className="font-semibold text-gray-900 text-lg">
                        ${(itemPrice * item.quantity).toFixed(2)}
                      </p>
                    </div>

                    {/* Quantity and Remove */}
                    <div className="flex flex-col items-end justify-between gap-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                          disabled={updating === item.id}
                          className="w-8 h-8 rounded-lg border border-slate-200 hover:bg-slate-50 flex items-center justify-center font-bold text-slate-600 disabled:opacity-50 active:bg-slate-100 transition-colors"
                        >
                          −
                        </button>
                        <span className="w-8 text-center font-bold text-slate-800 text-sm">{item.quantity}</span>
                        <button
                          onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                          disabled={updating === item.id}
                          className="w-8 h-8 rounded-lg border border-slate-200 hover:bg-slate-50 flex items-center justify-center font-bold text-slate-600 disabled:opacity-50 active:bg-slate-100 transition-colors"
                        >
                          +
                        </button>
                      </div>
                      <button
                        onClick={() => handleRemoveItem(item.id)}
                        disabled={updating === item.id}
                        className="text-xs font-semibold text-rose-500 hover:text-rose-600 disabled:opacity-50 transition-colors flex items-center gap-1"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Remove
                      </button>
                    </div>
                  </div>
                </CardBody>
              </Card>
              </motion.div>
            );
          })}
          </AnimatePresence>
        </div>
 
        {/* Order Summary */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-1"
        >
          <Card className="sticky top-4 backdrop-blur-xl bg-white/80 border-white/40 shadow-xl">
            <CardHeader>
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <span className="text-xl">📋</span> Order Summary
              </h3>
            </CardHeader>
            <CardBody className="space-y-4">
              <div className="flex justify-between text-gray-600 text-sm">
                <span>Subtotal</span>
                <span className="font-semibold text-slate-900">${cartTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-600 text-sm">
                <span>Shipping</span>
                <span className="text-gray-500 italic">Calculated at checkout</span>
              </div>
              <div className="flex justify-between text-gray-600 text-sm">
                <span>Tax</span>
                <span className="text-gray-500 italic">Calculated at checkout</span>
              </div>
 
              <div className="bg-slate-50 border border-slate-100 p-3.5 rounded-xl text-[11px] text-slate-500 leading-relaxed font-medium">
                📍 You will enter your shipping address and phone number on the Stripe secure checkout portal.
              </div>
 
              <div className="border-t border-slate-100 pt-4 flex justify-between items-center">
                <span className="font-bold text-gray-900">Estimated Total</span>
                <motion.span
                  key={cartTotal}
                  initial={{ scale: 1.2 }}
                  animate={{ scale: 1 }}
                  className="font-black text-gray-900 text-2xl"
                >
                  ${cartTotal.toFixed(2)}
                </motion.span>
              </div>
 
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button
                  onClick={handleCheckout}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/10"
                >
                  <span>🔒 Secure Checkout</span>
                </Button>
              </motion.div>
 
              <Link href="/app" className="block text-center mt-2">
                <span className="text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors">
                  ← Continue Shopping
                </span>
              </Link>
 
              {/* Trust signals & fulfillment expectations */}
              <div className="border-t border-slate-100 pt-4 space-y-3.5">
                <div className="flex items-start gap-2.5">
                  <span className="text-lg bg-slate-50 p-1.5 rounded-lg border border-slate-100">🛡️</span>
                  <div className="text-[11px] text-slate-500 leading-relaxed font-medium">
                    <p className="font-bold text-slate-800">Secure Stripe Checkout</p>
                    <p>Your payment information is encrypted and processed securely by Stripe.</p>
                  </div>
                </div>
 
                <div className="flex items-start gap-2.5">
                  <span className="text-lg bg-slate-50 p-1.5 rounded-lg border border-slate-100">📦</span>
                  <div className="text-[11px] text-slate-500 leading-relaxed font-medium">
                    <p className="font-bold text-slate-800">Production Time: 2-3 Days</p>
                    <p>Each custom item is made to order with care and dispatched quickly.</p>
                  </div>
                </div>
 
                <div className="flex items-start gap-2.5">
                  <span className="text-lg bg-slate-50 p-1.5 rounded-lg border border-slate-100">✨</span>
                  <div className="text-[11px] text-slate-500 leading-relaxed font-medium">
                    <p className="font-bold text-slate-800">Satisfaction Guarantee</p>
                    <p>If your gift arrives damaged or printed incorrectly, we will replace it immediately.</p>
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>
        </motion.div>
      </div>
      </Container>
    </div>
  );
}
