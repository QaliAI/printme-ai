import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Camera, ShoppingBag } from 'lucide-react';
import { getApprovedMerchProducts } from '@/lib/commerce/catalog/approved-catalog';
import { getDesignCatalogService } from '@/lib/commerce/designs/service';
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

const productImages: Record<string, string> = {
  'gallery-poster': '/landing/mockups/product-poster.webp',
  'everyday-tee': '/landing/mockups/product-tshirt.webp',
};

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

  return (
    <div className={styles.homeV2}>
      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>Photos become finished pieces</p>
          <h1>Turn photos into keepsakes.</h1>
          <p>
            Create original artwork from a photo, then preview it on a poster
            or tee before you buy.
          </p>
          <div className={styles.heroActions}>
            <Link href="/create">Create Yours</Link>
            <Link href="/designs">Shop Designs</Link>
          </div>
          <span className={styles.startingPrice}>
            Approved products start at {formatPrice(startingPrice)}
          </span>
        </div>
        <HeroProductSwitcher products={products} />
      </section>

      <section className={styles.featuredSection}>
        <div className={styles.sectionHeading}>
          <h2>Start with art you already like.</h2>
          <p>
            Pick a curated design, switch products, and open the full
            configurator when the pairing feels right.
          </p>
        </div>
        <HomeCommerceShowcase
          designs={designs.slice(0, 4)}
          products={products}
        />
      </section>

      <section className={styles.productsSection} id="products">
        <div className={styles.sectionHeading}>
          <h2>Shop by product.</h2>
          <p>Every option below comes from the approved PrintMe catalog.</p>
        </div>
        <div className={styles.productGrid}>
          {products.map((product, index) => {
            const price = Math.min(
              ...product.variants
                .filter((variant) => variant.available)
                .map((variant) => variant.unitPrice),
            );
            return (
              <Link
                className={index === 0 ? styles.productPrimary : ''}
                href={`/shop-v2?product=${encodeURIComponent(product.id)}`}
                key={product.id}
              >
                <Image
                  src={productImages[product.id]}
                  alt={`${product.name} product preview`}
                  width={960}
                  height={960}
                  sizes={
                    index === 0
                      ? '(max-width: 767px) 100vw, 62vw'
                      : '(max-width: 767px) 100vw, 34vw'
                  }
                />
                <span>
                  <strong>{product.name}</strong>
                  <small>From {formatPrice(price)}</small>
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      <section className={styles.photoSection} id="gifts">
        <div className={styles.photoCopy}>
          <Camera aria-hidden="true" size={28} strokeWidth={1.6} />
          <h2>Create a gift from one good photo.</h2>
          <p>
            Upload a clear image, choose a treatment, then compare the result
            before selecting a product.
          </p>
          <div className={styles.photoActions}>
              <Link href="/create">
              Create Yours
              <ArrowRight aria-hidden="true" size={18} strokeWidth={1.8} />
            </Link>
            <Link href="/designs">Browse gift-ready designs</Link>
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

      <section className={styles.sameDesignSection}>
        <div>
          <h2>One design. More than one product.</h2>
          <p>
            Keep the artwork consistent while you compare its scale and
            placement on each approved format.
          </p>
          <Link href="/shop-v2">Compare in Shop V2</Link>
        </div>
        <div className={styles.sameDesignProducts}>
          <Image
            src="/landing/mockups/product-poster.webp"
            alt="The same artwork printed as a poster"
            width={960}
            height={960}
            sizes="(max-width: 767px) 50vw, 28vw"
          />
          <Image
            src="/landing/mockups/product-tshirt.webp"
            alt="The same artwork printed on a t-shirt"
            width={960}
            height={960}
            sizes="(max-width: 767px) 50vw, 28vw"
          />
        </div>
      </section>

      <section className={styles.customerSection}>
        <div className={styles.sectionHeading}>
          <h2>Customer work, once it is approved.</h2>
          <p>
            This gallery stays empty until real customers give permission to
            show their finished pieces.
          </p>
        </div>
        <div className={styles.customerPlaceholders}>
          <div>
            <span>Reserved for verified customer work</span>
          </div>
          <div>
            <span>No fabricated reviews or proof</span>
          </div>
          <div>
            <span>Permission required before publishing</span>
          </div>
        </div>
      </section>

      <section className={styles.assuranceSection}>
        <article id="shipping">
          <h2>Shipping information</h2>
          <p>
            Production and delivery estimates depend on product and
            destination. Final timing will appear before payment.
          </p>
          <Link href="/shop-v2">Review products</Link>
        </article>
        <article id="guarantee">
          <h2>Guarantee information</h2>
          <p>
            Checkout stays disabled until PrintMe&apos;s return and replacement
            policy is approved for customer use.
          </p>
          <Link href="mailto:support@printme.ai">Ask a question</Link>
        </article>
      </section>

      <footer className={styles.homeFooter}>
        <strong>PrintMe</strong>
        <nav aria-label="Footer">
          <Link href="/#shipping">Shipping</Link>
          <Link href="/#guarantee">Guarantee</Link>
          <Link href="/designs">Designs</Link>
          <Link href="/shop-v2">Products</Link>
        </nav>
      </footer>

      <nav
        className={styles.mobileCommerceBar}
        aria-label="Quick commerce actions"
        data-testid="home-mobile-commerce-bar"
      >
        <Link href="/create">Create Yours</Link>
        <Link href="/shop-v2">
          <ShoppingBag aria-hidden="true" size={18} strokeWidth={1.8} />
          Cart
        </Link>
      </nav>
    </div>
  );
}
