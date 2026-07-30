import { redirect } from 'next/navigation';
import { getApprovedMerchProducts } from '@/lib/commerce/catalog/approved-catalog';
import { UnifiedCreateExperience } from './UnifiedCreateExperience';

export const metadata = {
  title: 'Create a custom print | PrintMe',
  description:
    'Upload once, prepare your artwork, and position it on an approved PrintMe product.',
};

export default async function CreatePage({
  searchParams,
}: {
  searchParams: Promise<{ product?: string }>;
}) {
  if (process.env.NEXT_PUBLIC_UNIFIED_CREATE_ENABLED !== 'true') {
    redirect('/app/create/upload');
  }

  const requestedProduct = (await searchParams).product;
  const products = getApprovedMerchProducts();
  const requestedIndex = products.findIndex(
    (product) => product.id === requestedProduct,
  );
  if (requestedIndex > 0) {
    products.unshift(products.splice(requestedIndex, 1)[0]);
  }
  return <UnifiedCreateExperience products={products} />;
}
