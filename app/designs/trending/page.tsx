import type { Metadata } from 'next';
import { DesignDiscoveryPage } from '@/components/commerce/DesignDiscoveryPage';

export const metadata: Metadata = {
  title: 'Staff picks | PrintMe',
  description: 'Designs the PrintMe studio is featuring this season. Editorial picks, not a popularity ranking.',
};

export default function TrendingDesignsPage() {
  return (
    <DesignDiscoveryPage
      filter="trending"
      title="Staff picks."
      description="Designs our studio is featuring this season. Editorial picks, not a popularity ranking."
    />
  );
}
