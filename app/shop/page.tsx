import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import { ShopV2Experience } from '@/app/shop-v2/ShopV2Experience';
import { getApprovedMerchProducts } from '@/lib/commerce/catalog/approved-catalog';
import { getDesignCatalogService } from '@/lib/commerce/designs/service';
import { isReviewFeatureEnabled } from '@/lib/feature-flags';
import { applyCommerceE2EReviewEconomics } from '@/lib/commerce/testing/review-economics';
import { isCheckoutAvailable } from '@/lib/commerce/checkout/availability';

export const metadata: Metadata = {
  title: 'Shop Personalized Gifts & Merch | PrintMe',
  description:
    'Turn photos, pets, and inside jokes into one-of-a-kind tees, mugs, and posters. Fast, fun gifts you will actually want to give.',
  alternates: { canonical: '/shop' },
};

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<{ design?: string }>;
}) {
  if (!isReviewFeatureEnabled('commerce')) {
    notFound();
  }

  const designs = await getDesignCatalogService().listPublished();
  const cookieStore = await cookies();
  const products = applyCommerceE2EReviewEconomics(
    getApprovedMerchProducts(),
    cookieStore.get('printme-e2e-secret')?.value,
  );
  return (
    <ShopV2Experience
      designs={designs}
      products={products}
      initialDesignSlug={(await searchParams).design}
      checkoutAvailable={isCheckoutAvailable(cookieStore.get('printme-e2e-secret')?.value)}
    />
  );
}
