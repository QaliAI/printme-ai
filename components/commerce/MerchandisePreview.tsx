import { createProductConfiguration } from '@/lib/commerce/placement';
import { getPreviewTemplate } from '@/lib/commerce/templates';
import type { CuratedDesign, MerchProduct } from '@/lib/commerce/types';
import { InstantPreview } from './InstantPreview';

/** Merchandising uses the editor's renderer and placement, without editor UI. */
export function MerchandisePreview({
  design,
  product
}: {
  design: CuratedDesign;
  product: MerchProduct;
}) {
  const configuration = createProductConfiguration({
    designId: design.id,
    design: design.asset,
    product,
    template: getPreviewTemplate(product.previewTemplateId)
  });
  return <InstantPreview design={design.asset} configuration={configuration} showSafeZone={false} presentation="merchandising" />;
}
