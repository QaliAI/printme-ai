import { Suspense } from 'react';
import { getApprovedMerchProducts } from '@/lib/commerce/catalog/approved-catalog';
import { LegacyProductsExperience } from './LegacyProductsExperience';
export default function ProductsPage() {
  return <Suspense fallback={<p>Loading your artwork…</p>}><LegacyProductsExperience products={getApprovedMerchProducts()} /></Suspense>;
}
