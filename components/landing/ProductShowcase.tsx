import Link from 'next/link';
import { Container } from '@/components/Container';
import { MerchandisePreview } from '@/components/commerce/MerchandisePreview';
import type { CuratedDesign, MerchProduct } from '@/lib/commerce/types';
export function ProductShowcase({
  products,
  design
}: {
  products: MerchProduct[];
  design: CuratedDesign;
}) {
  return <section id="products" className="bg-slate-50 py-24"><Container size="lg">
    <h2 className="mb-4 text-4xl font-bold">Made for everyday moments</h2>
    <p className="mb-10">Choose a tee, mug, or poster. Every item is made to order.</p>
    <div className="grid gap-5 md:grid-cols-3" data-testid="homepage-product-showcase">
      {products.map(product => <Link key={product.id} href={`/products/${product.merchandising?.slug ?? product.id}`} className="overflow-hidden rounded-2xl bg-white">
        <MerchandisePreview design={design} product={product} />
        <div className="p-5"><h3 className="font-semibold">{product.name}</h3><p>From {new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD'
              }).format(Math.min(...product.variants.filter(variant => variant.available).map(variant => variant.unitPrice)) / 100)}</p></div>
      </Link>)}
    </div>
  </Container></section>;
}
