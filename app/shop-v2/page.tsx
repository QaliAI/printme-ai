import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import { ShopV2Experience } from './ShopV2Experience';
import { getApprovedMerchProducts } from '@/lib/commerce/catalog/approved-catalog';
import { getDesignCatalogService } from '@/lib/commerce/designs/service';
import { isReviewFeatureEnabled } from '@/lib/feature-flags';
import { applyCommerceE2EReviewEconomics } from '@/lib/commerce/testing/review-economics';

export const metadata: Metadata = {
  title: 'Curated Shop Preview | PrintMe.ai',
  description: 'Feature-flagged commerce preview for PrintMe.ai.',
};

export default async function ShopV2Page({
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
    />
  );
}
