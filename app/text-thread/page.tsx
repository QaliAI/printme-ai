import { getApprovedMerchProducts } from '@/lib/commerce/catalog/approved-catalog';
import { TextThreadDesigner } from './TextThreadDesigner';

export const metadata = {
  title: 'Text Thread Designer | PrintMe',
  description: 'Turn a custom two-person text conversation into print-ready artwork for any PrintMe product.',
};

export default function TextThreadPage() {
  const products = getApprovedMerchProducts();
  const product = products[0];
  const variant = product?.variants.find((candidate) => candidate.available) ?? product?.variants[0];

  if (!product || !variant) {
    return (
      <main style={{ padding: '4rem 1.5rem', maxWidth: 760, margin: '0 auto' }}>
        <h1>Text Thread Designer</h1>
        <p>No approved PrintMe products are available right now.</p>
      </main>
    );
  }

  return (
    <TextThreadDesigner
      defaultProductId={product.id}
      defaultPrintifyVariantId={variant.printifyVariantId}
    />
  );
}
