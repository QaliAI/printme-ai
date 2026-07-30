import Link from 'next/link';
import { notFound } from 'next/navigation';
import { isReviewFeatureEnabled } from '@/lib/feature-flags';

export default function CheckoutCancelPage() {
  if (!isReviewFeatureEnabled('commerce')) notFound();
  return (
    <main className="min-h-screen bg-amber-50 px-6 py-20 text-stone-950">
      <div className="mx-auto max-w-xl border border-stone-300 bg-white p-8">
        <p className="mb-4 text-xs font-bold uppercase tracking-widest text-orange-700">
          Test checkout preview
        </p>
        <h1 className="mb-4 text-4xl font-semibold">Checkout cancelled</h1>
        <p className="mb-8 text-stone-600">
          No browser redirect is treated as payment. Your cart remains available.
        </p>
        <Link className="underline" href="/shop-v2">
          Return to your bag
        </Link>
      </div>
    </main>
  );
}
