'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/Button';
import { Card, CardBody } from '@/components/Card';
import { Container } from '@/components/Container';
import { supabase } from '@/lib/supabase';

interface CheckoutPageProps {
  params: {
    sessionId: string;
  };
}

interface Order {
  id: string;
  order_number: string;
  total_amount: number;
  status: string;
  created_at: string;
}

export default function CheckoutPage({ params }: CheckoutPageProps) {
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        // Get order from checkout session
        const { data: checkoutSession } = await supabase
          .from('checkout_sessions')
          .select('order_id, status')
          .eq('stripe_session_id', params.sessionId)
          .single();

        if (!checkoutSession?.order_id) {
          // Payment not yet processed - show waiting state
          setLoading(false);
          return;
        }

        // Fetch order details
        const { data: orderData, error: orderError } = await supabase
          .from('orders')
          .select('*')
          .eq('id', checkoutSession.order_id)
          .single();

        if (orderError || !orderData) {
          setError('Could not find order details');
        } else {
          setOrder(orderData);
        }
      } catch (err) {
        console.error('Error fetching order:', err);
        setError('Failed to load order details');
      } finally {
        setLoading(false);
      }
    };

    // Poll for order completion (webhook may take a moment)
    const timer = setInterval(fetchOrder, 2000);
    fetchOrder();

    return () => clearInterval(timer);
  }, [params.sessionId]);

  return (
    <Container size="lg" className="py-12">
      <div className="max-w-md mx-auto">
        {loading || !order ? (
          <>
            <div className="text-center mb-8">
              <div className="inline-block animate-spin rounded-full border-4 border-gray-300 border-t-blue-600 w-12 h-12 mb-4"></div>
              <h1 className="text-2xl font-bold text-gray-900">Processing Payment</h1>
              <p className="text-gray-600 mt-2">
                {order ? 'Setting up your order...' : 'Please wait while we process your payment...'}
              </p>
            </div>

            {error && (
              <Card className="mb-6 bg-red-50 border-red-200">
                <CardBody>
                  <p className="text-red-600 text-sm">{error}</p>
                </CardBody>
              </Card>
            )}

            <Card>
              <CardBody className="text-center py-8">
                <p className="text-sm text-gray-500 mb-4">
                  Session ID: {params.sessionId}
                </p>
                <p className="text-sm text-gray-600 mb-6">
                  This may take a few moments. You will receive an email confirmation.
                </p>
                <Link href="/app/cart">
                  <Button variant="outline" className="w-full">
                    Back to Cart
                  </Button>
                </Link>
              </CardBody>
            </Card>
          </>
        ) : (
          <>
            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-500 border border-emerald-100 flex items-center justify-center text-3xl mx-auto mb-4 shadow-sm animate-bounce">
                ✓
              </div>
              <h1 className="text-3xl font-extrabold text-gray-900">Order Confirmed!</h1>
              <p className="text-slate-600 mt-2 font-medium">Thank you for shopping with PrintMe.ai</p>
            </div>

            <Card className="mb-8 border-emerald-100 bg-gradient-to-br from-emerald-50/50 to-teal-50/50 shadow-md">
              <CardBody className="p-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Order Number</p>
                    <p className="font-mono font-bold text-slate-900 text-lg">
                      {order.order_number || `PM-${order.id.slice(0, 8).toUpperCase()}`}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Amount Paid</p>
                    <p className="font-extrabold text-slate-900 text-lg">
                      ${(order.total_amount / 100).toFixed(2)}
                    </p>
                  </div>
                </div>
                <div className="border-t border-emerald-200/50 mt-4 pt-4 text-xs text-slate-600 leading-relaxed font-medium">
                  📧 A receipt and order confirmation email has been sent to your inbox. We will keep you updated as your order progresses.
                </div>
              </CardBody>
            </Card>

            {/* Next Steps Timeline */}
            <Card className="mb-8 shadow-md border-white/40 bg-white/70 backdrop-blur-xl">
              <CardBody className="p-6">
                <h3 className="font-bold text-slate-800 text-sm mb-5">📦 What Happens Next?</h3>
                <div className="space-y-6 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                  <div className="flex gap-4 relative">
                    <span className="w-6.5 h-6.5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs font-bold ring-4 ring-white shrink-0">1</span>
                    <div className="text-xs mt-0.5">
                      <p className="font-bold text-slate-800">Design Quality Review</p>
                      <p className="text-slate-500 mt-0.5">Our team does a final resolution and placement check on your AI design (takes 2-4 hours).</p>
                    </div>
                  </div>

                  <div className="flex gap-4 relative">
                    <span className="w-6.5 h-6.5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold ring-4 ring-white shrink-0">2</span>
                    <div className="text-xs mt-0.5">
                      <p className="font-bold text-slate-800">Custom Printing & Packing</p>
                      <p className="text-slate-500 mt-0.5">Your personalized items are individually handcrafted, printed, and packed (takes 2-3 business days).</p>
                    </div>
                  </div>

                  <div className="flex gap-4 relative">
                    <span className="w-6.5 h-6.5 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center text-xs font-bold ring-4 ring-white shrink-0">3</span>
                    <div className="text-xs mt-0.5">
                      <p className="font-bold text-slate-500">Tracked Shipping</p>
                      <p className="text-slate-500 mt-0.5">We ship your package and email you a tracking number to follow it straight to your door.</p>
                    </div>
                  </div>
                </div>
              </CardBody>
            </Card>

            <div className="space-y-3">
              <Link href="/app/orders" className="block w-full">
                <Button className="w-full py-3 rounded-xl font-bold">Track Order Status</Button>
              </Link>
              <Link href="/app" className="block w-full">
                <Button variant="outline" className="w-full py-3 rounded-xl font-bold">
                  Back to Dashboard
                </Button>
              </Link>
            </div>
          </>
        )}
      </div>
    </Container>
  );
}
