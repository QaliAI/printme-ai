import Image from 'next/image';
import Link from 'next/link';
import { InstantPreview } from '@/components/commerce/InstantPreview';
import { SiteFooter } from '@/components/brand/SiteFooter';
import { getApprovedMerchProducts } from '@/lib/commerce/catalog/approved-catalog';
import { createProductConfiguration } from '@/lib/commerce/placement';
import { getPreviewTemplate } from '@/lib/commerce/templates';
import type { DesignAsset, MerchProduct } from '@/lib/commerce/types';
import { photoStyles } from '@/lib/ai/photo-styles';
import { isReviewFeatureEnabled } from '@/lib/feature-flags';
import { AI_STYLES_ENABLED } from '@/lib/ai/availability';
import { MakeYourOwnArt } from './MakeYourOwnArt';
import styles from './punk.module.css';

const usd = (cents: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(cents / 100);

function fromPrice(product: MerchProduct) {
  return Math.min(...product.variants.filter((v) => v.available).map((v) => v.unitPrice));
}

const headline: { word: string; tone: 'paper' | 'pink' | 'yellow' | 'ink' | 'photocopy' }[] = [
  { word: 'Your', tone: 'paper' },
  { word: 'photo.', tone: 'pink' },
  { word: 'Cut', tone: 'ink' },
  { word: 'out.', tone: 'yellow' },
  { word: 'Printed.', tone: 'photocopy' },
];

/** Real output of our background removal on a CC0 sample photo (public/samples/README.md). */
const SAMPLE_CUTOUT: DesignAsset = {
  id: 'asset-sample-ginger-cat-cutout',
  version: 'sample-v1',
  url: '/samples/ginger-cat-cutout.png',
  alt: 'Ginger cat cut out from its background',
  width: 747,
  height: 699,
  mimeType: 'image/png',
  hasTransparency: true,
};

const productCopy: Record<string, { spec: string; detail: string }> = {
  'everyday-tee': {
    spec: 'Bella+Canvas 3001',
    detail: 'Lightweight 4.2 oz unisex jersey, ribbed collar, side-seamed. Direct-to-garment print.',
  },
  'gallery-poster': {
    spec: 'Museum-grade matte',
    detail: 'Archival matte paper, 189 g/m², pigment inks. 12×18 or 18×24 in, no frame.',
  },
  'keepsake-mug': {
    spec: '11 oz ceramic',
    detail: 'White ceramic, lead- and BPA-free, sublimation printed wrap.',
  },
};

function SamplePreview({ product }: { product: MerchProduct }) {
  const configuration = createProductConfiguration({
    designId: 'homepage-sample',
    design: SAMPLE_CUTOUT,
    product,
    template: getPreviewTemplate(product.previewTemplateId),
  });
  return <InstantPreview design={SAMPLE_CUTOUT} configuration={configuration} showSafeZone={false} presentation="merchandising" />;
}

/**
 * PrintMe.ai homepage — the working proposition first: upload a photo, get a
 * clean cutout, see it on the real product. Product prices and previews come
 * from the commerce engine; the hero result is real pipeline output.
 */
export async function PunkHomepage() {
  const products = getApprovedMerchProducts();
  const productById = new Map(products.map((p) => [p.id, p]));
  const tee = productById.get('everyday-tee') ?? products[0];
  const mug = productById.get('keepsake-mug') ?? products[0];
  const startingPrice = Math.min(...products.map(fromPrice));
  const ordered = ['everyday-tee', 'gallery-poster', 'keepsake-mug'].map((id) => productById.get(id)).filter((p): p is MerchProduct => Boolean(p));
  const textThread = isReviewFeatureEnabled('text-thread');

  return (
    <div className={styles.home}>
      {/* HERO — the proposition, shown with real output */}
      <section className={styles.hero} aria-labelledby="hero-heading">
        <div className={styles.heroCopy}>
          <p className={styles.issueTag}>Custom merch from any photo</p>
          <h1 id="hero-heading" className={styles.ransom}>
            {headline.map((part, i) => (
              <span key={part.word} className={styles.ransomWord} data-tone={part.tone} style={{ ['--i' as string]: i }}>
                {part.word}
              </span>
            ))}
          </h1>
          <p className={styles.heroLede}>
            Upload your pet, your person or your inside joke. We remove the background, you place it on a real tee, poster or mug, and
            we print it to order.
          </p>
          <div className={styles.heroActions}>
            <a href="#make" className={styles.btnPink} data-testid="hero-make">
              Upload your photo
            </a>
            <Link href="/shop" className={styles.btnInk}>
              Shop the drops
            </Link>
          </div>
          <ul className={styles.heroFacts}>
            <li>Background removal included</li>
            <li>Exact print preview</li>
            <li>From {usd(startingPrice)}</li>
          </ul>
        </div>

        <div className={styles.heroProofGrid}>
          <figure className={styles.heroBefore}>
            <Image src="/samples/ginger-cat.jpg" alt="Original photo of a ginger long-haired cat" width={1280} height={857} priority sizes="(max-width: 900px) 60vw, 22vw" />
            <figcaption>Your photo</figcaption>
          </figure>
          <span className={styles.heroArrow} aria-hidden="true">
            cut out →
          </span>
          <Link href="/create?product=everyday-tee" className={styles.heroAfter} data-testid="hero-feature">
            <SamplePreview product={tee} />
            <span className={styles.heroAfterTag}>
              Exact preview · {tee.name} {usd(fromPrice(tee))}
            </span>
          </Link>
          <div className={styles.heroMugMini} aria-hidden="true">
            <SamplePreview product={mug} />
          </div>
        </div>
      </section>

      {/* TRY IT — the working pipeline, right after the hero */}
      <MakeYourOwnArt products={products} styles={AI_STYLES_ENABLED ? Object.entries(photoStyles).map(([key, value]) => ({ key, label: value.label })) : []} />

      {/* PICK YOUR CANVAS */}
      <section className={styles.drops} aria-labelledby="canvas-heading" data-testid="homepage-product-showcase">
        <header className={styles.sectionHead}>
          <div>
            <p className={styles.issueTag}>Three things we print really well</p>
            <h2 id="canvas-heading" className={styles.posterHeading}>
              Pick your <span className={styles.hlPink}>canvas</span>
            </h2>
          </div>
          <Link href="/products" className={styles.textLink}>
            Product details →
          </Link>
        </header>
        <ul className={styles.productGrid}>
          {ordered.map((product) => (
            <li key={product.id} className={styles.productItem}>
              <Link href={`/create?product=${product.id}`} className={styles.productCard}>
                <span className={styles.productMedia}>
                  <SamplePreview product={product} />
                </span>
                <span className={styles.productMeta}>
                  <strong>{productCopy[product.id]?.spec ?? product.name}</strong>
                  <span>
                    {product.name}
                    <b>from {usd(fromPrice(product))}</b>
                  </span>
                  <small className={styles.productDetail}>{productCopy[product.id]?.detail}</small>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* GARMENT DETAIL — real photography of the actual blank */}
      <section className={styles.editorial} aria-labelledby="editorial-heading">
        <div className={styles.detailPair}>
          <figure>
            <Image src="/shop-v2/photo/tee-detail-shoulder.webp" alt="Close-up of the Bella+Canvas 3001 shoulder seam" width={900} height={900} sizes="(max-width: 900px) 50vw, 22vw" />
          </figure>
          <figure>
            <Image src="/shop-v2/photo/tee-detail-collar.webp" alt="Close-up of the Bella+Canvas 3001 ribbed collar" width={900} height={900} sizes="(max-width: 900px) 50vw, 22vw" />
          </figure>
        </div>
        <div className={styles.editorialCopy}>
          <p className={styles.issueTag}>What you actually get</p>
          <h2 id="editorial-heading" className={styles.posterHeading}>
            Light cotton.
            <br />
            <span className={styles.hlYellow}>Loud print.</span>
          </h2>
          <dl className={styles.specList}>
            <div>
              <dt>Tee</dt>
              <dd>Bella+Canvas 3001: a lightweight 4.2 oz unisex jersey with a ribbed collar and side seams. Printed direct-to-garment.</dd>
            </div>
            <div>
              <dt>Poster</dt>
              <dd>Museum-grade archival matte paper, 189 g/m², pigment inks.</dd>
            </div>
            <div>
              <dt>Mug</dt>
              <dd>11 oz white ceramic, lead- and BPA-free, sublimation printed.</dd>
            </div>
            <div>
              <dt>Every order</dt>
              <dd>Printed when you order. Damaged or misprinted items are reviewed and reprinted.</dd>
            </div>
          </dl>
          <p className={styles.photoNote}>Photos: Printify catalog photography of the exact blank we print on.</p>
        </div>
      </section>

      {/* SEASONAL */}
      <section className={styles.season} aria-labelledby="season-heading">
        <div className={styles.seasonCopy}>
          <p className={styles.seasonTag}>Halloween · The Slasher Shop</p>
          <h2 id="season-heading" className={styles.posterHeading}>
            Make it <span className={styles.hlAcid}>creepy.</span>
          </h2>
          <p className={styles.lede}>
            {AI_STYLES_ENABLED
              ? 'Upload a photo and turn it into Halloween art in the studio. You see the result before you pay.'
              : 'Put your names on a haunted design, or cut out your pet and give them their own spooky tee.'}
          </p>
          <div className={styles.seasonActions}>
            <Link href="/halloween" className={styles.btnAcid}>
              Enter the Halloween shop
            </Link>
          </div>
        </div>
        <div className={styles.seasonCards}>
          {AI_STYLES_ENABLED ? (
            <>
              <Link href="/create?style=halloween-pet" className={styles.seasonCard}>
                <span className={styles.seasonCardType} aria-hidden="true">
                  Your pet.
                  <br />
                  <em>But spooky.</em>
                </span>
                <strong>Halloween pet art</strong>
                <small>AI style · keeps your pet&apos;s markings</small>
              </Link>
              <Link href="/create?style=haunted-portrait" className={styles.seasonCard}>
                <span className={styles.seasonCardType} aria-hidden="true">
                  Your face.
                  <br />
                  <em>By candlelight.</em>
                </span>
                <strong>Gothic portrait</strong>
                <small>AI style · upload any clear photo</small>
              </Link>
            </>
          ) : (
            <a href="#make" className={styles.seasonCard}>
              <span className={styles.seasonCardType} aria-hidden="true">
                Your pet.
                <br />
                <em>Cut out.</em>
              </span>
              <strong>Pet photo cutout</strong>
              <small>Remove the background, put them on merch</small>
            </a>
          )}
          <Link href="/halloween#seasonal-edit" className={styles.seasonCard}>
            <span className={styles.seasonCardType} aria-hidden="true">
              Your names.
              <br />
              <em>On it.</em>
            </span>
            <strong>Personalized designs</strong>
            <small>Add family and pet names</small>
          </Link>
        </div>
      </section>

      {/* WHAT YOU CAN MAKE TODAY */}
      <section className={styles.tools} aria-labelledby="tools-heading">
        <h2 id="tools-heading" className={styles.posterHeading}>
          What you can <span className={styles.hlYellow}>make today</span>
        </h2>
        <ul className={styles.toolGrid}>
          <li>
            <a href="#make">
              <strong>Photo cutouts</strong>
              <span>Remove the background from any photo, fix edges with a brush, put it on merch.</span>
            </a>
          </li>
          {AI_STYLES_ENABLED && (
            <li>
              <Link href="/create?style=illustrated">
                <strong>AI photo styles</strong>
                <span>{Object.keys(photoStyles).length} styles, from illustrated portraits to Halloween pet art. Preview before you pay.</span>
              </Link>
            </li>
          )}
          <li>
            <Link href="/halloween#seasonal-edit">
              <strong>Personalized designs</strong>
              <span>Add family, pet and reader names to seasonal designs.</span>
            </Link>
          </li>
          {textThread && (
            <li>
              <Link href="/text-thread">
                <strong>Text-thread designer</strong>
                <span>Turn a group-chat moment into a print.</span>
              </Link>
            </li>
          )}
        </ul>
      </section>

      {/* ENCORE */}
      <section className={styles.encore} aria-labelledby="encore-heading">
        <div className={styles.encoreWall} aria-hidden="true" />
        <h2 id="encore-heading" className={styles.encoreType}>
          <span data-tone="paper">Stop</span> <span data-tone="pink">scrolling.</span> <span data-tone="yellow">Start</span>{' '}
          <span data-tone="ink">making.</span>
        </h2>
        <div className={styles.encoreActions}>
          <a href="#make" className={styles.btnPink}>
            Upload your photo
          </a>
          <Link href="/shop" className={styles.btnPaper}>
            Shop the drops
          </Link>
        </div>
        <ul className={styles.trustRow}>
          <li id="shipping">
            <strong>Printed to order</strong>
            <span>Made when you order by Printify print partners. Production and shipping are estimated separately at checkout.</span>
          </li>
          <li>
            <strong>Preview before you pay</strong>
            <span>The preview uses each product&apos;s real print area and placement.</span>
          </li>
          <li id="guarantee">
            <strong>Damaged or misprinted?</strong>
            <span>We review it and reprint verified damage or production defects.</span>
          </li>
          <li>
            <strong>Your photos stay yours</strong>
            <span>Cutout photos are deleted from the processor right after. Studio uploads are kept privately for your order.</span>
          </li>
        </ul>
      </section>

      <SiteFooter />

      <nav className={styles.mobileBar} aria-label="Quick actions" data-testid="home-mobile-commerce-bar">
        <a href="#make">Upload photo</a>
        <Link href="/shop">Shop drops</Link>
      </nav>
    </div>
  );
}
