import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { getApprovedMerchProducts } from '@/lib/commerce/catalog/approved-catalog';
import { UnifiedCreateExperience } from './UnifiedCreateExperience';
import { isReviewFeatureEnabled } from '@/lib/feature-flags';
import { applyCommerceE2EReviewEconomics } from '@/lib/commerce/testing/review-economics';
import { photoStyles, type PhotoStyle } from '@/lib/ai/photo-styles';
export const metadata = {
  title: 'Create a custom print',
  description: 'Upload once, prepare your artwork, and position it on an approved PrintMe product.'
};
export default async function CreatePage({
  searchParams
}: {
  searchParams: Promise<{
    product?: string;
    style?: string;
    artwork?: string;
  }>;
}) {
  if (!isReviewFeatureEnabled('unified-create')) {
    redirect('/app/create/upload');
  }
  const query = await searchParams;
  const requestedProduct = query.product;
  const initialPhotoStyle = query.style && Object.hasOwn(photoStyles, query.style) ? query.style as PhotoStyle : undefined;
  const cookieStore = await cookies();
  const products = applyCommerceE2EReviewEconomics(getApprovedMerchProducts(), cookieStore.get('printme-e2e-secret')?.value);
  const requestedIndex = products.findIndex(product => product.id === requestedProduct);
  if (requestedIndex > 0) {
    products.unshift(products.splice(requestedIndex, 1)[0]);
  }
  return <UnifiedCreateExperience products={products} initialPhotoStyle={initialPhotoStyle} initialArtworkUrl={query.artwork && (['https://', 'data:image/', 'blob:'].some(prefix => query.artwork!.startsWith(prefix)) || (query.artwork.startsWith('/') && !query.artwork.startsWith('//'))) ? query.artwork : undefined} />;
}
