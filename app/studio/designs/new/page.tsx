import { getApprovedMerchProducts } from '@/lib/commerce/catalog/approved-catalog';
import { StudioDesignEditor } from '../StudioDesignEditor';

export default function NewStudioDesignPage() {
  return <StudioDesignEditor products={getApprovedMerchProducts()} />;
}
