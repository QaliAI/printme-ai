import Image from 'next/image';
import Link from 'next/link';
import { MerchandisePreview } from '@/components/commerce/MerchandisePreview';
import { SiteFooter } from '@/components/brand/SiteFooter';
import { getApprovedMerchProducts } from '@/lib/commerce/catalog/approved-catalog';
import { getDesignCatalogService } from '@/lib/commerce/designs/service';
import type { CuratedDesignRecord } from '@/lib/commerce/designs/models';
import type { MerchProduct } from '@/lib/commerce/types';
import { photoStyles } from '@/lib/ai/photo-styles';
import { isReviewFeatureEnabled } from '@/lib/feature-flags';
import { MakeYourOwnArt } from './MakeYourOwnArt';
import { RebelBot } from './RebelBot';
import { RevealOnView } from './RevealOnView';
import styles from './punk.module.css';

const usd = (cents: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(cents / 100);

function fromPrice(product: MerchProduct) {
  return Math.min(...product.variants.filter((v) => v.available).map((v) => v.unitPrice));
}

const headline: { word: string; tone: 'paper' | 'pink' | 'yellow' | 'ink' | 'photocopy' }[] = [
  { word: 'Your', tone: 'paper' },
  { word: 'brain.', tone: 'pink' },
  { word: 'Our', tone: 'ink' },
  { word: 'print', tone: 'yellow' },
  { word: 'shop.', tone: 'photocopy' },
];

/**
 * PrintMe.ai homepage. Every product, price and preview comes from the
 * existing commerce engine. Lifestyle photos are clearly labelled styled
 * photos; the purchasable preview is always the InstantPreview render.
 */
export async function PunkHomepage() {
  const products = getApprovedMerchProducts();
  const productById = new Map(products.map((p) => [p.id, p]));
  const service = getDesignCatalogService();
  const designs = await service.listPublished();
  const bySlug = new Map(designs.map((d) => [d.slug, d]));
  const tee = productById.get('everyday-tee') ?? products[0];
  const poster = productById.get('gallery-poster') ?? products[0];
  const mug = productById.get('keepsake-mug') ?? products[0];
  const startingPrice = Math.min(...products.map(fromPrice));

  const manifesto = bySlug.get('make-shit-print-shit') ?? designs[0];
  const badIdeas = bySlug.get('bad-ideas-club') ?? designs[0];
  const creature = bySlug.get('creature-of-habit') ?? designs[0];
  const library = bySlug.get('library-of-lost-hours');

  // Featured: the strongest original art across the three approved products.
  const featured: { design: CuratedDesignRecord; product: MerchProduct; isNew: boolean }[] = [
    { design: manifesto, product: tee, isNew: true },
    { design: badIdeas, product: tee, isNew: true },
    { design: creature, product: tee, isNew: true },
    { design: creature, product: mug, isNew: true },
    ...(library ? [{ design: library, product: mug, isNew: false }] : []),
    { design: badIdeas, product: poster, isNew: true },
  ].filter((item) => item.design.compatibleProductIds.includes(item.product.id));

  const remix = [manifesto, badIdeas, creature, library].filter((d): d is CuratedDesignRecord => Boolean(d));
  const textThread = isReviewFeatureEnabled('text-thread');

  return (
    <div className={styles.home}>
      {/* HERO */}
      <section className={styles.hero} aria-labelledby="hero-heading">
        <div className={styles.heroCopy}>
          <p className={styles.issueTag}>Issue Nº 01 · New drop</p>
          <h1 id="hero-heading" className={styles.ransom}>
            {headline.map((part, i) => (
              <span key={part.word} className={styles.ransomWord} data-tone={part.tone} style={{ ['--i' as string]: i }}>
                {part.word}
              </span>
            ))}
          </h1>
          <p className={styles.heroLede}>
            Original streetwear graphics, or your own photo, printed to order on premium blanks. See the exact product before you pay.
          </p>
          <div className={styles.heroActions}>
            <Link href="/create" className={styles.btnPink} data-testid="hero-make">
              Upload your photo
            </Link>
            <Link href="/shop" className={styles.btnInk}>
              Shop the drops
            </Link>
          </div>
          <ul className={styles.heroFacts}>
            <li>Bella+Canvas 3001 tees</li>
            <li>Museum-grade posters</li>
            <li>Ceramic mugs</li>
            <li>From {usd(startingPrice)}</li>
          </ul>
        </div>

        <div className={styles.heroMedia}>
          <figure className={styles.heroPhoto}>
            <Image
              src="/lifestyle/bad-ideas-club-model.webp"
              alt="Model wearing the Bad Ideas Club tee in white"
              width={1200}
              height={1500}
              priority
              sizes="(max-width: 900px) 100vw, 46vw"
            />
            <figcaption>Styled photo</figcaption>
          </figure>
          <Link href={`/designs/${badIdeas.slug}`} className={styles.heroProof} data-testid="hero-feature">
            <span className={styles.heroProofPreview}>
              <MerchandisePreview design={badIdeas} product={tee} />
            </span>
            <span className={styles.heroProofText}>
              <small>Exact print preview</small>
              <strong>{badIdeas.title}</strong>
              <span>
                {tee.name} · {usd(fromPrice(tee))}
              </span>
            </span>
          </Link>
          <div className={styles.heroBot} aria-hidden="true">
            <RebelBot armAngle={-30} freeArmAngle={40} headTilt={-6} spraying />
          </div>
        </div>
      </section>

      {/* FEATURED DROPS — straight after the hero */}
      <section className={styles.drops} aria-labelledby="drops-heading" data-testid="homepage-product-showcase">
        <header className={styles.sectionHead}>
          <div>
            <p className={styles.issueTag}>Fresh off the press</p>
            <h2 id="drops-heading" className={styles.posterHeading}>
              The <span className={styles.hlPink}>drops</span>
            </h2>
          </div>
          <Link href="/shop" className={styles.textLink}>
            Shop everything →
          </Link>
        </header>
        <ul className={styles.productGrid}>
          {featured.map(({ design, product, isNew }, i) => (
            <RevealOnView as="li" key={`${design.id}-${product.id}`} variant="slap" className={styles.productItem}>
              <Link href={`/designs/${design.slug}`} className={styles.productCard} style={{ ['--d' as string]: `${i * 60}ms` }}>
                <span className={styles.productMedia}>
                  <MerchandisePreview design={design} product={product} />
                  {isNew && <span className={styles.productBadge}>New</span>}
                </span>
                <span className={styles.productMeta}>
                  <strong>{design.title}</strong>
                  <span>
                    {product.name}
                    <b>{usd(fromPrice(product))}</b>
                  </span>
                </span>
              </Link>
            </RevealOnView>
          ))}
        </ul>
      </section>

      {/* EDITORIAL / QUALITY */}
      <section className={styles.editorial} aria-labelledby="editorial-heading">
        <figure className={styles.editorialMain}>
          <Image
            src="/lifestyle/make-shit-print-shit-model.webp"
            alt="Model sitting on a stool wearing the Make Shit. Print Shit. tee"
            width={1200}
            height={1500}
            sizes="(max-width: 900px) 100vw, 40vw"
          />
        </figure>
        <div className={styles.editorialCopy}>
          <p className={styles.issueTag}>Made like real merch</p>
          <h2 id="editorial-heading" className={styles.posterHeading}>
            Heavy ink.
            <br />
            <span className={styles.hlYellow}>Soft cotton.</span>
          </h2>
          <dl className={styles.specList}>
            <div>
              <dt>Tee</dt>
              <dd>Bella+Canvas 3001 unisex jersey, ribbed collar, side-seamed. Direct-to-garment print.</dd>
            </div>
            <div>
              <dt>Poster</dt>
              <dd>Museum-grade archival matte paper, 189 g/m², pigment inks. 12×18 or 18×24 in.</dd>
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
          <figure className={styles.editorialDetail}>
            <Image
              src="/lifestyle/creature-of-habit-detail-640.webp"
              alt="Close-up of the Creature of Habit print on cotton"
              width={640}
              height={800}
              sizes="(max-width: 900px) 50vw, 18vw"
            />
          </figure>
          <p className={styles.photoNote}>Styled photos on the actual blanks. Your product page shows the exact print preview.</p>
        </div>
      </section>

      {/* PERSONALIZE */}
      <MakeYourOwnArt
        products={products}
        styles={Object.entries(photoStyles).map(([key, value]) => ({ key, label: value.label }))}
      />

      {/* SEASONAL */}
      <section className={styles.season} aria-labelledby="season-heading">
        <div className={styles.seasonCopy}>
          <p className={styles.seasonTag}>Halloween · The Slasher Shop</p>
          <h2 id="season-heading" className={styles.posterHeading}>
            Make it <span className={styles.hlAcid}>creepy.</span>
          </h2>
          <p className={styles.lede}>
            Turn your pet into gothic Halloween art, put your name on a haunted library card, or grab the monster that runs on coffee.
          </p>
          <div className={styles.seasonActions}>
            <Link href="/halloween" className={styles.btnAcid}>
              Enter the Halloween shop
            </Link>
            <Link href="/create?style=halloween-pet" className={styles.btnPaper}>
              Halloween pet art
            </Link>
          </div>
        </div>
        <div className={styles.seasonCards}>
          <Link href="/create?style=haunted-portrait" className={styles.seasonCard}>
            <span className={styles.seasonCardType} aria-hidden="true">
              Your pet.
              <br />
              <em>But haunted.</em>
            </span>
            <strong>Gothic haunted portrait</strong>
            <small>AI style · upload a photo</small>
          </Link>
          {library && (
            <Link href="/halloween" className={styles.seasonCard}>
              <span className={styles.seasonCardPreview}>
                <MerchandisePreview design={library} product={mug} />
              </span>
              <strong>{library.title}</strong>
              <small>Personalize the name · {usd(fromPrice(mug))}</small>
            </Link>
          )}
          <Link href={`/designs/${creature.slug}`} className={styles.seasonCard}>
            <span className={styles.seasonCardPreview}>
              <MerchandisePreview design={creature} product={tee} />
            </span>
            <strong>{creature.title}</strong>
            <small>
              {tee.name} · {usd(fromPrice(tee))}
            </small>
          </Link>
        </div>
      </section>

      {/* REMIX THE INTERNET */}
      <section className={styles.remix} aria-labelledby="remix-heading">
        <header className={styles.sectionHead}>
          <div>
            <p className={styles.issueTag}>Remix the internet</p>
            <h2 id="remix-heading" className={styles.posterHeading}>
              Steal like an <span className={styles.hlPink}>artist.</span>
            </h2>
          </div>
          <p className={styles.remixNote}>Original art made for group chats. Pick a piece, swap the product, make it yours.</p>
        </header>
        <ul className={styles.remixGrid}>
          {remix.map((design, i) => (
            <li key={design.id}>
              <Link href={`/shop?design=${encodeURIComponent(design.slug)}`} className={styles.remixTile} data-tone={['pink', 'yellow', 'ink', 'paper'][i % 4]}>
                <span className={styles.remixArt}>
                  <Image src={design.asset.url} alt={design.asset.alt} width={988} height={1200} sizes="(max-width: 700px) 45vw, 22vw" />
                </span>
                <span className={styles.remixMeta}>
                  <strong>{design.title}</strong>
                  <em>Remix it →</em>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* WHAT YOU CAN MAKE TODAY */}
      <section className={styles.tools} aria-labelledby="tools-heading">
        <h2 id="tools-heading" className={styles.posterHeading}>
          What you can <span className={styles.hlYellow}>make today</span>
        </h2>
        <ul className={styles.toolGrid}>
          <li>
            <Link href="/create">
              <strong>Your photo on merch</strong>
              <span>Upload from your phone, place it on the real print area, order.</span>
            </Link>
          </li>
          <li>
            <Link href="/create?style=illustrated">
              <strong>AI photo styles</strong>
              <span>{Object.keys(photoStyles).length} styles, from illustrated portraits to Halloween pet art. Preview before you pay.</span>
            </Link>
          </li>
          <li>
            <Link href="/halloween">
              <strong>Personalized designs</strong>
              <span>Add family, pet and reader names to seasonal designs.</span>
            </Link>
          </li>
          <li>
            <Link href={`/shop?design=${encodeURIComponent(badIdeas.slug)}`}>
              <strong>Matching sets</strong>
              <span>Put one design on a tee, mug and poster in a single checkout.</span>
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
        <div className={styles.encoreBot} aria-hidden="true">
          <RebelBot armAngle={-46} freeArmAngle={-60} headTilt={8} spraying />
        </div>
        <RevealOnView variant="slap">
          <h2 id="encore-heading" className={styles.encoreType}>
            <span data-tone="paper">Stop</span> <span data-tone="pink">scrolling.</span> <span data-tone="yellow">Start</span>{' '}
            <span data-tone="ink">making.</span>
          </h2>
        </RevealOnView>
        <div className={styles.encoreActions}>
          <Link href="/create" className={styles.btnPink}>
            Upload your photo
          </Link>
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
            <span>Uploaded photos are kept in private storage and used only to make your artwork and order.</span>
          </li>
        </ul>
      </section>

      <SiteFooter />

      <nav className={styles.mobileBar} aria-label="Quick actions" data-testid="home-mobile-commerce-bar">
        <Link href="/create">Upload photo</Link>
        <Link href="/shop">Shop drops</Link>
      </nav>
    </div>
  );
}
