import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { getApprovedMerchProducts } from '@/lib/commerce/catalog/approved-catalog';
import { UnifiedCreateExperience } from './UnifiedCreateExperience';
import { isReviewFeatureEnabled } from '@/lib/feature-flags';
import { applyCommerceE2EReviewEconomics } from '@/lib/commerce/testing/review-economics';

export const metadata = {
  title: 'Create a custom print',
  description:
    'Upload once, prepare your artwork, and position it on an approved PrintMe product.',
};

export default async function CreatePage({
  searchParams,
}: {
  searchParams: Promise<{ product?: string }>;
}) {
  if (!isReviewFeatureEnabled('unified-create')) {
    redirect('/app/create/upload');
  }

  const requestedProduct = (await searchParams).product;
  const cookieStore = await cookies();
  const products = applyCommerceE2EReviewEconomics(
    getApprovedMerchProducts(),
    cookieStore.get('printme-e2e-secret')?.value,
  );
  const requestedIndex = products.findIndex(
    (product) => product.id === requestedProduct,
  );
  if (requestedIndex > 0) {
    products.unshift(products.splice(requestedIndex, 1)[0]);
  }
  return <UnifiedCreateExperience products={products} />;
}
