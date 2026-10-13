import Link from 'next/link';
import { isDemandProof, opportunityStatuses } from '@/lib/merchandising/opportunities';
import { opportunityQueue } from '@/lib/merchandising/opportunity-queue';

const verificationLabel = {
  'listing-observed': 'Observed on listing',
  'search-snippet': 'Search snippet only',
  'shop-wide': 'Shop-wide (not item)',
  'seller-claim': 'Seller claim',
  keyword: 'Keyword / saturation',
} as const;

const statusTone: Record<(typeof opportunityStatuses)[number], string> = {
  researching: 'bg-gray-100 text-gray-700',
  proposed: 'bg-blue-100 text-blue-800',
  approved: 'bg-amber-100 text-amber-800',
  'in-design': 'bg-purple-100 text-purple-800',
  published: 'bg-emerald-100 text-emerald-800',
  rejected: 'bg-red-100 text-red-800',
};

const usd = (cents: number) => `$${(cents / 100).toFixed(2)}`;

export default function OpportunityQueuePage() {
  const counts = opportunityStatuses.map((status) => [status, opportunityQueue.filter((entry) => entry.status === status).length] as const);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold text-gray-900">Merchandising opportunities</h1>
        <p className="mt-2 max-w-3xl text-gray-600">
          Internal research queue. Only item-level evidence observed on a listing counts as demand proof; snippets, keywords and
          shop-wide totals are context. Entries change through a reviewed pull request to{' '}
          <code className="rounded bg-gray-100 px-1">lib/merchandising/opportunity-queue.ts</code>, which is the approval record.
        </p>
        <ul className="mt-4 flex flex-wrap gap-2 text-sm">
          {counts.map(([status, count]) => (
            <li key={status} className={`rounded-full px-3 py-1 ${statusTone[status]}`}>
              {status} · {count}
            </li>
          ))}
        </ul>
      </header>

      {opportunityQueue.map((entry) => {
        const proof = entry.signals.filter(isDemandProof).length;
        return (
          <article key={entry.id} className="rounded-lg bg-white p-6 shadow">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">{entry.title}</h2>
                <p className="text-sm text-gray-500">
                  {entry.category} · risk {entry.riskLevel} · demand {entry.demandConfidence} ({proof} item-level proof
                  {proof === 1 ? '' : 's'}) · competition {entry.competition.level}
                </p>
              </div>
              <span className={`rounded-full px-3 py-1 text-sm font-medium ${statusTone[entry.status]}`}>{entry.status}</span>
            </div>
            {entry.decision && (
              <p className="mt-3 text-sm text-gray-700">
                <strong>Decision</strong> {entry.decision.at} by {entry.decision.by}: {entry.decision.note}
              </p>
            )}
            <dl className="mt-4 grid gap-4 text-sm md:grid-cols-2">
              <div>
                <dt className="font-medium text-gray-900">Persona and hook</dt>
                <dd className="text-gray-700">{entry.persona} {entry.hook}</dd>
              </div>
              <div>
                <dt className="font-medium text-gray-900">Why we believe demand</dt>
                <dd className="text-gray-700">{entry.demandRationale}</dd>
              </div>
              <div>
                <dt className="font-medium text-gray-900">Rights</dt>
                <dd className="text-gray-700">{entry.rightsNotes}</dd>
              </div>
              <div>
                <dt className="font-medium text-gray-900">Products and economics</dt>
                <dd className="text-gray-700">
                  {entry.productIds.join(', ') || 'none'}. Retail {usd(entry.unitEconomics.retailPriceCents)}, unit cost{' '}
                  {entry.unitEconomics.unitCostCents === null ? 'unverified' : usd(entry.unitEconomics.unitCostCents)}.{' '}
                  {entry.unitEconomics.notes}
                </dd>
              </div>
            </dl>
            <table className="mt-4 w-full text-left text-sm">
              <thead className="text-gray-500">
                <tr>
                  <th className="py-1 pr-3 font-medium">Signal</th>
                  <th className="py-1 pr-3 font-medium">Verification</th>
                  <th className="py-1 pr-3 font-medium">Reviews · favs</th>
                  <th className="py-1 font-medium">Snapshot</th>
                </tr>
              </thead>
              <tbody>
                {entry.signals.map((signal, index) => (
                  <tr key={`${signal.url}-${index}`} className="border-t border-gray-100 align-top">
                    <td className="py-2 pr-3">
                      <a href={signal.url} target="_blank" rel="noreferrer noopener" className="text-blue-700 underline">
                        {signal.platform}
                        {signal.listingId ? ` ${signal.listingId}` : ''}
                      </a>
                      <p className="text-gray-600">{signal.summary}</p>
                    </td>
                    <td className="py-2 pr-3">
                      {verificationLabel[signal.verification]}
                      {signal.highSalesBadge ? ' · high-sales badge' : ''}
                    </td>
                    <td className="py-2 pr-3">
                      {signal.itemReviews ?? '–'} · {signal.favorites ?? '–'}
                    </td>
                    <td className="py-2">{signal.snapshotDate}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {entry.liveSurface && <p className="mt-4 text-sm">Live at: {entry.liveSurface}</p>}
            {entry.designIds.length > 0 && (
              <p className="mt-4 text-sm">
                Designs:{' '}
                {entry.designIds.map((id) => (
                  <Link key={id} href={`/admin/designs`} className="mr-2 text-blue-700 underline">
                    {id}
                  </Link>
                ))}
              </p>
            )}
          </article>
        );
      })}
    </div>
  );
}
