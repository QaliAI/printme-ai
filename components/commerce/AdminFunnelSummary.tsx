'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { summarizeFunnel } from '@/lib/commerce/funnel-summary';

type Summary = ReturnType<typeof summarizeFunnel> & { sampled: boolean };
export function AdminFunnelSummary() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let mounted = true;
    void (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const response = await fetch('/api/admin/analytics', { headers: session ? { Authorization: `Bearer ${session.access_token}` } : {} });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Analytics unavailable.');
        if (mounted) setSummary(result);
      } catch (err) { if (mounted) setError(err instanceof Error ? err.message : 'Analytics unavailable.'); }
    })();
    return () => { mounted = false; };
  }, []);
  return <section className="rounded-xl border border-gray-200 bg-white p-5">
    <h2 className="text-lg font-semibold">Commerce funnel · trailing 30 days</h2>
    {error ? <p role="status">{error}</p> : !summary ? <p>Loading analytics…</p> : <>
      {summary.sampled && <p>Limited to the first 10,000 records in this period.</p>}
      <dl className="grid grid-cols-2 gap-4 py-4 lg:grid-cols-4">
        {Object.entries({ 'Session starts': summary.sessions, 'Design interactions': summary.designInteractions, 'AI generations': summary.generations, 'Add to cart': summary.addToCart, 'Checkout starts': summary.checkout, 'Paid orders': summary.purchases, 'AOV': summary.aovCents === null ? '—' : `$${(summary.aovCents / 100).toFixed(2)}`, 'Upsell additions / cart additions': summary.upsellAttachRate === null ? '—' : `${Math.round(summary.upsellAttachRate * 100)}%` }).map(([label, value]) => <div key={label}><dt className="text-sm text-gray-500">{label}</dt><dd className="text-xl font-semibold">{value}</dd></div>)}
      </dl>
      <p>Top selected designs: {summary.topDesigns.map(item => `${item.label} (${item.count})`).join(', ') || 'No events yet'}</p>
      <p>Top acquisition sources: {summary.topSources.map(item => `${item.label} (${item.count})`).join(', ') || 'No tagged starts yet'}</p>
    </>}
  </section>;
}
