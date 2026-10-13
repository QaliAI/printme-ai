import type { Metadata } from 'next';
import Link from 'next/link';
import { getApprovedMerchProducts } from '@/lib/commerce/catalog/approved-catalog';
import { developmentDesignSeeds } from '@/lib/commerce/designs/seed';
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

const productUseCases: Record<string, string> = {
  'everyday-tee': 'Heavyweight 100% ring-spun cotton. Built for family jokes, pet art, and durable all-day comfort.',
  'keepsake-mug': 'High-gloss 11 oz ceramic. Dishwasher-safe with vibrant double-sided print reproduction.',
  'gallery-poster': 'Archival matte fine-art paper. Rich museum-grade ink ready for framed walls and gift boxes.',
};

export default function ProductsPage() {
  const products = getApprovedMerchProducts();
  const sampleDesign = developmentDesignSeeds[0];

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
          const useCase = productUseCases[product.id] ?? product.description;

          return (
            <article className={styles.card} key={product.id}>
              <div className={styles.cardVisual}>
                <MerchandisePreview design={sampleDesign} product={product} />
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
