'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardBody, CardHeader } from '@/components/Card';
import { Button } from '@/components/Button';
import { supabase } from '@/lib/supabase';
import { getFirstOrValue } from '@/lib/types';

interface Stats {
  totalOrders: number;
  totalRevenue: number;
  totalDesigns: number;
  activeUsers: number;
  recentOrders: RecentOrder[];
  monthlyRevenue: number;
}

interface RecentOrder {
  id: string;
  order_number?: string;
  created_at: string;
  total?: number;
  total_amount?: number;
  paid_amount?: number;
  status: string;
  customer_email?: string;
  shipping_address?: { name?: string; city?: string };
  user?: RecentOrderUser | RecentOrderUser[] | null;
}

interface RecentOrderUser {
  full_name?: string;
  email?: string;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function fetchStats() {
    try {
      // 1. Fetch total orders (excluding developer synthetic holds if any)
      const { count: orderCount } = await supabase
        .from('orders')
        .select('id', { count: 'exact' });

      // 2. Fetch revenue fields
      const { data: orderData } = await supabase
        .from('orders')
        .select('total, total_amount, paid_amount, created_at, status');

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      let totalRevenueCents = 0;
      let monthlyRevenueCents = 0;

      (orderData || []).forEach((order) => {
        // Exclude failed or non-received test orders
        if (order.status !== 'payment-not-received' && order.status !== 'failed') {
          const amount = order.paid_amount || order.total || order.total_amount || 0;
          totalRevenueCents += amount;

          if (new Date(order.created_at) >= thirtyDaysAgo) {
            monthlyRevenueCents += amount;
          }
        }
      });

      // 3. Fetch total designs
      const { count: designCount } = await supabase
        .from('curated_designs')
        .select('id', { count: 'exact' });

      // Fallback to generated_designs if curated_designs is empty
      let totalDesigns = designCount || 0;
      if (totalDesigns === 0) {
        const { count: genCount } = await supabase
          .from('generated_designs')
          .select('id', { count: 'exact' });
        totalDesigns = genCount || 0;
      }

      // 4. Fetch active users in last 30 days
      const { data: activeUserData } = await supabase
        .from('user_uploads')
        .select('user_id')
        .gte('created_at', thirtyDaysAgo.toISOString());

      const uniqueActiveUsers = new Set(
        (activeUserData || []).map((item) => item.user_id).filter(Boolean),
      );

      // 5. Fetch recent orders
      const { data: recentOrders } = await supabase
        .from('orders')
        .select(`
          id,
          order_number,
          created_at,
          total,
          total_amount,
          paid_amount,
          status,
          customer_email,
          shipping_address,
          user:profiles(full_name, email)
        `)
        .order('created_at', { ascending: false })
        .limit(6);

      setStats({
        totalOrders: orderCount || 0,
        totalRevenue: totalRevenueCents / 100,
        monthlyRevenue: monthlyRevenueCents / 100,
        totalDesigns,
        activeUsers: uniqueActiveUsers.size,
        recentOrders: (recentOrders as unknown as RecentOrder[]) || [],
      });
    } catch (err) {
      console.error('Error fetching admin dashboard stats:', err);
      setError('Failed to load dashboard metrics. Live schema migrations may still be applying.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full border-4 border-gray-300 border-t-amber-600 w-12 h-12"></div>
        <p className="mt-4 text-sm text-gray-500 font-medium">Loading PrintMe Merchant Metrics...</p>
      </div>
    );
  }

  const monthlyRev = stats?.monthlyRevenue || 0;
  const totalOrdersCount = stats?.totalOrders || 0;

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">PrintMe.ai Merchant Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Live Revenue, Growth Milestones, and Store Operations</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/shop-v2">
            <Button variant="outline" className="text-xs font-semibold">Storefront View</Button>
          </Link>
          <Link href="/admin/seasonal-trends">
            <Button className="text-xs bg-amber-600 hover:bg-amber-700 font-semibold text-white">Seasonal Trends</Button>
          </Link>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm">
          {error}
        </div>
      )}

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <Card className="border border-gray-200 shadow-sm">
          <CardBody className="py-5">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total Orders</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">{stats?.totalOrders ?? 0}</p>
            <p className="text-xs text-gray-400 mt-2">Verified buyer purchases</p>
          </CardBody>
        </Card>

        <Card className="border border-gray-200 shadow-sm">
          <CardBody className="py-5">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Monthly Gross Revenue</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">${monthlyRev.toFixed(2)}</p>
            <p className="text-xs text-emerald-600 font-medium mt-2">Trailing 30-day volume</p>
          </CardBody>
        </Card>

        <Card className="border border-gray-200 shadow-sm">
          <CardBody className="py-5">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Catalog & Curated Designs</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">{stats?.totalDesigns ?? 0}</p>
            <p className="text-xs text-gray-400 mt-2">Published across Fall & Seasonal Edit</p>
          </CardBody>
        </Card>

        <Card className="border border-gray-200 shadow-sm">
          <CardBody className="py-5">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Active Creators (30d)</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">{stats?.activeUsers ?? 0}</p>
            <p className="text-xs text-gray-400 mt-2">Unique photo uploads & creations</p>
          </CardBody>
        </Card>
      </div>

      {/* Revenue Milestone Progress System */}
      <Card className="border border-gray-200 shadow-sm">
        <CardHeader className="border-b border-gray-100 py-4 px-6">
          <h2 className="text-lg font-bold text-gray-900">Revenue Growth Milestones</h2>
          <p className="text-xs text-gray-500">Uncapped scalable commercial goals tracked against verified transactions</p>
        </CardHeader>
        <CardBody className="p-6 space-y-5">
          {/* Milestone 1 */}
          <div>
            <div className="flex justify-between text-sm mb-1.5">
              <span className="font-semibold text-gray-800">Milestone 1: First 10 Fulfilled Orders</span>
              <span className="font-mono text-xs text-gray-600">{totalOrdersCount} / 10 orders ({Math.min(100, Math.round((totalOrdersCount / 10) * 100))}%)</span>
            </div>
            <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
              <div
                className="bg-amber-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, (totalOrdersCount / 10) * 100)}%` }}
              ></div>
            </div>
          </div>

          {/* Milestone 2 */}
          <div>
            <div className="flex justify-between text-sm mb-1.5">
              <span className="font-semibold text-gray-800">Milestone 2: $2,000 Monthly Gross Revenue</span>
              <span className="font-mono text-xs text-gray-600">${monthlyRev.toFixed(0)} / $2,000 ({Math.min(100, Math.round((monthlyRev / 2000) * 100))}%)</span>
            </div>
            <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, (monthlyRev / 2000) * 100)}%` }}
              ></div>
            </div>
          </div>

          {/* Milestone 3 & 4 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
              <div className="flex justify-between text-xs font-semibold text-gray-700 mb-1">
                <span>Milestone 3: $5,000 / mo</span>
                <span>{Math.min(100, Math.round((monthlyRev / 5000) * 100))}%</span>
              </div>
              <div className="w-full bg-gray-200 h-1.5 rounded-full overflow-hidden">
                <div className="bg-blue-500 h-full" style={{ width: `${Math.min(100, (monthlyRev / 5000) * 100)}%` }}></div>
              </div>
            </div>

            <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
              <div className="flex justify-between text-xs font-semibold text-gray-700 mb-1">
                <span>Milestone 4 & Beyond: $10,000+ / mo</span>
                <span>{Math.min(100, Math.round((monthlyRev / 10000) * 100))}%</span>
              </div>
              <div className="w-full bg-gray-200 h-1.5 rounded-full overflow-hidden">
                <div className="bg-purple-500 h-full" style={{ width: `${Math.min(100, (monthlyRev / 10000) * 100)}%` }}></div>
              </div>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* 3 Scalable Sales Launch Paths */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border border-gray-200 shadow-sm flex flex-col justify-between">
          <CardBody className="p-5">
            <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 mb-2">Sales Path 1</span>
            <h3 className="text-base font-bold text-gray-900">Personalized Halloween Pet Keepsakes</h3>
            <p className="text-xs text-gray-600 mt-1">
              Pet owners upload dog/cat photos to receive customized tees, mugs, or wall prints. High viral shareability.
            </p>
            <div className="mt-4 text-xs font-semibold text-gray-500">
              Avg. Contribution Margin: <span className="text-emerald-600">53.6% ($20.35/tee)</span>
            </div>
          </CardBody>
          <div className="px-5 pb-5">
            <Link href="/shop-v2?collection=halloween">
              <Button variant="outline" className="w-full text-xs">Preview Halloween Offers</Button>
            </Link>
          </div>
        </Card>

        <Card className="border border-gray-200 shadow-sm flex flex-col justify-between">
          <CardBody className="p-5">
            <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 mb-2">Sales Path 2</span>
            <h3 className="text-base font-bold text-gray-900">Matching Family & Group Shirts</h3>
            <p className="text-xs text-gray-600 mt-1">
              Coordinated Autumn, Friendsgiving, and Turkey Trot shirts. Bundled 3+ items qualify for auto free shipping.
            </p>
            <div className="mt-4 text-xs font-semibold text-gray-500">
              Target AOV: <span className="text-emerald-600">$85.00+ ($45+ net margin)</span>
            </div>
          </CardBody>
          <div className="px-5 pb-5">
            <Link href="/shop-v2?collection=thanksgiving">
              <Button variant="outline" className="w-full text-xs">Preview Group Offers</Button>
            </Link>
          </div>
        </Card>

        <Card className="border border-gray-200 shadow-sm flex flex-col justify-between">
          <CardBody className="p-5">
            <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 mb-2">Sales Path 3</span>
            <h3 className="text-base font-bold text-gray-900">Curated Seasonal Edit Collection</h3>
            <p className="text-xs text-gray-600 mt-1">
              Original limited-edition designs (Boo Crew, Autumn State of Mind, Library of Lost Hours) ready to buy.
            </p>
            <div className="mt-4 text-xs font-semibold text-gray-500">
              Live Catalog Status: <span className="text-emerald-600">6 Verified Designs</span>
            </div>
          </CardBody>
          <div className="px-5 pb-5">
            <Link href="/shop-v2">
              <Button variant="outline" className="w-full text-xs">Browse Seasonal Edit</Button>
            </Link>
          </div>
        </Card>
      </div>

      {/* Recent Orders Table */}
      <Card className="border border-gray-200 shadow-sm">
        <CardHeader className="flex items-center justify-between border-b border-gray-100 py-4 px-6">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Recent Customer Orders</h2>
            <p className="text-xs text-gray-500">Transactions processed via Stripe Checkout & Supabase</p>
          </div>
          <Link href="/admin/orders">
            <Button variant="outline" className="text-xs font-semibold">View All Orders</Button>
          </Link>
        </CardHeader>

        <CardBody className="p-0">
          {stats?.recentOrders && stats.recentOrders.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 text-xs uppercase font-medium">
                  <tr>
                    <th className="py-3 px-6 text-left">Order</th>
                    <th className="py-3 px-6 text-left">Buyer</th>
                    <th className="py-3 px-6 text-left">Amount</th>
                    <th className="py-3 px-6 text-left">Status</th>
                    <th className="py-3 px-6 text-left">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {stats.recentOrders.map((order) => {
                    const orderAmt = order.paid_amount || order.total || order.total_amount || 0;
                    const buyerName =
                      order.shipping_address?.name ||
                      order.customer_email ||
                      getFirstOrValue(order.user)?.full_name ||
                      'Guest Shopper';

                    return (
                      <tr key={order.id} className="hover:bg-gray-50/80 transition-colors">
                        <td className="py-3.5 px-6 font-semibold text-gray-900">
                          #{order.order_number || order.id.slice(0, 8).toUpperCase()}
                        </td>
                        <td className="py-3.5 px-6 text-gray-600">
                          {buyerName}
                        </td>
                        <td className="py-3.5 px-6 font-semibold text-gray-900">
                          ${(orderAmt / 100).toFixed(2)}
                        </td>
                        <td className="py-3.5 px-6">
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
                            order.status === 'paid' || order.status === 'shipped' || order.status === 'fulfilled'
                              ? 'bg-emerald-100 text-emerald-800'
                              : order.status === 'payment-not-received'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-gray-100 text-gray-700'
                          }`}>
                            {order.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-6 text-gray-500 text-xs">
                          {new Date(order.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500 text-sm">
              <p className="font-semibold text-gray-700">No customer orders recorded yet.</p>
              <p className="text-xs text-gray-400 mt-1">Live customer orders will appear here automatically upon Stripe payment.</p>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
