import Link from 'next/link';
import { MerchandisePreview } from '@/components/commerce/MerchandisePreview';
import { CollageLogo } from '@/components/brand/CollageLogo';
import { SiteFooter } from '@/components/brand/SiteFooter';
import { getApprovedMerchProducts } from '@/lib/commerce/catalog/approved-catalog';
import { getDesignCatalogService } from '@/lib/commerce/designs/service';
import type { CuratedDesignRecord } from '@/lib/commerce/designs/models';
import { getActiveSeasonalTrends, type EvidenceType } from '@/lib/commerce/seasonal-trends';
import type { MerchProduct } from '@/lib/commerce/types';
import { photoStyles } from '@/lib/ai/photo-styles';
import { MakeYourOwnArt } from './MakeYourOwnArt';
import { PrintFactory, type FactoryProduct } from './PrintFactory';
import { RebelBot } from './RebelBot';
import { RebelWallSequence } from './RebelWallSequence';
import { RevealOnView, type RevealVariant } from './RevealOnView';
import styles from './punk.module.css';

const usd = (cents: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(cents / 100);

function fromPrice(product: MerchProduct) {
  return Math.min(...product.variants.filter((v) => v.available).map((v) => v.unitPrice));
}

const shortName: Record<string, string> = { 'everyday-tee': 'Tee', 'gallery-poster': 'Poster', 'keepsake-mug': 'Mug' };
const methodLabel: Record<string, string> = {
  dtg: 'Direct-to-garment (DTG)',
  'digital-printing': 'Digital print, archival matte paper',
  sublimation: 'Dye sublimation',
};
const evidenceLabel: Record<EvidenceType, string> = {
  'keyword-demand': 'Search interest',
  'marketplace-listings': 'Marketplace listings',
  'editorial-forecast': 'Editorial forecast',
};

const headline: { word: string; tone: 'paper' | 'pink' | 'yellow' | 'ink' | 'photocopy' }[] = [
  { word: 'Your', tone: 'paper' },
  { word: 'brain.', tone: 'pink' },
  { word: 'Our', tone: 'ink' },
  { word: 'print', tone: 'yellow' },
  { word: 'shop.', tone: 'photocopy' },
];

/**
 * PrintMe.ai homepage — "Issue Nº 01", six acts.
 * Every product, price, preview, trend source and style below is read from the
 * existing commerce engine; nothing on this page is a mock-up.
 */
export async function PunkHomepage() {
  const products = getApprovedMerchProducts();
  const productById = new Map(products.map((p) => [p.id, p]));
  const designs = await getDesignCatalogService().listPublished();
  const bySlug = new Map(designs.map((d) => [d.slug, d]));
  const tee = productById.get('everyday-tee') ?? products[0];
  const poster = productById.get('gallery-poster');
  const mug = productById.get('keepsake-mug');
  const startingPrice = Math.min(...products.map(fromPrice));

  const manifesto = bySlug.get('make-shit-print-shit') ?? designs[0];
  const badIdeas = bySlug.get('bad-ideas-club') ?? designs[1] ?? designs[0];
  const creature = bySlug.get('creature-of-habit') ?? designs[2] ?? designs[0];

  // Wall of Drops: Issue Nº 01 first, then the highest-priority published designs.
  const issue = designs.filter((d) => d.tags.includes('issue-01')).sort((a, b) => b.merchandisingPriority - a.merchandisingPriority);
  const rest = designs
    .filter((d) => !d.tags.includes('issue-01') && d.tags.includes('fall-2026'))
    .sort((a, b) => b.merchandisingPriority - a.merchandisingPriority);
  const wall = [...issue, ...rest].slice(0, 8);
  const variants: RevealVariant[] = ['slap', 'tear', 'peel', 'flip'];
  const collections = (await getDesignCatalogService().listCollections()).filter(
    (c) => c.publicationStatus === 'published' && c.designIds.length > 0 && c.slug !== 'first-look',
  );

  const trends = getActiveSeasonalTrends().slice(0, 4);

  const productFor = (design: CuratedDesignRecord) =>
    productById.get(design.recommendedProductId) ?? tee;

  const factoryProducts: FactoryProduct[] = [tee, poster, mug]
    .filter((p): p is MerchProduct => Boolean(p))
    .filter((p) => badIdeas.compatibleProductIds.includes(p.id))
    .map((p) => {
      const ph = p.variants.find((v) => v.available)?.placeholders.find((x) => x.position === 'front');
      return {
        id: p.id,
        name: p.name,
        price: usd(fromPrice(p)),
        method: methodLabel[p.provider.decorationMethods[0]] ?? p.provider.decorationMethods[0],
        printArea: ph
          ? `${ph.width} × ${ph.height} px${ph.printWidthInches ? ` · ${ph.printWidthInches} × ${ph.printHeightInches} in` : ''}`
          : 'Set by the product template',
        href: `/designs/${badIdeas.slug}`,
        preview: <MerchandisePreview design={badIdeas} product={p} />,
      };
    });

  return (
    <div className={styles.home}>
      {/* ACT I — THE REBELLION */}
      <section className={styles.hero} aria-labelledby="hero-heading">
        <div className={styles.heroCopy}>
          <div className={styles.heroLogo}>
            <CollageLogo variant="stacked" title="PrintMe.ai" />
          </div>
          <h1 id="hero-heading" className={styles.ransom}>
            {headline.map((part, i) => (
              <span key={part.word} className={styles.ransomWord} data-tone={part.tone} style={{ ['--i' as string]: i }}>
                {part.word}
              </span>
            ))}
          </h1>
          <p className={styles.heroLede}>
            Upload a photo or grab an original design. Preview it on a real tee, poster or mug. We print it to order.
          </p>
          <div className={styles.heroActions}>
            <Link href="/create" className={styles.btnPink} data-testid="hero-make">
              Make something
            </Link>
            <Link href="/shop" className={styles.btnInk}>
              Shop the chaos
            </Link>
          </div>
          <p className={styles.heroPrice}>
            Custom items from {usd(startingPrice)} · {products.map((p) => `${shortName[p.id] ?? p.name} ${usd(fromPrice(p))}`).join(' · ')}
          </p>
        </div>

        <div className={styles.heroCollage} aria-label="Issue Nº 01 merchandise">
          <span className={styles.sticker} aria-hidden="true">
            Make shit.
            <br />
            Print shit.
          </span>
          <Link href={`/designs/${manifesto.slug}`} className={styles.heroTee} data-testid="hero-feature">
            <span className={styles.tape} aria-hidden="true" />
            <MerchandisePreview design={manifesto} product={tee} />
            <span className={styles.heroTag}>
              {manifesto.title} · Tee {usd(fromPrice(tee))}
            </span>
          </Link>
          {mug && (
            <Link href={`/designs/${creature.slug}`} className={styles.heroMug}>
              <MerchandisePreview design={creature} product={mug} />
              <span className={styles.heroTag}>Mug {usd(fromPrice(mug))}</span>
            </Link>
          )}
          <div className={styles.heroBot} aria-hidden="true">
            <RebelBot armAngle={-30} freeArmAngle={40} headTilt={-6} spraying />
          </div>
        </div>
      </section>

      {/* SIGNATURE SEQUENCE — bridges Act I into the product wall */}
      <RebelWallSequence
        art={{ url: creature.asset.url, alt: creature.asset.alt, title: creature.title, href: `/designs/${creature.slug}` }}
        product={{ name: tee.name, price: usd(fromPrice(tee)), href: `/products/${tee.merchandising?.slug ?? tee.id}` }}
        teeSlot={<MerchandisePreview design={creature} product={tee} />}
      />

      {/* ACT II — THE WALL OF DROPS */}
      <section className={styles.dropsWall} aria-labelledby="drops-heading" data-testid="homepage-product-showcase">
        <header className={styles.dropsHead}>
          <p className={styles.issueTag}>Act II · Fresh off the press</p>
          <h2 id="drops-heading" className={styles.posterHeading}>
            The wall of <span className={styles.hlPink}>drops</span>
          </h2>
          <nav className={styles.collectionChips} aria-label="Collections">
            {collections.map((c) => (
              <Link key={c.id} href={`/collections/${c.slug}`}>
                {c.title}
              </Link>
            ))}
          </nav>
        </header>
        <ul className={styles.dropsGrid}>
          {wall.map((design, i) => {
            const product = productFor(design);
            return (
              <RevealOnView as="li" key={design.id} variant={variants[i % variants.length]} className={styles.dropItem}>
                <Link href={`/designs/${design.slug}`} className={styles.dropCard} style={{ ['--tilt' as string]: `${[-2.5, 1.8, -1, 2.6, 1.2, -2, 2.2, -1.6][i % 8]}deg` }}>
                  <span className={styles.dropCollection}>{design.collection}</span>
                  {design.tags.includes('issue-01') && <span className={styles.dropNew}>New drop</span>}
                  <span className={styles.dropMedia}>
                    <span className={styles.dropProduct}>
                      <MerchandisePreview design={design} product={product} />
                    </span>
                    <span className={styles.dropArt} aria-hidden="true">
                      {/* eslint-disable-next-line @next/next/no-img-element -- alternate artwork view, lazy */}
                      <img src={design.asset.url} alt="" loading="lazy" decoding="async" width={988} height={1200} />
                    </span>
                  </span>
                  <span className={styles.dropMeta}>
                    <strong>{design.title}</strong>
                    <small>
                      {product.name} · {usd(fromPrice(product))}
                    </small>
                  </span>
                </Link>
              </RevealOnView>
            );
          })}
        </ul>
        <div className={styles.dropsFoot}>
          <Link href="/shop" className={styles.btnPink}>
            Shop all drops
          </Link>
          <p className={styles.microtype}>Hover or focus a poster to see the raw artwork.</p>
        </div>
      </section>

      {/* ACT III — MAKE YOUR OWN DAMN ART */}
      <MakeYourOwnArt
        products={products}
        styles={Object.entries(photoStyles).map(([key, value]) => ({ key, label: value.label }))}
      />

      {/* ACT IV — TREND RADAR */}
      <section className={styles.radar} aria-labelledby="radar-heading">
        <div className={styles.radarTicker} aria-hidden="true">
          <div>
            {[...trends, ...trends].map((t, i) => (
              <span key={`${t.id}-${i}`}>#{t.theme.replace(/\s+/g, '')}</span>
            ))}
          </div>
        </div>
        <header className={styles.radarHead}>
          <p className={styles.issueTag}>Act IV · Trend radar</p>
          <h2 id="radar-heading" className={styles.posterHeading}>
            What the internet&apos;s <span className={styles.hlYellow}>into</span>
          </h2>
          <p className={styles.lede}>
            Signals we watched, with receipts. These are public listings and forecasts we reviewed — not our sales numbers and not a
            live ranking.
          </p>
        </header>
        <div className={styles.radarBoard}>
          {trends.map((trend, i) => {
            const design = bySlug.get(trend.relatedDesignSlug);
            const source = trend.sources[0];
            return (
              <RevealOnView key={trend.id} as="article" variant={i % 2 ? 'peel' : 'tear'} className={styles.clipping}>
                <span className={styles.pin} aria-hidden="true" />
                <p className={styles.clippingIssue}>
                  Nº {String(i + 1).padStart(2, '0')} · {trend.categoryLabel}
                </p>
                {design && (
                  // eslint-disable-next-line @next/next/no-img-element -- small lazy clipping thumbnail
                  <img src={design.asset.url} alt="" loading="lazy" decoding="async" width={988} height={1200} className={styles.clippingArt} />
                )}
                <h3>{trend.headline}</h3>
                <p>{trend.description}</p>
                {source && (
                  <p className={styles.receipt}>
                    <span>{evidenceLabel[trend.evidenceType]}</span>{' '}
                    <a href={source.url} target="_blank" rel="noopener noreferrer">
                      {source.name}
                    </a>{' '}
                    · seen {source.observedDate}
                  </p>
                )}
                <Link href={`/designs/${trend.relatedDesignSlug}`} className={styles.clippingCta}>
                  {trend.isPersonalizationSupported ? 'Make your version' : 'See the design'} →
                </Link>
              </RevealOnView>
            );
          })}
        </div>
      </section>

      {/* ACT V — THE PRINT FACTORY */}
      <PrintFactory products={factoryProducts} artTitle={badIdeas.title} />

      {/* ACT VI — THE FINAL ENCORE */}
      <section className={styles.encore} aria-labelledby="encore-heading">
        <div className={styles.encoreWall} aria-hidden="true" />
        <div className={styles.encoreBot} aria-hidden="true">
          <RebelBot armAngle={-46} freeArmAngle={-60} headTilt={8} spraying />
        </div>
        <h2 id="encore-heading" className={styles.encoreType}>
          <span data-tone="paper">Stop</span> <span data-tone="pink">scrolling.</span> <span data-tone="yellow">Start</span>{' '}
          <span data-tone="ink">making.</span>
        </h2>
        <div className={styles.encoreActions}>
          <Link href="/create" className={styles.btnPink}>
            Create your design
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
        <Link href="/create">Make something</Link>
        <Link href="/shop">Shop</Link>
      </nav>
    </div>
  );
}
