import type { Metadata } from 'next';
import { DesignDiscoveryPage } from '@/components/commerce/DesignDiscoveryPage';

export const metadata: Metadata = {
  title: 'New designs | PrintMe',
  description: 'Recently published PrintMe designs ready to customize.',
};

export default function NewDesignsPage() {
  return (
    <DesignDiscoveryPage
      filter="new"
      title="Newly published."
      description="The newest rights-cleared designs, ordered by real publication date."
    />
  );
}
