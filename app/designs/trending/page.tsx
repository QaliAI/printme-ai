import type { Metadata } from 'next';
import { DesignDiscoveryPage } from '@/components/commerce/DesignDiscoveryPage';

export const metadata: Metadata = {
  title: 'Trending designs | PrintMe',
  description: 'PrintMe designs with recent weighted engagement.',
};

export default function TrendingDesignsPage() {
  return (
    <DesignDiscoveryPage
      filter="trending"
      title="Trending now."
      description="Recent interest weighted toward meaningful cart engagement."
    />
  );
}
