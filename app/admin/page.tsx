'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardBody, CardHeader } from '@/components/Card';
import { Button } from '@/components/Button';
import { supabase } from '@/lib/supabase';

interface Stats {
  totalOrders: number;
  totalRevenue: number;
  totalDesigns: number;
  activeUsers: number;
  recentOrders: any[];
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      // Fetch total orders
      const { count: orderCount } = await supabase
        .from('orders')
        .select('id', { count: 'exact' });

      // Fetch total revenue
      const { data: orderData } = await supabase
        .from('orders')
        .select('total_amount');

      const totalRevenue = (orderData || []).reduce((sum, order) => sum + (order.total_amount || 0), 0);

      // Fetch total designs
      const { count: designCount } = await supabase
        .from('generated_designs')
        .select('id', { count: 'exact' });

      // Fetch active users (with uploads in last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: activeUserData } = await supabase
        .from('user_uploads')
        .select('user_id', { distinct: true })
        .gte('created_at', thirtyDaysAgo.toISOString());

      // Fetch recent orders
      const { data: recentOrders } = await supabase
        .from('orders')
        .select(`
          id,
          order_number,
          created_at,
          total_amount,
          status,
          user:profiles(full_name, email)
        `)
        .order('created_at', { ascending: false })
        .limit(5);

      setStats({
        totalOrders: orderCount || 0,
        totalRevenue: totalRevenue / 100, // Convert from cents
        totalDesigns: designCount || 0,
        activeUsers: activeUserData?.length || 0,
        recentOrders: recentOrders || [],
      });
    } catch (err) {
      console.error('Error fetching stats:', err);
      setError('Failed to load dashboard stats');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full border-4 border-gray-300 border-t-blue-600 w-12 h-12"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-sm text-red-700">{error}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Dashboard</h1>
        <p className="text-lg text-gray-600">Overview of PrintMe.ai activity</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardBody className="text-center py-6">
            <p className="text-gray-600 text-sm mb-2">Total Orders</p>
            <p className="text-4xl font-bold text-gray-900">{stats?.totalOrders}</p>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="text-center py-6">
            <p className="text-gray-600 text-sm mb-2">Total Revenue</p>
            <p className="text-4xl font-bold text-gray-900">
              ${(stats?.totalRevenue || 0).toFixed(2)}
            </p>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="text-center py-6">
            <p className="text-gray-600 text-sm mb-2">Total Designs</p>
            <p className="text-4xl font-bold text-gray-900">{stats?.totalDesigns}</p>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="text-center py-6">
            <p className="text-gray-600 text-sm mb-2">Active Users (30d)</p>
            <p className="text-4xl font-bold text-gray-900">{stats?.activeUsers}</p>
          </CardBody>
        </Card>
      </div>

      {/* Recent Orders */}
      <Card>
        <CardHeader className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Recent Orders</h2>
          <Link href="/admin/orders">
            <Button variant="outline" className="text-sm">
              View All
            </Button>
          </Link>
        </CardHeader>

        <CardBody>
          {stats?.recentOrders && stats.recentOrders.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-semibold text-gray-900">Order</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-900">Customer</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-900">Amount</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-900">Status</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-900">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recentOrders.map((order) => (
                    <tr key={order.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4 font-semibold text-gray-900">
                        #{order.order_number}
                      </td>
                      <td className="py-3 px-4 text-gray-600">
                        {(order.user as any)?.full_name || 'Unknown'}
                      </td>
                      <td className="py-3 px-4 font-semibold text-gray-900">
                        ${(order.total_amount / 100).toFixed(2)}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 capitalize">
                          {order.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-600">
                        {new Date(order.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-600 text-center py-8">No orders yet</p>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
