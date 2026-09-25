'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardBody } from '@/components/Card';
import type { OperatorQueueTab } from '@/lib/commerce/fulfillment/order-lifecycle';
import type { CartConfigurationSnapshot } from '@/lib/commerce/types';
import type { ArtworkValidationResult } from '@/lib/commerce/fulfillment/artwork-validator';
import type { ItemEconomicsEvaluation } from '@/lib/commerce/fulfillment/economics-validator';

interface OrderItem {
  id: string;
  quantity: number;
  unit_price: number;
  configuration_snapshot: unknown;
}

interface OrderData {
  id: string;
  order_number: string;
  created_at: string;
  updated_at: string;
  status: string;
  payment_status: string;
  fulfillment_status: string;
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
  paid_amount: number | null;
  customer_email: string | null;
  shipping_address: Record<string, string | null> | null;
  stripe_payment_intent_id: string | null;
  stripe_checkout_session_id: string | null;
  printify_order_id: string | null;
  production_submitted_at: string | null;
  tracking_number: string | null;
  tracking_carrier: string | null;
  tracking_url: string | null;
  shipped_at: string | null;
  delivered_at: string | null;
  error_message: string | null;
  order_items: OrderItem[];
  parsedItems: CartConfigurationSnapshot[];
  job: Record<string, unknown> | null;
  lifecycle: {
    operatorTab: OperatorQueueTab;
    canonicalLifecycleState: string;
    canApprove: boolean;
    canDryRun: boolean;
    blockingReasons: string[];
    warnings: string[];
    artworkAudit: {
      valid: boolean;
      hasFailures: boolean;
      hasWarnings: boolean;
      itemAudits: ArtworkValidationResult[];
      failures: string[];
      warnings: string[];
    };
    economicsAudit: {
      valid: boolean;
      itemsTotalRetailCents: number;
      grossRevenueCents: number;
      totalProductCostCents: number;
      totalFulfillmentShippingCents: number;
      totalStripeFeeCents: number;
      totalCostCents: number;
      netContributionProfitCents: number;
      contributionMarginPercent: number;
      passesMarginFloor: boolean;
      itemEvaluations: ItemEconomicsEvaluation[];
      blockingReasons: string[];
    };
  };
}

interface DryRunModalData {
  orderId: string;
  orderNumber: string;
  dryRunTimestamp: string;
  isReadyForSubmission: boolean;
  payload: unknown;
  payloadHash: string | null;
  payloadGenerationError: string | null;
  artworkAudit: unknown;
  economicsAudit: unknown;
  printifyEndpoint: string;
}

