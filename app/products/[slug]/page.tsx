import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { InstantPreview } from '@/components/commerce/InstantPreview';
import { getApprovedMerchProducts } from '@/lib/commerce/catalog/approved-catalog';
import Image from 'next/image';
import { getDesignCatalogService } from '@/lib/commerce/designs/service';
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
  // Published designs made for this product first, then any compatible ones.
  const published = await getDesignCatalogService().listPublished();
  const gallery = [
    ...published.filter((item) => item.recommendedProductId === product.id),
    ...published.filter((item) => item.recommendedProductId !== product.id && item.compatibleProductIds.includes(product.id)),
  ].slice(0, 4);
  const configure = (item: (typeof gallery)[number]) =>
    createProductConfiguration({
      designId: item.id,
      design: item.asset,
      product,
      template: getPreviewTemplate(product.previewTemplateId),
    });
  const design = gallery[0];
  const configuration = design ? configure(design) : null;
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
          {design && configuration && (
            <InstantPreview
              design={design.asset}
              configuration={configuration}
              showSafeZone={false}
              presentation="merchandising"
            />
          )}
          {gallery.length > 1 && (
            <ul className={styles.gallery} aria-label={`More designs on the ${product.name}`}>
              {gallery.slice(1).map((item) => (
                <li key={item.id}>
                  <Link href={`/designs/${item.slug}`} aria-label={item.title}>
                    <InstantPreview design={item.asset} configuration={configure(item)} showSafeZone={false} compact presentation="merchandising" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {product.id === 'everyday-tee' && (
            <div className={styles.gallery} aria-label="The blank, up close">
              <Image src="/shop-v2/photo/tee-detail-shoulder.webp" alt="Bella+Canvas 3001 shoulder seam, Printify catalog photo" width={900} height={900} sizes="(max-width: 800px) 45vw, 20vw" />
              <Image src="/shop-v2/photo/tee-detail-collar.webp" alt="Bella+Canvas 3001 ribbed collar, Printify catalog photo" width={900} height={900} sizes="(max-width: 800px) 45vw, 20vw" />
            </div>
          )}
        </div>
        <section className={styles.copy}>
          <p>{product.merchandising.printMethod}</p>
          <h1>{product.name}</h1>
          <p>{product.description}</p>
          <strong className={styles.price}>from {money(starting)}</strong>
          <div className={styles.productBadgeRow}>
            <span className={styles.trustBadge}>Made to order</span>
            <span className={styles.trustBadge}>Preview before purchase</span>
            <span className={styles.trustBadge}>Damage/defect replacement</span>
          </div>
          {!readiness.ready && (
            <p className={styles.consumerNotice}>
              Made to order · Instant preview available. Production and shipping estimates are shown at checkout.
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
