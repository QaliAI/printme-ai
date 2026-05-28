'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/Button';
import { Container } from '@/components/Container';
import { Card, CardBody, CardHeader } from '@/components/Card';
import { supabase } from '@/lib/supabase';

interface CartItem {
  id: string;
  quantity: number;
  product_variant_id: string;
  design_id: string;
  product?: any;
  variant?: any;
  design?: any;
}

interface CartData {
  id: string;
  user_id: string;
  created_at: string;
  cart_items: CartItem[];
}

export default function CartPage() {
  const router = useRouter();
  const [cart, setCart] = useState<CartData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    fetchCart();
  }, []);

  const fetchCart = async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('carts')
        .select(
          `
          id,
          user_id,
          created_at,
          cart_items (
            id,
            quantity,
            product_variant_id,
            design_id,
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
              design_url
            )
          )
        `
        )
        .limit(1)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError;
      }

      setCart(data || null);
    } catch (err) {
      console.error('Error fetching cart:', err);
      setError('Failed to load cart');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateQuantity = async (itemId: string, quantity: number) => {
    if (quantity < 1) return;

    setUpdating(itemId);
    try {
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
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cartId: cart.id }),
      });

      if (!response.ok) {
        throw new Error('Failed to create checkout session');
      }

      const { sessionId, redirectUrl } = await response.json();

      // Redirect to Stripe Checkout if available, otherwise to confirmation page
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
      <Container size="lg" className="py-12">
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full border-4 border-gray-300 border-t-blue-600 w-12 h-12"></div>
        </div>
      </Container>
    );
  }

  const isEmpty = !cart || cart.cart_items.length === 0;

  if (isEmpty) {
    return (
      <Container size="lg" className="py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Shopping Cart</h1>
          <p className="text-lg text-gray-600">Your cart is empty</p>
        </div>

        <Card className="mb-8">
          <CardBody className="text-center py-12">
            <p className="text-gray-600 mb-6">Ready to create something amazing?</p>
            <Link href="/app">
              <Button>Start Creating</Button>
            </Link>
          </CardBody>
        </Card>
      </Container>
    );
  }

  // Calculate totals
  const cartTotal = cart.cart_items.reduce((sum, item) => {
    const product = (item.product_variant as any)?.product;
    const variant = item.product_variant as any;
    const basePrice = product?.base_price || 0;
    const modifier = variant?.price_modifier || 0;
    const itemPrice = basePrice + modifier;
    return sum + itemPrice * item.quantity;
  }, 0);

  return (
    <Container size="lg" className="py-12">
      <div className="mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Shopping Cart</h1>
        <p className="text-lg text-gray-600">{cart.cart_items.length} item(s)</p>
      </div>

      {error && (
        <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Cart Items */}
        <div className="lg:col-span-2 space-y-4">
          {cart.cart_items.map((item) => {
            const product = (item.product_variant as any)?.product;
            const variant = item.product_variant as any;
            const design = item.design as any;
            const basePrice = product?.base_price || 0;
            const modifier = variant?.price_modifier || 0;
            const itemPrice = basePrice + modifier;

            return (
              <Card key={item.id}>
                <CardBody className="p-4">
                  <div className="flex gap-4">
                    {/* Item Preview */}
                    <div className="w-24 h-24 flex-shrink-0 bg-gray-100 rounded-lg overflow-hidden">
                      {design?.design_url ? (
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
                    </div>

                    {/* Item Details */}
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-1">{product?.name}</h3>
                      <p className="text-sm text-gray-600 mb-2">
                        {variant?.size && variant?.color
                          ? `${variant.size}, ${variant.color}`
                          : variant?.size || variant?.color}
                      </p>
                      <p className="font-semibold text-gray-900 text-lg">
                        ${(itemPrice * item.quantity).toFixed(2)}
                      </p>
                    </div>

                    {/* Quantity and Remove */}
                    <div className="flex flex-col items-end gap-2">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                          disabled={updating === item.id}
                          className="px-2 py-1 border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50"
                        >
                          −
                        </button>
                        <span className="w-8 text-center font-semibold">{item.quantity}</span>
                        <button
                          onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                          disabled={updating === item.id}
                          className="px-2 py-1 border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50"
                        >
                          +
                        </button>
                      </div>
                      <button
                        onClick={() => handleRemoveItem(item.id)}
                        disabled={updating === item.id}
                        className="text-sm text-red-600 hover:text-red-700 disabled:opacity-50"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </CardBody>
              </Card>
            );
          })}
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <Card className="sticky top-4">
            <CardHeader>
              <h3 className="font-semibold text-gray-900">Order Summary</h3>
            </CardHeader>
            <CardBody className="space-y-4">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span>${cartTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Shipping</span>
                <span className="text-gray-500">Calculated at checkout</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Tax</span>
                <span className="text-gray-500">Calculated at checkout</span>
              </div>

              <div className="border-t pt-4 flex justify-between">
                <span className="font-semibold text-gray-900">Total</span>
                <span className="font-semibold text-gray-900 text-lg">
                  ${cartTotal.toFixed(2)}
                </span>
              </div>

              <Button onClick={handleCheckout} className="w-full">
                Proceed to Checkout
              </Button>

              <Link href="/app">
                <Button variant="outline" className="w-full">
                  Continue Shopping
                </Button>
              </Link>
            </CardBody>
          </Card>
        </div>
      </div>
    </Container>
  );
}
