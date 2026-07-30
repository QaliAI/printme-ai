import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ShopV2Experience } from './ShopV2Experience';
import { curatedDesigns } from '@/lib/commerce/fixtures';
import { getApprovedMerchProducts } from '@/lib/commerce/catalog/approved-catalog';

export const metadata: Metadata = {
  title: 'Curated Shop Preview | PrintMe.ai',
  description: 'Feature-flagged commerce preview for PrintMe.ai.',
};

export default function ShopV2Page() {
  if (process.env.NEXT_PUBLIC_COMMERCE_V2_ENABLED !== 'true') {
    notFound();
  }

  return (
    <ShopV2Experience
      designs={curatedDesigns}
      products={getApprovedMerchProducts()}
    />
  );
}
