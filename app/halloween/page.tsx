import type { Metadata } from 'next';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { SeasonalEditSection } from '@/components/seasonal/SeasonalEditSection';
import { getApprovedMerchProducts } from '@/lib/commerce/catalog/approved-catalog';
import { getDesignCatalogService } from '@/lib/commerce/designs/service';
import { applyCommerceE2EReviewEconomics } from '@/lib/commerce/testing/review-economics';
import { MerchandisePreview } from '@/components/commerce/MerchandisePreview';
import styles from './seasonal-landing.module.css';

export const metadata: Metadata = {
  title: 'Halloween Drop · Spooky stuff. But make it yours. | PrintMe',
  description:
    'Turn pets, couples, and inside jokes into one-of-a-kind Halloween merch. Personalize Haunted Household, create gothic portraits, and preview before you buy.',
  alternates: { canonical: '/halloween' },
};

function money(cents: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100);
}

export default async function HalloweenPage() {
  const cookieStore = await cookies();
  const products = applyCommerceE2EReviewEconomics(
    getApprovedMerchProducts(),
    cookieStore.get('printme-e2e-secret')?.value,
  );
  const designs = await getDesignCatalogService().listPublished();

  const hauntedHouseholdDesign =
    designs.find((d) => d.slug === 'haunted-household') ?? designs[0];
  const libraryDesign =
    designs.find((d) => d.slug === 'library-of-lost-hours') ?? designs[1];
  const booCrewDesign =
    designs.find((d) => d.slug === 'boo-crew') ?? designs[2];

  const teeProduct =
    products.find((p) => p.id === 'everyday-tee') ?? products[0];
  const mugProduct =
    products.find((p) => p.id === 'keepsake-mug') ?? products[1];

  return (
    <main className={styles.page}>
      {/* Hero Section */}
      <header className={styles.hero}>
        <div className={styles.heroContent}>
          <p className={styles.eyebrow}>October Limited Drop · Made to Order</p>
          <h1>Spooky stuff. But make it yours.</h1>
          <p className={styles.heroLead}>
            Turn pets, people, and inside jokes into one-of-a-kind Halloween merch.
            Wear it to the party, sip from it on the couch, or gift it to the friend
            who treats October 31 like a national holiday.
          </p>
          <div className={styles.heroActions}>
            <Link href="/create?style=halloween-pet" className={styles.heroPrimaryBtn}>
              Turn My Pet Into Halloween Art
            </Link>
            <Link href="/shop?design=haunted-household" className={styles.heroSecondaryBtn}>
              Shop Haunted Household
            </Link>
          </div>
          <div className={styles.trustStrip}>
            <span>✓ Preview before you buy</span>
            <span>✓ Made to order</span>
            <span>✓ Free defect/damage replacement</span>
          </div>
        </div>
      </header>

      {/* Hero Drop Offers */}
      <section className={styles.offersSection} aria-label="Halloween drop hero offers">
        <div className={styles.sectionHeader}>
          <span className={styles.sectionTag}>Featured Drops</span>
          <h2>The Halloween Lineup</h2>
          <p>Three ways to make spooky season weirdly yours.</p>
        </div>

        <div className={styles.offersGrid}>
          {/* Offer 1: Pet Art */}
          <article className={styles.offerCard}>
            <div className={styles.cardVisual}>
              <MerchandisePreview design={booCrewDesign} product={teeProduct} />
              <span className={styles.dropBadge}>Fan Favorite</span>
            </div>
            <div className={styles.cardBody}>
              <span className={styles.cardStep}>01 · Pet Transformation</span>
              <h3>Turn My Pet Into Halloween Art</h3>
              <p>
                Friendly ghosts, pumpkins, and witch hats centered on the pet you love.
                Upload any camera roll snap and see the transformation on a tee or mug.
              </p>
              <div className={styles.cardPriceRow}>
                <span className={styles.startingPrice}>From $19.00</span>
                <Link
                  href="/create?style=halloween-pet&product=everyday-tee"
                  className={styles.cardActionBtn}
                >
                  Create my pet art →
                </Link>
              </div>
            </div>
          </article>

          {/* Offer 2: Haunted Household */}
          <article className={styles.offerCard}>
            <div className={styles.cardVisual}>
              <MerchandisePreview
                design={hauntedHouseholdDesign}
                product={teeProduct}
              />
              <span className={styles.dropBadge}>Personalizable</span>
            </div>
            <div className={styles.cardBody}>
              <span className={styles.cardStep}>02 · Custom Clan</span>
              <h3>Haunted Household</h3>
              <p>
                An original ghost family portrait customizable with your family name,
                member avatars, and even pet ghosts. High-definition direct-to-garment print.
              </p>
              <div className={styles.cardPriceRow}>
                <span className={styles.startingPrice}>From $34.00</span>
                <Link
                  href="/shop?design=haunted-household"
                  className={styles.cardActionBtn}
                >
                  Personalize Yours →
                </Link>
              </div>
            </div>
          </article>

          {/* Offer 3: Gothic Portrait */}
          <article className={styles.offerCard}>
            <div className={styles.cardVisual}>
              <MerchandisePreview design={libraryDesign} product={mugProduct} />
              <span className={styles.dropBadge}>Ceramic & Fine Art</span>
            </div>
            <div className={styles.cardBody}>
              <span className={styles.cardStep}>03 · Dark Academia</span>
              <h3>Gothic / Haunted Portrait</h3>
              <p>
                Atmospheric candlelit mood and vintage nocturnal library aesthetics.
                Perfect on high-gloss ceramic coffee mugs and museum-grade gallery posters.
              </p>
              <div className={styles.cardPriceRow}>
                <span className={styles.startingPrice}>From $19.00</span>
                <Link
                  href="/create?style=haunted-portrait&product=gallery-poster"
                  className={styles.cardActionBtn}
                >
                  Create Portrait →
                </Link>
              </div>
            </div>
          </article>
        </div>
      </section>

      {/* Simple 3-step explanation: Upload -> Preview -> Print */}
      <section className={styles.howItWorksSection} aria-label="How Halloween gifts work">
        <div className={styles.sectionHeader}>
          <span className={styles.sectionTag}>How It Works</span>
          <h2>Zero guesswork. 100% yours.</h2>
        </div>

        <div className={styles.stepsGrid}>
          <div className={styles.stepCard}>
            <div className={styles.stepNum}>1</div>
            <h4>Upload</h4>
            <p>Drop a photo of your pet, best friend, or favorite inside joke from any phone or laptop.</p>
          </div>
          <div className={styles.stepCard}>
            <div className={styles.stepNum}>2</div>
            <h4>Preview</h4>
            <p>See it rendered live on approved tees, ceramic mugs, or matte posters with real placement.</p>
          </div>
          <div className={styles.stepCard}>
            <div className={styles.stepNum}>3</div>
            <h4>Print</h4>
            <p>Crafted to order with archival inks. Delivered straight to your doorstep ready to gift.</p>
          </div>
        </div>

        <div className={styles.shippingNotice}>
          <p>
            <strong>Shipping Notice:</strong> Every item is printed to order in 2–3 business days. US carrier shipping is calculated live at checkout based on your delivery address. Order early for Halloween festivities!
          </p>
          <div className={styles.productLinks}>
            {products.map((product) => {
              const startPrice = Math.min(
                ...product.variants.filter((v) => v.available).map((v) => v.unitPrice),
              );
              return (
                <Link
                  key={product.id}
                  href={`/products/${product.merchandising?.slug ?? product.id}`}
                  className={styles.productLinkPill}
                >
                  {product.name} · from {money(startPrice)}
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* The Seasonal Edit section */}
      <SeasonalEditSection products={products} designs={designs} />
    </main>
  );
}
