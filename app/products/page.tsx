import type { Metadata } from 'next';
import Link from 'next/link';
import { getApprovedMerchProducts } from '@/lib/commerce/catalog/approved-catalog';
import { getProductCheckoutReadiness } from '@/lib/commerce/margin';
import styles from './products.module.css';

export const metadata: Metadata = {
  title: 'Custom products | PrintMe',
  description: 'PrintMe approved products with real provider mappings.',
};

function money(cents: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100);
}

export default function ProductsPage() {
  const products = getApprovedMerchProducts();
  return (
    <main className={styles.shell}>
      <header className={styles.header}>
        <div>
          <p>Approved, previewed, and server priced</p>
          <h1>Choose the object.</h1>
        </div>
        <Link href="/create">Create yours</Link>
      </header>
      <section className={styles.grid}>
        {products.map((product) => {
          const starting = Math.min(
            ...product.variants
              .filter((variant) => variant.available)
              .map((variant) => variant.unitPrice),
          );
          const readiness = getProductCheckoutReadiness(product);
          return (
            <Link
              className={styles.card}
              href={`/products/${product.merchandising?.slug ?? product.id}`}
              key={product.id}
            >
              <small>
                {readiness.ready
                  ? 'Checkout ready'
                  : 'Preview ready · cost sync pending'}
              </small>
              <strong>{product.name}</strong>
              <span>from {money(starting)}</span>
            </Link>
          );
        })}
      </section>
    </main>
  );
}
