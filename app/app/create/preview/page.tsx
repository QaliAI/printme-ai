import { getApprovedMerchProducts } from '@/lib/commerce/catalog/approved-catalog';
import LegacyPreviewExperience from './LegacyPreviewExperience';
export default function PreviewPage() {
  return <LegacyPreviewExperience products={getApprovedMerchProducts()} />;
}
