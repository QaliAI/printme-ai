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
  'keepsake-mug': '/landing/mockups/product-mug.webp',
};

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

  return (
    <div className={styles.homeV2}>
      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>Upload once. Make it yours.</p>
          <h1>Turn a favorite photo into something worth keeping.</h1>
          <p>
            Upload from your phone, prepare the artwork, and preview it on a
            poster, tee, or mug before you add it to your bag.
          </p>
          <div className={styles.heroActions}>
            <Link href="/create">Create Yours</Link>
            <Link href="/designs">Shop Designs</Link>
          </div>
          <span className={styles.startingPrice}>
            Custom products start at {formatPrice(startingPrice)}
          </span>
        </div>
        <HeroProductSwitcher products={products} />
      </section>

      <section className={styles.featuredSection}>
        <div className={styles.sectionHeading}>
          <h2>Or start with a design you already love.</h2>
          <p>
            Choose the artwork first, compare compatible products, and fine-tune
            the placement before adding it to your bag.
          </p>
        </div>
        <HomeCommerceShowcase
          designs={designs.slice(0, 4)}
          products={products}
        />
      </section>

      <section className={styles.productsSection} id="products">
        <div className={styles.sectionHeading}>
          <h2>Choose what you want to make.</h2>
          <p>A focused collection of products selected for reliable printing.</p>
        </div>
        <div className={styles.productGrid}>
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
          <h2>Create a personal gift from one good photo.</h2>
          <p>
            Keep the original, remove the background, or turn it into artwork.
            Then position it directly on the product from any phone or computer.
          </p>
          <div className={styles.photoActions}>
            <Link href="/create">
              Upload a Photo
              <ArrowRight aria-hidden="true" size={18} strokeWidth={1.8} />
            </Link>
            <Link href="/designs">Browse ready-to-print designs</Link>
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
            Keep the artwork consistent while PrintMe adapts its scale and
            placement for each approved format.
          </p>
          <Link href="/create">Make a matching set</Link>
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
          <h2>Made in the PrintMe studio.</h2>
          <p>
            A few examples of the kinds of photos and memories you can prepare
            for printing. Your own artwork stays yours.
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

      <section className={styles.assuranceSection}>
        <article id="shipping">
          <h2>Clear production and delivery estimates</h2>
          <p>
            Production time and carrier transit are shown separately whenever
            live provider data is available, so the timing is easier to understand.
          </p>
          <Link href="/products">Review products</Link>
        </article>
        <article id="guarantee">
          <h2>Support for damaged or misprinted orders</h2>
          <p>
            Every item is made to order. Verified damage or production defects
            are reviewed for replacement or reprint support.
          </p>
          <Link href="mailto:support@printme.ai">Ask a question</Link>
        </article>
      </section>

      <footer className={styles.homeFooter}>
        <strong>PrintMe</strong>
        <nav aria-label="Footer">
          <Link href="/#shipping">Shipping</Link>
          <Link href="/#guarantee">Order Support</Link>
          <Link href="/designs">Designs</Link>
          <Link href="/products">Products</Link>
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
          Bag
        </Link>
      </nav>
    </div>
  );
}
