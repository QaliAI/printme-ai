'use client';

import { useEffect, useState } from 'react';
import { Card, CardBody, CardHeader } from '@/components/Card';
import { supabase } from '@/lib/supabase';

interface OrdersListItem {
  id: string;
  order_number: string;
  created_at: string;
  updated_at: string;
  total_amount: number;
  status: string;
  stripe_session_id?: string;
  printify_order_id?: string;
  error_message?: string;
  user?: any;
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<OrdersListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('orders')
        .select(`
          id,
          order_number,
          created_at,
          updated_at,
          total_amount,
          status,
          stripe_session_id,
          printify_order_id,
          error_message,
          user:user_id(full_name, email)
        `)
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

  if (loading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Orders Management</h1>

      <Card>
        <CardBody>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Order</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Customer</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Amount</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Status & Details</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Integration IDs</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Date</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4 font-semibold text-gray-900">
                      #{order.order_number || order.id.slice(0, 8)}
                    </td>
                    <td className="py-3 px-4 text-gray-600">
                      <div className="font-semibold text-gray-900">{(order.user as any)?.full_name || 'Unknown'}</div>
                      <div className="text-xs opacity-75">{(order.user as any)?.email}</div>
                    </td>
                    <td className="py-3 px-4 font-semibold text-gray-900">
                      ${(order.total_amount / 100).toFixed(2)}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-col gap-1">
                        <span className={`inline-block w-fit px-3 py-1 rounded-full text-xs font-medium ${
                          order.status === 'needs_review' || order.status === 'fulfillment_blocked' || order.status === 'failed'
                            ? 'bg-red-100 text-red-700'
                            : order.status === 'submitted_to_printify' || order.status === 'shipped' || order.status === 'delivered' || order.status === 'fulfilled'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-blue-100 text-blue-700'
                        } capitalize`}>
                          {order.status.replace(/_/g, ' ')}
                        </span>
                        {order.error_message && (
                          <span className="text-xs text-red-600 font-medium max-w-md block">
                            ⚠️ {order.error_message}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-xs text-gray-600 font-mono">
                      {order.stripe_session_id && (
                        <div>Stripe: {order.stripe_session_id.slice(0, 16)}...</div>
                      )}
                      {order.printify_order_id && (
                        <div>Printify: {order.printify_order_id}</div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-gray-600 text-xs">
                      <div>Created: {new Date(order.created_at).toLocaleString()}</div>
                      {order.updated_at && order.updated_at !== order.created_at && (
                        <div className="opacity-75">Updated: {new Date(order.updated_at).toLocaleString()}</div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {orders.length === 0 && (
            <div className="text-center py-8 text-gray-600">
              No orders found.
            </div>
          )}
        </CardBody>
      </Card>

      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}
    </div>
  );
}
