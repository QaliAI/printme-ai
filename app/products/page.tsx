import type { Metadata } from 'next';
import Link from 'next/link';
import { getApprovedMerchProducts } from '@/lib/commerce/catalog/approved-catalog';
import { getDesignCatalogService } from '@/lib/commerce/designs/service';
import { productCopy } from '@/lib/commerce/product-copy';
import { MerchandisePreview } from '@/components/commerce/MerchandisePreview';
import styles from './products.module.css';

export const metadata: Metadata = {
  title: 'Custom Gifts & Products | PrintMe',
  description: 'Three made-to-order classics designed for high-resolution photo and artwork reproduction.',
  alternates: { canonical: '/products' },
};

function money(cents: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100);
}

export default async function ProductsPage() {
  const products = getApprovedMerchProducts();
  const designs = await getDesignCatalogService().listPublished();

  return (
    <main className={styles.shell}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Three classics · Made to order</p>
          <h1>Choose your canvas.</h1>
        </div>
        <Link href="/create" className={styles.headerCta}>
          Create yours →
        </Link>
      </header>

      <section className={styles.grid}>
        {products.map((product) => {
          const starting = Math.min(
            ...product.variants
              .filter((variant) => variant.available)
              .map((variant) => variant.unitPrice),
          );
          const slug = product.merchandising?.slug ?? product.id;
          const useCase = productCopy[product.id]?.detail ?? product.description;
          // Each product is shown with a published design made for it, not one shared seed.
          const sampleDesign =
            designs.find((design) => design.recommendedProductId === product.id) ??
            designs.find((design) => design.compatibleProductIds.includes(product.id));

          return (
            <article className={styles.card} key={product.id}>
              <div className={styles.cardVisual}>
                {sampleDesign && <MerchandisePreview design={sampleDesign} product={product} />}
              </div>
              <div className={styles.cardInfo}>
                <span className={styles.badge}>Made to order</span>
                <Link href={`/products/${slug}`} className={styles.titleLink}>
                  <strong>{product.name}</strong>
                </Link>
                <p className={styles.useCase}>{useCase}</p>
                <div className={styles.cardFooter}>
                  <span className={styles.priceTag}>from {money(starting)}</span>
                  <div className={styles.cardActions}>
                    <Link
                      className={styles.secondaryBtn}
                      href={`/products/${slug}`}
                    >
                      Details
                    </Link>
                    <Link
                      className={styles.primaryBtn}
                      href={`/create?product=${encodeURIComponent(product.id)}`}
                    >
                      Customize
                    </Link>
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </section>
    </main>
  );
}