const TABS: { id: OperatorQueueTab | 'ALL'; label: string; color: string }[] = [
  { id: 'ALL', label: 'All Orders', color: 'bg-gray-100 text-gray-800' },
  { id: 'NEEDS_REVIEW', label: 'Needs Review', color: 'bg-amber-100 text-amber-800' },
  { id: 'READY_FOR_PRODUCTION', label: 'Ready for Production', color: 'bg-blue-100 text-blue-800' },
  { id: 'BLOCKED', label: 'Blocked', color: 'bg-red-100 text-red-800' },
  { id: 'SUBMITTED', label: 'Submitted', color: 'bg-indigo-100 text-indigo-800' },
  { id: 'IN_PRODUCTION', label: 'In Production', color: 'bg-purple-100 text-purple-800' },
  { id: 'SHIPPED', label: 'Shipped', color: 'bg-emerald-100 text-emerald-800' },
  { id: 'EXCEPTION', label: 'Exception', color: 'bg-rose-100 text-rose-800' },
];

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<OrderData[]>([]);
  const [tabCounts, setTabCounts] = useState<Record<string, number>>({});
  const [activeTab, setActiveTab] = useState<OperatorQueueTab | 'ALL'>('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<string>('disabled');

  // Modal states
  const [dryRunData, setDryRunData] = useState<DryRunModalData | null>(null);
  const [loadingDryRun, setLoadingDryRun] = useState(false);
  const [approvingOrderId, setApprovingOrderId] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/orders?tab=${activeTab}`);
      if (!res.ok) {
        throw new Error(`Failed to load orders: HTTP ${res.status}`);
      }
      const data = await res.json();
      setOrders(data.orders || []);
      setTabCounts(data.tabCounts || {});
      setMode(data.mode || 'disabled');
    } catch (err) {
      console.error('Error fetching admin orders:', err);
      setError(err instanceof Error ? err.message : 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchOrders();
  }, [fetchOrders]);

  async function handleInspectDryRun(orderId: string) {
    setLoadingDryRun(true);
    setDryRunData(null);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/dry-run`);
      if (!res.ok) {
        throw new Error(`Dry-run failed: HTTP ${res.status}`);
      }
      const data = await res.json();
      setDryRunData(data);
    } catch (err) {
      alert(`Dry run inspection error: ${err instanceof Error ? err.message : 'Unknown'}`);
    } finally {
      setLoadingDryRun(false);
    }
  }

  async function handleApproveOrder(orderId: string) {
    if (!confirm('Are you sure you want to approve this order for fulfillment production?')) {
      return;
    }
    setApprovingOrderId(orderId);
    setActionSuccess(null);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/approve`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to approve order');
      }
      setActionSuccess(data.message || `Order ${orderId.slice(0, 8)} approved successfully!`);
      await fetchOrders();
    } catch (err) {
      alert(`Approval failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setApprovingOrderId(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-gray-200">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">Operator Fulfillment Queue</h1>
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider ${
                mode === 'live'
                  ? 'bg-green-100 text-green-800 border border-green-300'
                  : mode === 'draft'
                    ? 'bg-blue-100 text-blue-800 border border-blue-300'
                    : mode === 'dry-run'
                      ? 'bg-amber-100 text-amber-800 border border-amber-300'
                      : 'bg-gray-200 text-gray-700'
              }`}
            >
              Mode: {mode}
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Authoritative order lifecycle, margin floor audits, artwork verification, and Printify dry-run inspection.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchOrders()}
            className="inline-flex items-center px-3.5 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 transition"
          >
            ↻ Refresh Queue
          </button>
        </div>
      </div>

      {actionSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-800 flex items-center justify-between">
          <span>✓ {actionSuccess}</span>
          <button
            onClick={() => setActionSuccess(null)}
            className="text-emerald-600 hover:text-emerald-900 font-bold"
          >
            ×
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-gray-200">
        {TABS.map((tab) => {
          const count = tabCounts[tab.id] ?? 0;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition whitespace-nowrap ${
                isActive
                  ? 'bg-gray-900 text-white shadow-sm'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                  isActive ? 'bg-gray-800 text-gray-200' : 'bg-gray-200 text-gray-700'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Content */}
      {loading ? (
        <div className="text-center py-16 bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="inline-block animate-spin rounded-full border-4 border-gray-200 border-t-gray-900 w-8 h-8 mb-3"></div>
          <p className="text-sm text-gray-500 font-medium">Loading fulfillment orders...</p>
        </div>
      ) : error ? (
        <div className="p-6 bg-red-50 border border-red-200 rounded-xl text-red-700">
          <p className="font-semibold">Failed to load orders</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="text-3xl mb-2">📦</div>
          <p className="text-base font-semibold text-gray-800">No orders in this queue</p>
          <p className="text-sm text-gray-500 mt-1">
            Orders matching tab <span className="font-mono font-bold">{activeTab}</span> will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const lifecycle = order.lifecycle;
            const economics = lifecycle.economicsAudit;
            const artwork = lifecycle.artworkAudit;
            const items = order.parsedItems;

            return (
              <Card key={order.id} className="overflow-hidden border border-gray-200 hover:border-gray-300 transition shadow-sm">
                <CardBody className="p-5">
                  {/* Top Bar */}
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 pb-4 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold text-lg text-gray-900">
                        #{order.order_number || order.id.slice(0, 8)}
                      </span>
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${
                          lifecycle.operatorTab === 'BLOCKED'
                            ? 'bg-red-100 text-red-800 border border-red-200'
                            : lifecycle.operatorTab === 'READY_FOR_PRODUCTION'
                              ? 'bg-blue-100 text-blue-800 border border-blue-200'
                              : lifecycle.operatorTab === 'SHIPPED'
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                : lifecycle.operatorTab === 'IN_PRODUCTION'
                                  ? 'bg-purple-100 text-purple-800 border border-purple-200'
                                  : lifecycle.operatorTab === 'SUBMITTED'
                                    ? 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                                    : 'bg-amber-100 text-amber-800 border border-amber-200'
                        }`}
                      >
                        {lifecycle.operatorTab.replace(/_/g, ' ')}
                      </span>
                      <span className="text-xs text-gray-400 font-mono">
                        {new Date(order.created_at).toLocaleString()}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleInspectDryRun(order.id)}
                        className="px-3 py-1.5 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
                      >
                        👁 Inspect Dry-Run
                      </button>

                      {lifecycle.canApprove && (
                        <button
                          onClick={() => handleApproveOrder(order.id)}
                          disabled={approvingOrderId === order.id}
                          className="px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg shadow-sm transition"
                        >
                          {approvingOrderId === order.id ? 'Approving...' : '✓ Approve Production'}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Blocking Alert Banner */}
                  {lifecycle.blockingReasons.length > 0 && (
                    <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800 space-y-1">
                      <div className="font-bold flex items-center gap-1.5">
                        <span>🛑 FULFILLMENT BLOCKED:</span>
                      </div>
                      <ul className="list-disc list-inside space-y-0.5 pl-1">
                        {lifecycle.blockingReasons.map((reason, idx) => (
                          <li key={idx} className="font-medium">
                            {reason}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Warning Banner */}
                  {lifecycle.warnings.length > 0 && lifecycle.blockingReasons.length === 0 && (
                    <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 space-y-1">
                      <div className="font-bold flex items-center gap-1.5">
                        <span>⚠️ ATTENTION REQUIRED:</span>
                      </div>
                      <ul className="list-disc list-inside space-y-0.5 pl-1">
                        {lifecycle.warnings.map((warn, idx) => (
                          <li key={idx} className="font-medium">
                            {warn}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Grid Layout: Items & Economics */}
                  <div className="mt-4 grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Items Section (7 cols) */}
                    <div className="lg:col-span-7 space-y-3">
                      <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                        Ordered Merchandise ({items.length} item{items.length === 1 ? '' : 's'})
                      </h4>
                      <div className="space-y-3">
                        {items.map((item: CartConfigurationSnapshot, idx: number) => {
                          const config = item.configuration || {};
                          const assetUrl = config.productionAssetUrl || config.designAssetUrl;
                          const audit = artwork.itemAudits[idx];

                          return (
                            <div
                              key={item.id || idx}
                              className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100 text-sm"
                            >
                              {assetUrl ? (
                                <a
                                  href={assetUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="w-14 h-14 shrink-0 rounded bg-white border border-gray-200 overflow-hidden flex items-center justify-center hover:opacity-80 transition"
                                  title="View high-res production asset"
                                >
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img
                                    src={assetUrl}
                                    alt={item.designTitle || 'Design Artwork'}
                                    className="w-full h-full object-contain"
                                  />
                                </a>
                              ) : (
                                <div className="w-14 h-14 shrink-0 rounded bg-gray-200 flex items-center justify-center text-xs text-gray-400">
                                  No Art
                                </div>
                              )}

                              <div className="flex-1 min-w-0">
                                <div className="font-semibold text-gray-900 truncate">
                                  {item.designTitle || 'Custom Design'}
                                </div>
                                <div className="text-xs text-gray-600">
                                  {item.productTitle || config.merchProductId} —{' '}
                                  <span className="font-medium text-gray-800">
                                    {item.variantTitle || config.selectedSize || 'Standard'}
                                  </span>{' '}
                                  (Qty: {item.quantity || 1})
                                </div>
                                <div className="text-xs text-gray-500 font-mono mt-1">
                                  Provider #{config.printifyProviderId || 99} • Blueprint #{config.printifyBlueprintId || 282} • Variant #{config.printifyVariantId || 'N/A'}
                                </div>

                                {/* Artwork pre-flight pill */}
                                {audit && (
                                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs">
                                    <span
                                      className={`px-1.5 py-0.5 rounded font-mono font-medium ${
                                        audit.valid
                                          ? 'bg-emerald-100 text-emerald-800'
                                          : 'bg-red-100 text-red-800'
                                      }`}
                                    >
                                      {audit.valid ? '✓ Artwork Valid' : '✕ Artwork Failed'}
                                    </span>
                                    {audit.effectiveDpi && (
                                      <span className="text-gray-500 font-mono">
                                        {audit.effectiveDpi} DPI
                                      </span>
                                    )}
                                    {audit.transparencyRequired && (
                                      <span
                                        className={`px-1.5 py-0.5 rounded font-mono ${
                                          audit.hasTransparency
                                            ? 'bg-blue-50 text-blue-700'
                                            : 'bg-amber-50 text-amber-700'
                                        }`}
                                      >
                                        {audit.hasTransparency ? 'Transparent Alpha' : 'Alpha Needed'}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Customer & Shipping info */}
                      <div className="p-3 bg-gray-50 rounded-lg border border-gray-100 text-xs text-gray-600">
                        <div className="font-bold text-gray-700 uppercase tracking-wider mb-1">
                          Shipping Recipient
                        </div>
                        <div className="font-medium text-gray-900">
                          {order.shipping_address?.name || 'Customer on File'} ({order.customer_email || 'No email'})
                        </div>
                        <div>
                          {order.shipping_address?.line1} {order.shipping_address?.line2 || ''}
                        </div>
                        <div>
                          {order.shipping_address?.city}, {order.shipping_address?.state}{' '}
                          {order.shipping_address?.postal_code} {order.shipping_address?.country}
                        </div>
                      </div>
                    </div>

                    {/* Economics & Integrations (5 cols) */}
                    <div className="lg:col-span-5 space-y-3">
                      <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                        Economics & Margin Gate
                      </h4>
                      <div className="p-3 bg-gray-50 rounded-lg border border-gray-100 space-y-2 text-xs">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Customer Paid (Subtotal):</span>
                          <span className="font-mono font-semibold text-gray-900">
                            ${(economics.itemsTotalRetailCents / 100).toFixed(2)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Printify Fulfillment Cost:</span>
                          <span className="font-mono font-medium text-red-600">
                            -${(economics.totalProductCostCents / 100).toFixed(2)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Est. Provider Shipping:</span>
                          <span className="font-mono text-gray-500">
                            ${(economics.totalFulfillmentShippingCents / 100).toFixed(2)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Stripe Processing Fee:</span>
                          <span className="font-mono text-gray-500">
                            -${(economics.totalStripeFeeCents / 100).toFixed(2)}
                          </span>
                        </div>
                        <div className="pt-2 border-t border-gray-200 flex justify-between items-center text-sm">
                          <span className="font-bold text-gray-800">Net Gross Margin:</span>
                          <div className="text-right">
                            <span
                              className={`font-mono font-bold ${
                                economics.passesMarginFloor
                                  ? 'text-emerald-700'
                                  : 'text-red-700'
                              }`}
                            >
                              ${(economics.netContributionProfitCents / 100).toFixed(2)} (
                              {economics.contributionMarginPercent}%)
                            </span>
                            <div className="text-[10px] text-gray-400">
                              Floor: $8.00 / 30%
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Integration IDs & Tracking */}
                      <div className="p-3 bg-gray-50 rounded-lg border border-gray-100 text-xs space-y-1 font-mono">
                        <div className="text-gray-400 font-sans font-bold uppercase tracking-wider text-[10px] mb-1">
                          Integration Tracking
                        </div>
                        {order.stripe_checkout_session_id && (
                          <div className="truncate">
                            <span className="text-gray-500">Stripe:</span>{' '}
                            {order.stripe_checkout_session_id.slice(0, 18)}...
                          </div>
                        )}
                        {order.printify_order_id ? (
                          <div>
                            <span className="text-gray-500">Printify:</span>{' '}
                            <span className="font-bold text-gray-900">{order.printify_order_id}</span>
                          </div>
                        ) : (
                          <div className="text-gray-400 italic font-sans">
                            Printify: Not yet submitted
                          </div>
                        )}
                        {order.tracking_number && (
                          <div className="pt-1 border-t border-gray-200">
                            <span className="text-gray-500">Tracking:</span>{' '}
                            <a
                              href={order.tracking_url || '#'}
                              target="_blank"
                              rel="noreferrer"
                              className="text-blue-600 underline font-bold"
                            >
                              {order.tracking_carrier} {order.tracking_number}
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}

      {/* Dry-Run Inspection Modal */}
      {(dryRunData || loadingDryRun) && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in duration-150">
            {/* Modal Header */}
            <div className="p-5 border-b border-gray-200 flex items-center justify-between bg-gray-50">
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  Printify Fulfillment Dry-Run Inspection
                </h3>
                <p className="text-xs text-gray-500 font-mono mt-0.5">
                  Order #{dryRunData?.orderNumber || '...'} • Payload SHA-256:{' '}
                  {dryRunData?.payloadHash?.slice(0, 16) || '...'}
                </p>
              </div>
              <button
                onClick={() => setDryRunData(null)}
                className="text-gray-400 hover:text-gray-700 text-xl font-bold p-1"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              {loadingDryRun ? (
                <div className="text-center py-12">
                  <div className="inline-block animate-spin rounded-full border-4 border-gray-300 border-t-blue-600 w-8 h-8 mb-2"></div>
                  <p className="text-sm text-gray-500 font-medium">Synthesizing Printify payload...</p>
                </div>
              ) : dryRunData ? (
                <>
                  {/* Gate Status Pill */}
                  <div
                    className={`p-3 rounded-lg border text-sm flex items-center justify-between ${
                      dryRunData.isReadyForSubmission
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                        : 'bg-red-50 border-red-200 text-red-800'
                    }`}
                  >
                    <div className="font-semibold flex items-center gap-2">
                      <span>{dryRunData.isReadyForSubmission ? '✓ PASS' : '✕ BLOCKED'}</span>
                      <span>
                        {dryRunData.isReadyForSubmission
                          ? 'Payload passes all artwork, blueprint, and economics gates.'
                          : 'Order does not meet criteria for automated Printify submission.'}
                      </span>
                    </div>
                  </div>

                  {dryRunData.payloadGenerationError && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 font-mono">
                      Error: {dryRunData.payloadGenerationError}
                    </div>
                  )}

                  {/* Printify Target Endpoint */}
                  <div className="text-xs text-gray-600">
                    <span className="font-bold">Target API Endpoint:</span>{' '}
                    <code className="font-mono bg-gray-100 px-1.5 py-0.5 rounded text-gray-800">
                      POST {dryRunData.printifyEndpoint}
                    </code>
                  </div>

                  {/* Raw Payload JSON */}
                  <div>
                    <div className="text-xs font-bold text-gray-700 mb-1">
                      Exact Printify Order Payload (JSON)
                    </div>
                    <pre className="p-3 bg-gray-900 text-gray-100 rounded-lg text-xs font-mono overflow-x-auto max-h-72">
                      {JSON.stringify(dryRunData.payload, null, 2)}
                    </pre>
                  </div>
                </>
              ) : null}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-2">
              <button
                onClick={() => setDryRunData(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-100"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
