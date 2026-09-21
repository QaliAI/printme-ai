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

  const fallDesigns = designs.filter((d) => d.tags.includes('fall-2026'));
  const showcaseDesigns = fallDesigns.length > 0 ? fallDesigns.slice(0, 6) : designs.slice(0, 4);

  return (
    <div className={styles.homeV2}>
      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>Fall 2026 Launch · Made to Order</p>
          <h1>Turn your photo into art or shop our Fall Collection.</h1>
          <p>
            Upload from your phone to customize a keepsake, or choose from our
            curated Halloween, Fall, and Thanksgiving merchandise ready to print
            on tees, mugs, and posters.
          </p>
          <div className={styles.heroActions}>
            <Link href="/create">Create with Your Photo</Link>
            <Link href="/designs">Shop Fall Designs</Link>
          </div>
          <span className={styles.startingPrice}>
            Custom items from {formatPrice(startingPrice)} · $19 Mug, $29 Poster, $34 Tee
          </span>
        </div>
        <HeroProductSwitcher products={products} />
      </section>

      <section className={styles.featuredSection}>
        <div className={styles.sectionHeading}>
          <h2>Fall 2026 Featured Collection</h2>
          <p>
            Explore new seasonal designs for Halloween, Fall, and Thanksgiving,
            or customize any approved product directly.
          </p>
        </div>
        <HomeCommerceShowcase
          designs={showcaseDesigns}
          products={products}
        />
      </section>

      <section className={styles.productsSection} id="products">
        <div className={styles.sectionHeading}>
          <h2>The 3 Anchor Products</h2>
          <p>Crafted for durable color, reliable fit, and guaranteed quality.</p>
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
            Keep the original, remove the background, or turn it into stylized artwork.
            Then position it directly on the product from any phone or computer.
          </p>
          <div className={styles.photoActions}>
            <Link href="/create">
              Create with Your Photo
              <ArrowRight aria-hidden="true" size={18} strokeWidth={1.8} />
            </Link>
            <Link href="/designs">Shop Fall Designs</Link>
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
          <h2>One design. Multiple formats.</h2>
          <p>
            Keep your artwork consistent across matching gifts. PrintMe adapts
            scale and placement for each approved item automatically.
          </p>
          <Link href="/create">Make a matching set</Link>
        </div>
        <div className={styles.sameDesignProducts}>
          <Image
            src="/landing/mockups/product-poster.webp"
            alt="Artwork printed as an archival gallery poster"
            width={960}
            height={960}
            sizes="(max-width: 767px) 50vw, 28vw"
          />
          <Image
            src="/landing/mockups/product-tshirt.webp"
            alt="Artwork printed on an Everyday Tee"
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

      <footer className={styles.homeFooter}>
        <strong>PrintMe</strong>
        <nav aria-label="Footer">
          <Link href="/#shipping">Shipping</Link>
          <Link href="/#guarantee">Order Support</Link>
          <Link href="/designs">Fall Designs</Link>
          <Link href="/collections">Collections</Link>
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
