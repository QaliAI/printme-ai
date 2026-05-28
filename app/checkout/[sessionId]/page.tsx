'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
  const router = useRouter();
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
              <div className="text-5xl mb-4">✅</div>
              <h1 className="text-3xl font-bold text-gray-900">Order Confirmed!</h1>
              <p className="text-gray-600 mt-2">Thank you for your purchase</p>
            </div>

            <Card className="mb-8 bg-green-50 border-green-200">
              <CardBody>
                <p className="text-sm text-gray-600 mb-2">Order Number:</p>
                <p className="font-mono font-semibold text-gray-900 mb-4">
                  #{order.id.slice(0, 8).toUpperCase()}
                </p>
                <p className="text-sm text-gray-600 mb-2">Order Total:</p>
                <p className="text-xl font-bold text-gray-900 mb-4">
                  ${(order.total_amount / 100).toFixed(2)}
                </p>
                <p className="text-sm text-gray-600">
                  You will receive an email confirmation with order details and shipping information.
                </p>
              </CardBody>
            </Card>

            <div className="space-y-3">
              <Link href="/app/orders">
                <Button className="w-full">View My Orders</Button>
              </Link>
              <Link href="/app">
                <Button variant="outline" className="w-full">
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
