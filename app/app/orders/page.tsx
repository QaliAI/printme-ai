'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Container } from '@/components/Container';
import { Card, CardBody, CardHeader } from '@/components/Card';
import { Button } from '@/components/Button';
import { supabase } from '@/lib/supabase';

interface OrderItem {
  id: string;
  quantity: number;
  product_variant?: any;
}

interface Order {
  id: string;
  order_number: string;
  created_at: string;
  total_amount: number;
  status: string;
  fulfillment_status?: string;
  shipping_address?: any;
  order_items: OrderItem[];
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('orders')
        .select(
          `
          id,
          order_number,
          created_at,
          total_amount,
          status,
          fulfillment_status,
          shipping_address,
          order_items (
            id,
            quantity,
            product_variant:product_variants(
              id,
              size,
              color,
              product:products(
                id,
                name,
                emoji
              )
            )
          )
        `
        )
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setOrders(data || []);
    } catch (err) {
      console.error('Error fetching orders:', err);
      setError('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return 'bg-yellow-50 border-yellow-200';
      case 'completed':
      case 'shipped':
        return 'bg-green-50 border-green-200';
      case 'cancelled':
        return 'bg-red-50 border-red-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return 'text-yellow-700 bg-yellow-100';
      case 'completed':
      case 'shipped':
        return 'text-green-700 bg-green-100';
      case 'cancelled':
        return 'text-red-700 bg-red-100';
      default:
        return 'text-gray-700 bg-gray-100';
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

  return (
    <Container size="lg" className="py-12">
      <div className="mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">My Orders</h1>
        <p className="text-lg text-gray-600">
          {orders.length === 0 ? 'No orders yet' : `${orders.length} order${orders.length !== 1 ? 's' : ''}`}
        </p>
      </div>

      {error && (
        <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {orders.length === 0 ? (
        <Card>
          <CardBody className="text-center py-12">
            <p className="text-gray-600 mb-6">You haven't placed any orders yet.</p>
            <Link href="/app">
              <Button>Start Creating</Button>
            </Link>
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-6">
          {orders.map((order) => (
            <Card key={order.id} className={`border ${getStatusColor(order.status)}`}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900">Order {order.order_number}</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      {new Date(order.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusBadgeColor(order.status)}`}>
                    {order.status}
                  </span>
                </div>
              </CardHeader>

              <CardBody>
                <div className="mb-4">
                  {order.order_items.map((item) => {
                    const product = (item.product_variant as any)?.product;
                    const variant = item.product_variant as any;
                    return (
                      <div key={item.id} className="flex justify-between text-sm py-2">
                        <div>
                          <p className="font-medium text-gray-900">{product?.name}</p>
                          <p className="text-gray-600">
                            {variant?.size && variant?.color
                              ? `${variant.size}, ${variant.color}`
                              : variant?.size || variant?.color}
                            × {item.quantity}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="border-t pt-4 flex justify-between items-center">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Total Amount</p>
                    <p className="font-semibold text-lg text-gray-900">
                      ${(order.total_amount / 100).toFixed(2)}
                    </p>
                  </div>
                  {order.fulfillment_status && (
                    <div className="text-right">
                      <p className="text-sm text-gray-600 mb-1">Fulfillment</p>
                      <p className="font-semibold text-gray-900 capitalize">
                        {order.fulfillment_status}
                      </p>
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-4 border-t flex gap-2">
                  <Button variant="outline" className="flex-1">
                    View Details
                  </Button>
                  {order.status.toLowerCase() === 'pending' && (
                    <Button variant="outline" className="flex-1">
                      Cancel Order
                    </Button>
                  )}
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </Container>
  );
}
