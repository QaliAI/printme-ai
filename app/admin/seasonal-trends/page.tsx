'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  Sparkles,
  ExternalLink,
  CheckCircle,
  AlertCircle,
  Clock,
  Eye,
  ArrowUp,
  ArrowDown,
  RefreshCw,
} from 'lucide-react';
import {
  type SeasonalTrendCard,
  getAdminSeasonalTrends,
} from '@/lib/commerce/seasonal-trends';

export default function SeasonalTrendsAdminPage() {
  const [trends, setTrends] = useState<SeasonalTrendCard[]>(() =>
    getAdminSeasonalTrends(),
  );
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const togglePublication = (id: string) => {
    setTrends((prev) =>
      prev.map((card) => {
        if (card.id !== id) return card;
        const nextStatus =
          card.publicationStatus === 'published' ? 'archived' : 'published';
        return {
          ...card,
          publicationStatus: nextStatus,
          retiredAt: nextStatus === 'archived' ? new Date().toISOString() : null,
        };
      }),
    );
    setFeedbackMessage(`Updated card publication status.`);
    setTimeout(() => setFeedbackMessage(null), 3000);
  };

  const moveOrder = (id: string, direction: 'up' | 'down') => {
    setTrends((prev) => {
      const idx = prev.findIndex((c) => c.id === id);
      if (idx === -1) return prev;
      const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (targetIdx < 0 || targetIdx >= prev.length) return prev;

      const updated = [...prev];
      const temp = updated[idx];
      updated[idx] = updated[targetIdx];
      updated[targetIdx] = temp;

      // Update featured order numbers
      return updated.map((c, i) => ({ ...c, featuredOrder: i + 1 }));
    });
    setFeedbackMessage(`Reordered featured trends.`);
    setTimeout(() => setFeedbackMessage(null), 3000);
  };

  const activeCount = trends.filter(
    (t) => t.publicationStatus === 'published' && !t.retiredAt,
  ).length;

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-orange-600">
            Internal Merchandising Registry
          </span>
          <h1 className="text-3xl font-black text-slate-900 mt-1">
            The Seasonal Edit · Trend Registry
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Weekly administration of seasonal trend cards, verified research evidence, and publication status.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/#seasonal-edit"
            target="_blank"
            className="inline-flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-slate-800 transition-colors"
          >
            <Eye size={16} /> Preview on Storefront
          </Link>
        </div>
      </div>

      {feedbackMessage && (
        <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-sm font-medium flex items-center gap-2">
          <CheckCircle size={18} /> {feedbackMessage}
        </div>
      )}

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs font-bold text-slate-500 uppercase">Active Curated Cards</span>
          <p className="text-2xl font-black text-slate-900 mt-2">{activeCount} of {trends.length}</p>
          <span className="text-xs text-emerald-600 font-semibold mt-1 inline-block">● Published &amp; Visible</span>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs font-bold text-slate-500 uppercase">Seasonal Themes</span>
          <p className="text-2xl font-black text-slate-900 mt-2">3 Categories</p>
          <span className="text-xs text-slate-500 mt-1 inline-block">Halloween, Cozy Fall, Thanksgiving</span>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs font-bold text-slate-500 uppercase">Personalization</span>
          <p className="text-2xl font-black text-slate-900 mt-2">5 Working</p>
          <span className="text-xs text-slate-500 mt-1 inline-block">1 Pure Art (Night Garden)</span>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs font-bold text-slate-500 uppercase">Fulfillment Gate</span>
          <p className="text-2xl font-black text-slate-900 mt-2">Printify Choice</p>
          <span className="text-xs text-slate-500 mt-1 inline-block">Tees $11.29, Mugs $6.44, Posters $10.62</span>
        </div>
      </div>

      {/* Trend Cards Registry Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden mb-8">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Curated Trend Cards &amp; Research Basis</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Admin-controlled cards displayed in the customer-facing Seasonal Edit. Update weekly or retire outdated themes.
            </p>
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          {trends.map((card, idx) => (
            <div key={card.id} className="p-6 flex flex-col lg:flex-row items-start gap-6 hover:bg-slate-50/50 transition-colors">
              {/* Thumbnail Mockup */}
              <div className="relative w-24 h-24 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 shrink-0">
                <Image
                  src={card.mockupUrl}
                  alt={card.headline}
                  fill
                  className="object-cover"
                />
              </div>

              {/* Core Details */}
              <div className="flex-grow min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1.5">
                  <span className="text-xs font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-orange-100 text-orange-800">
                    {card.categoryLabel}
                  </span>
                  <span className="text-xs font-semibold text-slate-500">
                    Order #{card.featuredOrder}
                  </span>
                  <span
                    className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                      card.publicationStatus === 'published'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {card.publicationStatus === 'published' ? 'Published' : 'Archived / Retired'}
                  </span>
                  {card.isPersonalizationSupported ? (
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 flex items-center gap-1">
                      <Sparkles size={11} /> Personalization Supported
                    </span>
                  ) : (
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                      Standard Print
                    </span>
                  )}
                </div>

                <h3 className="text-base font-bold text-slate-900">{card.headline}</h3>
                <p className="text-xs text-slate-600 mt-1 max-w-2xl">{card.description}</p>
                <p className="text-xs font-medium text-slate-500 mt-2">
                  Recommended: <strong className="text-slate-800">{card.recommendedProductName}</strong> · Verified Price: <strong className="text-slate-800">{card.verifiedPriceFormatted}</strong>
                </p>

                {/* Research Evidence Disclosure (Admin only) */}
                <div className="mt-3 p-3 bg-slate-50 rounded-lg border border-slate-200/80 text-xs">
                  <strong className="text-slate-700 block mb-1">Research Basis &amp; Observed Signals:</strong>
                  <ul className="space-y-1 text-slate-600">
                    {card.sources.map((src) => (
                      <li key={src.url} className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                        <span className="font-semibold text-slate-800">• {src.name} ({src.observedDate}, {src.marketRegion}):</span>
                        <span className="text-slate-600">{src.whatWasObserved}</span>
                        <a
                          href={src.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-blue-600 hover:underline shrink-0"
                        >
                          Source <ExternalLink size={10} />
                        </a>
                      </li>
                    ))}
                  </ul>
                  <p className="text-[11px] text-slate-500 mt-1.5 italic">
                    Limitation: {card.sources[0]?.limitations}
                  </p>
                </div>
              </div>

              {/* Weekly Management Actions */}
              <div className="flex sm:flex-col items-center sm:items-end gap-2 shrink-0 self-center sm:self-start">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => moveOrder(card.id, 'up')}
                    disabled={idx === 0}
                    className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-30"
                    title="Move higher in priority"
                  >
                    <ArrowUp size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveOrder(card.id, 'down')}
                    disabled={idx === trends.length - 1}
                    className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-30"
                    title="Move lower in priority"
                  >
                    <ArrowDown size={16} />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => togglePublication(card.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                    card.publicationStatus === 'published'
                      ? 'border-red-200 text-red-700 bg-red-50 hover:bg-red-100'
                      : 'border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                  }`}
                >
                  {card.publicationStatus === 'published' ? 'Retire Card' : 'Activate Card'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Operations Note */}
      <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900">
        <strong>Weekly Merchandising Rule:</strong> Keep 6 to 8 curated cards active. Any retired cards are immediately hidden from customer storefront discovery without breaking existing saved cart configurations or previous orders.
      </div>
    </div>
  );
}
