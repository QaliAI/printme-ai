import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ShopV2Experience } from './ShopV2Experience';
import { getApprovedMerchProducts } from '@/lib/commerce/catalog/approved-catalog';
import { getDesignCatalogService } from '@/lib/commerce/designs/service';

export const metadata: Metadata = {
  title: 'Curated Shop Preview | PrintMe.ai',
  description: 'Feature-flagged commerce preview for PrintMe.ai.',
};

export default async function ShopV2Page({
  searchParams,
}: {
  searchParams: Promise<{ design?: string }>;
}) {
  if (process.env.NEXT_PUBLIC_COMMERCE_V2_ENABLED !== 'true') {
    notFound();
  }

  const designs = await getDesignCatalogService().listPublished();
  return (
    <ShopV2Experience
      designs={designs}
      products={getApprovedMerchProducts()}
      initialDesignSlug={(await searchParams).design}
    />
  );
}
