import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getCheckoutConfirmation } from '@/lib/commerce/checkout/confirmation';

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string | string[] }>;
}) {
  if (process.env.NEXT_PUBLIC_COMMERCE_V2_ENABLED !== 'true') notFound();
  const sessionId = (await searchParams).session_id;
  const confirmation =
    typeof sessionId === 'string'
      ? await getCheckoutConfirmation(sessionId)
      : null;

  return (
    <main className="min-h-screen bg-amber-50 px-6 py-20 text-stone-950">
      <div className="mx-auto max-w-xl border border-stone-300 bg-white p-8">
        <p className="mb-4 text-xs font-bold uppercase tracking-widest text-orange-700">
          Test checkout preview — no production charge
        </p>
        <h1 className="mb-4 text-4xl font-semibold">
          {confirmation?.verified
            ? 'Payment verified'
            : 'Payment verification pending'}
        </h1>
        <p className="mb-8 text-stone-600">
          {confirmation?.verified
            ? 'Stripe’s signed webhook verified this test payment. Your order is now recorded as paid.'
            : 'Returning from Stripe does not prove payment. This page will not confirm the order until a signed webhook updates it.'}
        </p>
        {confirmation?.verified && (
          <p className="mb-8 font-mono text-sm">
            Order {confirmation.orderId}
          </p>
        )}
        <Link className="underline" href="/shop-v2">
          Return to Shop V2
        </Link>
      </div>
    </main>
  );
}
