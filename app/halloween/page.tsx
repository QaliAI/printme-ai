import type { Metadata } from 'next';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { SeasonalEditSection } from '@/components/seasonal/SeasonalEditSection';
import { AI_STYLES_ENABLED } from '@/lib/ai/availability';
import { getApprovedMerchProducts } from '@/lib/commerce/catalog/approved-catalog';
import { getDesignCatalogService } from '@/lib/commerce/designs/service';
import { applyCommerceE2EReviewEconomics } from '@/lib/commerce/testing/review-economics';
import type { MerchProduct } from '@/lib/commerce/types';
import styles from './seasonal-landing.module.css';

export const metadata: Metadata = {
  title: 'Halloween · The Slasher Shop',
  description:
    'Halloween pet art and gothic portraits from your own photo, plus personalized haunted designs. Preview the exact product before you buy.',
  alternates: { canonical: '/halloween' },
};

const usd = (cents: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(cents / 100);
const fromPrice = (product: MerchProduct) =>
  Math.min(...product.variants.filter((v) => v.available).map((v) => v.unitPrice));

export default async function HalloweenPage() {
  const cookieStore = await cookies();
  const products = applyCommerceE2EReviewEconomics(getApprovedMerchProducts(), cookieStore.get('printme-e2e-secret')?.value);
  const designs = await getDesignCatalogService().listPublished();
  const tee = products.find((p) => p.id === 'everyday-tee') ?? products[0];
  const mug = products.find((p) => p.id === 'keepsake-mug') ?? products[0];
  const poster = products.find((p) => p.id === 'gallery-poster') ?? products[0];

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className={styles.tag}>Halloween · Made to order</p>
          <h1 className={styles.title}>
            <span>The</span> <span data-tone="acid">Slasher</span> <span data-tone="paper">Shop</span>
          </h1>
          <p className={styles.lead}>
            Spooky stuff, but make it yours: your pet as Halloween art, your face as a candlelit gothic portrait, or your family&apos;s names on a haunted design.
          </p>
          <div className={styles.actions}>
            {AI_STYLES_ENABLED ? (
              <>
                <Link href="/create?style=halloween-pet&product=everyday-tee" className={styles.btnAcid}>
                  Turn my pet into Halloween art
                </Link>
                <Link href="/create?style=haunted-portrait" className={styles.btnPaper}>
                  Gothic portrait from a photo
                </Link>
              </>
            ) : (
              <>
                <a href="#seasonal-edit" className={styles.btnAcid}>
                  Personalize a Halloween design
                </a>
                <Link href="/#make" className={styles.btnPaper}>
                  Cut out your pet photo
                </Link>
              </>
            )}
          </div>
          <ul className={styles.facts}>
            <li>Preview before you buy</li>
            <li>Printed to order</li>
            <li>Tees {usd(fromPrice(tee))} · Mugs {usd(fromPrice(mug))} · Posters {usd(fromPrice(poster))}</li>
          </ul>
        </div>
        {AI_STYLES_ENABLED ? (
          <div className={styles.aiGrid} aria-label="AI Halloween styles">
            <Link href="/create?style=halloween-pet" className={styles.aiCard}>
              <span className={styles.aiType} aria-hidden="true">
                Your pet.
                <em>But spooky.</em>
              </span>
              <strong>Halloween pet art</strong>
              <small>AI style · keeps your pet&apos;s markings · you see the result before paying</small>
            </Link>
            <Link href="/create?style=haunted-portrait" className={styles.aiCard}>
              <span className={styles.aiType} aria-hidden="true">
                Your face.
                <em>By candlelight.</em>
              </span>
              <strong>Gothic haunted portrait</strong>
              <small>AI style · upload any clear photo · preview on a tee, mug or poster</small>
            </Link>
          </div>
        ) : (
          <div className={styles.aiGrid} aria-label="Make it yours">
            <a href="#seasonal-edit" className={styles.aiCard}>
              <span className={styles.aiType} aria-hidden="true">
                Your names.
                <em>Haunted.</em>
              </span>
              <strong>Personalized Halloween designs</strong>
              <small>Add family or pet names · preview on a tee, mug or poster</small>
            </a>
            <Link href="/#make" className={styles.aiCard}>
              <span className={styles.aiType} aria-hidden="true">
                Your pet.
                <em>Cut out clean.</em>
              </span>
              <strong>Pet photo cutout</strong>
              <small>Background removed in seconds · refine the edges · print it on anything</small>
            </Link>
          </div>
        )}
      </header>

      <SeasonalEditSection products={products} designs={designs} />

      <section className={styles.notice} aria-label="Halloween ordering">
        <p>
          <strong>Ordering for Halloween?</strong> Every item is printed when you order. Production and shipping estimates are shown at checkout, so order early.
        </p>
        <div className={styles.productLinks}>
          {products.map((product) => (
            <Link key={product.id} href={`/products/${product.merchandising?.slug ?? product.id}`}>
              {product.name} · from {usd(fromPrice(product))}
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
