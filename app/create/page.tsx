import { redirect } from 'next/navigation';
import { getApprovedMerchProducts } from '@/lib/commerce/catalog/approved-catalog';
import { UnifiedCreateExperience } from './UnifiedCreateExperience';

export const metadata = {
  title: 'Create a custom print | PrintMe',
  description:
    'Upload once, prepare your artwork, and position it on an approved PrintMe product.',
};

export default function CreatePage() {
  if (process.env.NEXT_PUBLIC_UNIFIED_CREATE_ENABLED !== 'true') {
    redirect('/app/create/upload');
  }

  return <UnifiedCreateExperience products={getApprovedMerchProducts()} />;
}
