import type { Metadata } from 'next';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { SeasonalEditSection } from '@/components/seasonal/SeasonalEditSection';
import { getApprovedMerchProducts } from '@/lib/commerce/catalog/approved-catalog';
import { getDesignCatalogService } from '@/lib/commerce/designs/service';
import { applyCommerceE2EReviewEconomics } from '@/lib/commerce/testing/review-economics';
import styles from './seasonal-landing.module.css';

export const metadata: Metadata = {
  title: 'Halloween pet art & personalized fall gifts',
  description: 'Transform your pet photo into Halloween art, create a gothic portrait, or personalize Haunted Household and Leftovers League gifts. Preview yours before buying.',
  alternates: { canonical: '/halloween' },
};

export default async function HalloweenPage() {
  const products = applyCommerceE2EReviewEconomics(getApprovedMerchProducts(), (await cookies()).get('printme-e2e-secret')?.value);
  const designs = await getDesignCatalogService().listPublished();
  return <main className={styles.page}>
    <header className={styles.intro}>
      <p>PrintMe · Halloween & Fall</p>
      <h1>A little haunted. Entirely yours.</h1>
      <p>Your pet, your household, your favorite fall tradition. Create original artwork and see it on a tee, mug, or poster before you buy.</p>
    </header>
    <section className={styles.offers} aria-label="Seasonal photo offers">
      <article><span>01 · Your pet photo</span><h2>Turn your pet into Halloween art</h2><p>Friendly ghosts, pumpkins, and the same distinctive pet you love. Upload a clear photo and choose Halloween pet art.</p><Link href="/create?style=halloween-pet&product=everyday-tee">Create my pet art →</Link></article>
      <article><span>02 · Your portrait</span><h2>A gothic, haunted photo portrait</h2><p>Candlelight and autumn mist, with your recognizable subject. Review the transformation before putting it on a product.</p><Link href="/create?style=haunted-portrait&product=gallery-poster">Create my haunted portrait →</Link></article>
    </section>
    <section className={styles.details} aria-label="How seasonal gifts work">
      <h2>See yours before you buy</h2>
      <ol><li>Upload a photo or personalize an original fall design.</li><li>Review the artwork, choose your product, and adjust the placement.</li><li>Add it to your bag. Make a matching set with the same design.</li></ol>
      <div className={styles.prices}>{products.map(product => <Link key={product.id} href={`/products/${product.id}`}>
        {product.name} · from {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Math.min(...product.variants.filter(v => v.available).map(v => v.unitPrice)) / 100)}
      </Link>)}</div>
      <p>Shipping is quoted for your products and US destination before checkout. Review the delivery estimate there; Halloween arrival is not guaranteed.</p>
      <p>Every print is made to order. If it arrives damaged or has a production defect, contact PrintMe for review and a reprint. Product pages explain care and return terms.</p>
    </section>
    <SeasonalEditSection products={products} designs={designs} />
  </main>;
}
