import { getApprovedMerchProducts } from '@/lib/commerce/catalog/approved-catalog';
import { StudioDesignEditor } from '../StudioDesignEditor';

export default async function StudioDesignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <StudioDesignEditor
      products={getApprovedMerchProducts()}
      existingDesignId={id}
    />
  );
}
