import { MerchandisePreview } from '@/components/commerce/MerchandisePreview';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Camera, ShoppingBag } from 'lucide-react';
import { getApprovedMerchProducts } from '@/lib/commerce/catalog/approved-catalog';
import { getDesignCatalogService } from '@/lib/commerce/designs/service';
import { SeasonalEditSection } from '@/components/seasonal/SeasonalEditSection';
import { SiteFooter } from '@/components/brand/SiteFooter';
import { HeroProductSwitcher } from './HeroProductSwitcher';
import { HomeCommerceShowcase } from './HomeCommerceShowcase';
import styles from '@/app/home-v2.module.css';

function formatPrice(cents: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

const studioSamples = [
  {
    src: '/landing/transformations/pet-cartoon.webp',
    alt: 'Colorful illustrated pet portrait prepared for printing',
    label: 'Pet portrait',
  },
  {
    src: '/landing/transformations/family-oil-painting.webp',
    alt: 'Family photograph transformed into painterly artwork',
    label: 'Family keepsake',
  },
  {
    src: '/landing/transformations/travel-watercolor.webp',
    alt: 'Travel photograph transformed into watercolor artwork',
    label: 'Travel memory',
  },
];

export async function HomepageV2() {
  const products = getApprovedMerchProducts();
  const designs = await getDesignCatalogService().listPublished();
  const startingPrice = Math.min(
    ...products.flatMap((product) =>
      product.variants
        .filter((variant) => variant.available)
        .map((variant) => variant.unitPrice),
    ),
  );

  const fallDesigns = designs.filter((d) => d.tags.includes('fall-2026'));
  const showcaseDesigns = fallDesigns.length > 0 ? fallDesigns.slice(0, 6) : designs.slice(0, 4);

  return (
    <div className={styles.homeV2}>
      {/* 1. HERO */}
      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>Personalized gifts that don&apos;t feel generic.</p>
          <h1>Your photo. Your joke. Your merch.</h1>
          <p>
            Turn pets, people, and inside jokes into one-of-a-kind art you can print on
            gifts you&apos;ll actually want to give.
          </p>
          <div className={styles.heroActions}>
            <Link href="/create">Make Something</Link>
            <Link href="/halloween">Shop Halloween</Link>
          </div>
          <span className={styles.startingPrice}>
            Custom items from {formatPrice(startingPrice)} · $19 Mug, $29 Poster, $34 Tee
          </span>
          <div className={styles.heroTrustStrip}>
            <span>✓ Preview before you buy</span>
            <span>✓ Made to order</span>
            <span>✓ Damage/defect replacement</span>
          </div>
        </div>
        <HeroProductSwitcher products={products} design={showcaseDesigns[0]} />
      </section>

      {/* 2. HALLOWEEN / CURRENT DROP */}
      <SeasonalEditSection products={products} designs={designs} />

      {/* 3. HOW IT WORKS — 3 simple steps */}
      <section className={styles.howItWorksSection} aria-label="How PrintMe Works">
        <div className={styles.sectionHeading}>
          <h2>Zero guesswork. 100% yours.</h2>
          <p>From camera roll snap to tangible gift in three simple steps.</p>
        </div>
        <div className={styles.stepsGrid}>
          <div className={styles.stepCard}>
            <div className={styles.stepNum}>1</div>
            <h3>Upload</h3>
            <p>
              Drop a photo of your pet, best friend, or favorite inside joke from any phone or computer.
            </p>
          </div>
          <div className={styles.stepCard}>
            <div className={styles.stepNum}>2</div>
            <h3>Preview</h3>
            <p>
              See it rendered live on real approved blanks with pixel-accurate print bounds and realistic draping.
            </p>
          </div>
          <div className={styles.stepCard}>
            <div className={styles.stepNum}>3</div>
            <h3>Print</h3>
            <p>
              Crafted to order with archival inks. Delivered straight to your doorstep ready to gift.
            </p>
          </div>
        </div>
      </section>

      {/* 4. PERSONALIZED BEST SELLERS (3 Anchor Products + Interactive Customizer) */}
      <section className={styles.productsSection} id="products">
        <div className={styles.sectionHeading}>
          <h2>The 3 Anchor Products</h2>
          <p>Curated for durable color, reliable fit, and guaranteed print quality.</p>
        </div>
        <div className={styles.productGrid} data-testid="homepage-product-showcase">
          {products.map((product, index) => {
            const price = Math.min(
              ...product.variants
                .filter((variant) => variant.available)
                .map((variant) => variant.unitPrice),
            );
            const productSlug = product.merchandising?.slug ?? product.id;
            return (
              <Link
                className={index === 0 ? styles.productPrimary : ''}
                href={`/products/${encodeURIComponent(productSlug)}`}
                key={product.id}
              >
                <MerchandisePreview design={showcaseDesigns[0]} product={product} />
                <span>
                  <strong>{product.name}</strong>
                  <small>From {formatPrice(price)}</small>
                </span>
              </Link>
            );
          })}
        </div>

        {/* Interactive Try-It Showcase */}
        <div style={{ marginTop: '48px' }}>
          <HomeCommerceShowcase
            designs={showcaseDesigns}
            products={products}
          />
        </div>
      </section>

      {/* 5. SAME DESIGN / MATCHING SET */}
      <section className={styles.sameDesignSection}>
        <div>
          <h2>One design. Matching set.</h2>
          <p>
            Keep your artwork consistent across matching gifts. PrintMe adapts
            scale and placement for each approved item automatically.
          </p>
          <Link href="/create">Make a matching set</Link>
        </div>
        <div className={styles.sameDesignProducts}>
          {products.filter(product => product.id !== 'keepsake-mug').map(product => (
            <MerchandisePreview key={product.id} design={showcaseDesigns[0]} product={product} />
          ))}
        </div>
      </section>

      {/* 6. REAL BEFORE → AFTER EXAMPLES */}
      <section className={styles.photoSection} id="gifts">
        <div className={styles.photoCopy}>
          <Camera aria-hidden="true" size={28} strokeWidth={1.6} />
          <h2>Create a personal gift from one good photo.</h2>
          <p>
            Keep the original, remove the background, or turn it into stylized artwork.
            Then position it directly on the product from any phone or computer.
          </p>
          <div className={styles.photoActions}>
            <Link href="/create">
              Make Something
              <ArrowRight aria-hidden="true" size={18} strokeWidth={1.8} />
            </Link>
            <Link href="/halloween">Shop Halloween</Link>
          </div>
        </div>
        <div className={styles.photoPair}>
          <figure>
            <Image
              src="/landing/transformations/pet-original.webp"
              alt="Original pet photograph"
              width={1200}
              height={1200}
              sizes="(max-width: 767px) 48vw, 25vw"
            />
            <figcaption>Your photo</figcaption>
          </figure>
          <figure>
            <Image
              src="/landing/transformations/pet-cartoon.webp"
              alt="Pet portrait transformed into a colorful illustration"
              width={1200}
              height={1200}
              sizes="(max-width: 767px) 48vw, 25vw"
            />
            <figcaption>Your finished artwork</figcaption>
          </figure>
        </div>
      </section>

      <section className={styles.customerSection}>
        <div className={styles.sectionHeading}>
          <h2>Made in the PrintMe studio.</h2>
          <p>
            Real transformations prepared by our creators. Every piece is printed
            to order with premium inks and materials.
          </p>
        </div>
        <div className={styles.customerPlaceholders}>
          {studioSamples.map((sample) => (
            <figure key={sample.src}>
              <Image
                src={sample.src}
                alt={sample.alt}
                width={1200}
                height={1200}
                sizes="(max-width: 767px) 100vw, 30vw"
              />
              <figcaption>{sample.label}</figcaption>
            </figure>
          ))}
        </div>
      </section>

      {/* 7. TRUST / SHIPPING / REPRINT SUPPORT */}
      <section className={styles.assuranceSection}>
        <article id="shipping">
          <h2>Clear production and delivery estimates</h2>
          <p>
            Production (2–3 business days) and carrier shipping (typically 3–5
            business days) are calculated transparently so you know exactly when
            to expect your order.
          </p>
          <Link href="/products">Review products</Link>
        </article>
        <article id="guarantee">
          <h2>Defect and damage replacement guarantee</h2>
          <p>
            Because every item is custom printed, we inspect each order carefully.
            If your item arrives damaged or with a printing defect, we reprint
            and replace it promptly.
          </p>
          <Link href="mailto:support@printme.ai">Contact support</Link>
        </article>
      </section>

      {/* 8. UNIVERSAL CONSUMER FOOTER */}
      <SiteFooter />

      {/* Mobile Sticky Action Bar */}
      <nav
        className={styles.mobileCommerceBar}
        aria-label="Quick commerce actions"
        data-testid="home-mobile-commerce-bar"
      >
        <Link href="/create">Make Something</Link>
        <Link href="/shop">
          <ShoppingBag aria-hidden="true" size={18} strokeWidth={1.8} />
          Bag
        </Link>
      </nav>
    </div>
  );
}
