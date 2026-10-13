import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { SeasonalEditSection } from '@/components/seasonal/SeasonalEditSection';
import { getApprovedMerchProducts } from '@/lib/commerce/catalog/approved-catalog';
import { getDesignCatalogService } from '@/lib/commerce/designs/service';
import { applyCommerceE2EReviewEconomics } from '@/lib/commerce/testing/review-economics';
import { MerchandisePreview } from '@/components/commerce/MerchandisePreview';
import type { MerchProduct } from '@/lib/commerce/types';
import styles from './seasonal-landing.module.css';

export const metadata: Metadata = {
  title: 'Halloween · The Slasher Shop',
  description:
    'Gothic pet portraits, personalized haunted designs and original horror-comedy merch. Preview the exact product before you buy.',
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
  const bySlug = new Map(designs.map((d) => [d.slug, d]));
  const tee = products.find((p) => p.id === 'everyday-tee') ?? products[0];
  const mug = products.find((p) => p.id === 'keepsake-mug') ?? products[0];
  const poster = products.find((p) => p.id === 'gallery-poster') ?? products[0];
  const creature = bySlug.get('creature-of-habit') ?? designs[0];
  const library = bySlug.get('library-of-lost-hours') ?? designs[0];

  const lineup = [
    { design: creature, product: tee, note: 'Original art' },
    { design: creature, product: mug, note: 'Original art' },
    { design: library, product: mug, note: 'Add your name' },
    { design: creature, product: poster, note: 'Original art' },
  ].filter((item) => item.design.compatibleProductIds.includes(item.product.id));

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className={styles.tag}>Halloween · Made to order</p>
          <h1 className={styles.title}>
            <span>The</span> <span data-tone="acid">Slasher</span> <span data-tone="paper">Shop</span>
          </h1>
          <p className={styles.lead}>
            Spooky stuff, but make it yours: your pet as gothic Halloween art, your name on a haunted library card, or a monster that runs on coffee.
          </p>
          <div className={styles.actions}>
            <Link href="/create?style=halloween-pet&product=everyday-tee" className={styles.btnAcid}>
              Turn my pet into Halloween art
            </Link>
            <Link href="/create?style=haunted-portrait" className={styles.btnPaper}>
              Gothic portrait from a photo
            </Link>
          </div>
          <ul className={styles.facts}>
            <li>Preview before you buy</li>
            <li>Printed to order</li>
            <li>Tees {usd(fromPrice(tee))} · Mugs {usd(fromPrice(mug))} · Posters {usd(fromPrice(poster))}</li>
          </ul>
        </div>
        <figure className={styles.heroPhoto}>
          <Image
            src="/lifestyle/creature-of-habit-detail.webp"
            alt="Close-up of the Creature of Habit print on a white tee"
            width={1200}
            height={1500}
            priority
            sizes="(max-width: 900px) 100vw, 42vw"
          />
          <figcaption>Styled photo</figcaption>
        </figure>
      </header>

      <section className={styles.lineup} id="lineup" aria-labelledby="lineup-heading">
        <div className={styles.sectionHead}>
          <h2 id="lineup-heading">The lineup</h2>
          <p>Exact print previews on the approved products.</p>
        </div>
        <ul className={styles.grid}>
          {lineup.map(({ design, product, note }) => (
            <li key={`${design.id}-${product.id}`}>
              <Link href={`/shop?design=${encodeURIComponent(design.slug)}`} className={styles.card}>
                <span className={styles.cardMedia}>
                  <MerchandisePreview design={design} product={product} />
                </span>
                <span className={styles.cardMeta}>
                  <small>{note}</small>
                  <strong>{design.title}</strong>
                  <span>
                    {product.name} <b>{usd(fromPrice(product))}</b>
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className={styles.ai} aria-labelledby="ai-heading">
        <h2 id="ai-heading">Bring your own victim</h2>
        <div className={styles.aiGrid}>
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
      </section>

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
