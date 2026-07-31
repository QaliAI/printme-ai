import type { Metadata } from 'next';
import { DesignDiscoveryPage } from '@/components/commerce/DesignDiscoveryPage';

export const metadata: Metadata = {
  title: 'Bestselling designs | PrintMe',
  description: 'PrintMe designs ranked only by paid order quantities.',
};

export default function BestsellingDesignsPage() {
  return (
    <DesignDiscoveryPage
      filter="bestsellers"
      title="Bestsellers."
      description="Only designs with paid order quantities appear here. No fabricated rankings."
    />
  );
}
