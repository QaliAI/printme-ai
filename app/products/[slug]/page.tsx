import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { InstantPreview } from '@/components/commerce/InstantPreview';
import { getApprovedMerchProducts } from '@/lib/commerce/catalog/approved-catalog';
import { developmentDesignSeeds } from '@/lib/commerce/designs/seed';
import { getProductCheckoutReadiness } from '@/lib/commerce/margin';
import { createProductConfiguration } from '@/lib/commerce/placement';
import { getPreviewTemplate } from '@/lib/commerce/templates';
import styles from '../products.module.css';

function findProduct(slug: string) {
  return getApprovedMerchProducts().find(
    (product) => (product.merchandising?.slug ?? product.id) === slug,
  );
}

function money(cents: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const product = findProduct((await params).slug);
  if (!product) return {};
  return {
    title: `${product.name} | PrintMe`,
    description: product.description,
  };
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const product = findProduct((await params).slug);
  if (!product?.merchandising) notFound();
  const design =
    developmentDesignSeeds.find((item) =>
      item.compatibleProductIds.includes(product.id),
    ) ?? developmentDesignSeeds[0];
  const configuration = createProductConfiguration({
    designId: design.id,
    design: design.asset,
    product,
    template: getPreviewTemplate(product.previewTemplateId),
  });
  const starting = Math.min(
    ...product.variants
      .filter((variant) => variant.available)
      .map((variant) => variant.unitPrice),
  );
  const readiness = getProductCheckoutReadiness(product);
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description,
    brand: { '@type': 'Brand', name: 'PrintMe' },
    offers: product.variants
      .filter((variant) => variant.available)
      .map((variant) => ({
        '@type': 'Offer',
        priceCurrency: variant.currency,
        price: (variant.unitPrice / 100).toFixed(2),
        availability: readiness.ready
          ? 'https://schema.org/InStock'
          : 'https://schema.org/PreOrder',
      })),
  };

  return (
    <main className={styles.shell}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c'),
        }}
      />
      <nav aria-label="Breadcrumb">
        <Link href="/">Home</Link> / <Link href="/products">Products</Link> /{' '}
        {product.name}
      </nav>
      <div className={styles.detail}>
        <div className={styles.preview}>
          <InstantPreview
            design={design.asset}
            configuration={configuration}
          />
        </div>
        <section className={styles.copy}>
          <p>{product.merchandising.printMethod}</p>
          <h1>{product.name}</h1>
          <p>{product.description}</p>
          <strong className={styles.price}>from {money(starting)}</strong>
          {!readiness.ready && (
            <p className={styles.warning}>
              Preview available. Checkout remains blocked until provider unit
              and shipping costs are synchronized.
            </p>
          )}
          <Link
            href={`/create?product=${encodeURIComponent(product.id)}`}
            className={styles.action}
          >
            Create Yours
          </Link>
          <dl className={styles.facts}>
            <div>
              <dt>Material</dt>
              <dd>{product.merchandising.material}</dd>
            </div>
            <div>
              <dt>Fit and sizes</dt>
              <dd>
                {product.merchandising.fit}.{' '}
                {product.merchandising.sizeGuide
                  .map((size) => size.label)
                  .join(', ')}
              </dd>
            </div>
            <div>
              <dt>Available colors</dt>
              <dd>
                {[
                  ...new Set(
                    product.variants
                      .filter((variant) => variant.available)
                      .map((variant) => variant.color)
                      .filter(Boolean),
                  ),
                ].join(', ')}
              </dd>
            </div>
            <div>
              <dt>Production</dt>
              <dd>{product.merchandising.productionEstimate}</dd>
            </div>
            <div>
              <dt>Delivery and shipping</dt>
              <dd>{product.merchandising.shippingExplanation}</dd>
            </div>
            <div>
              <dt>Care</dt>
              <dd>{product.merchandising.careInstructions.join(' ')}</dd>
            </div>
            <div>
              <dt>Returns and reprints</dt>
              <dd>{product.merchandising.returnPolicy}</dd>
            </div>
          </dl>
          <div className={styles.faq}>
            <h2>Product FAQ</h2>
            {product.merchandising.faq.map((item) => (
              <article key={item.question}>
                <strong>{item.question}</strong>
                <p>{item.answer}</p>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
