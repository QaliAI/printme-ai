import Image from 'next/image';
import Link from 'next/link';
import { SiteFooter } from '@/components/brand/SiteFooter';
import { getApprovedMerchProducts } from '@/lib/commerce/catalog/approved-catalog';
import { getDesignCatalogService } from '@/lib/commerce/designs/service';
import { productCopy } from '@/lib/commerce/product-copy';
import { canvasStrip, dropShowcase } from '@/lib/commerce/merch-showcase';
import type { MerchProduct } from '@/lib/commerce/types';
import { photoStyles } from '@/lib/ai/photo-styles';
import { AI_STYLES_ENABLED } from '@/lib/ai/availability';
import { MakeYourOwnArt } from './MakeYourOwnArt';
import { HeroVideo } from './motion/HeroVideo';
import { InViewVideo } from './motion/InViewVideo';
import { Parallax } from './motion/Parallax';
import { Reveal } from './motion/Reveal';
import { ScrubVideo } from './motion/ScrubVideo';
import styles from './punk.module.css';
import motion from './home-motion.module.css';

const usd = (cents: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(cents / 100);

function fromPrice(product: MerchProduct, color?: string | null) {
  const variants = product.variants.filter((v) => v.available && (!color || v.color === color));
  return Math.min(...(variants.length ? variants : product.variants).map((v) => v.unitPrice));
}

const headline: { word: string; tone: 'paper' | 'pink' | 'yellow' | 'ink' | 'photocopy' }[] = [
  { word: 'Make', tone: 'paper' },
  { word: 'shit.', tone: 'pink' },
  { word: 'Print', tone: 'yellow' },
  { word: 'shit.', tone: 'photocopy' },
];

/**
 * PrintMe.ai homepage. The mascot (Unit 001) carries the motion: a hero loop,
 * a scroll-scrubbed spray scene and in-view skate clips. Merchandise is shown
 * only on official Printify mockups of products we actually sell.
 */
export async function PunkHomepage() {
  const products = getApprovedMerchProducts();
  const productById = new Map(products.map((p) => [p.id, p]));
  const startingPrice = Math.min(...products.map((product) => fromPrice(product)));
  const designs = new Map((await getDesignCatalogService().listPublished()).map((design) => [design.slug, design]));
  const cards = dropShowcase.filter((card) => designs.has(card.slug) && productById.has(card.productId));

  return (
    <div className={styles.home}>
      {/* HERO — the mascot sprays the logo, full bleed */}
      <section className={motion.hero} aria-labelledby="hero-heading">
        <HeroVideo
          wide="/mascot/hero-canvas.mp4"
          portrait="/mascot/hero-canvas-portrait.mp4"
          poster="/mascot/hero-canvas-poster.webp"
          portraitPoster="/mascot/hero-canvas-portrait-poster.webp"
        />
        <div className={motion.heroShade} aria-hidden="true" />
        <div className={motion.heroCopy}>
          <p className={styles.issueTag}>Custom merch · drawn, cut out and printed</p>
          <h1 id="hero-heading" className={`${styles.ransom} ${motion.heroRansom}`}>
            {headline.map((part, i) => (
              <span key={`${part.word}-${i}`} className={styles.ransomWord} data-tone={part.tone} style={{ ['--i' as string]: i }}>
                {part.word}
              </span>
            ))}
          </h1>
          <p className={motion.heroLede}>
            Upload your pet, your person or your inside joke and we cut it out for a tee, hoodie, mug or poster. Or grab something from the drop.
            Printed to order, from {usd(startingPrice)}.
          </p>
          <div className={styles.heroActions}>
            <a href="#make" className={styles.btnPink} data-testid="hero-make">
              Upload your photo
            </a>
            <a href="#drop" className={styles.btnPaper}>
              Shop the drop
            </a>
          </div>
        </div>
        <p className={motion.heroCredit} aria-hidden="true">
          Unit 001 · on the clock
        </p>
      </section>

      {/* THE DROP — official Printify mockups, every one a different person, product and scene */}
      <section className={motion.drop} id="drop" aria-labelledby="drop-heading" data-testid="homepage-drop">
        <header className={motion.dropHead}>
          <div>
            <p className={styles.issueTag}>Q4 2026 · seven new originals</p>
            <h2 id="drop-heading" className={styles.posterHeading}>
              The <span className={styles.hlPink}>drop</span>
            </h2>
          </div>
          <p className={motion.dropIntro}>
            Researched against what is actually selling this season, drawn for PrintMe and photographed by Printify on the real blanks.{' '}
            <Link href="/collections/q4-drop" className={styles.textLink}>
              See the whole drop →
            </Link>
          </p>
        </header>
        <ul className={motion.dropGrid}>
          {cards.map((card, index) => {
            const design = designs.get(card.slug)!;
            const product = productById.get(card.productId)!;
            return (
              <Reveal as="li" key={card.slug} delay={(index % 4) * 70} tilt={index % 2 ? 2.5 : -2.5} className={motion.dropItem}>
                <Link href={`/designs/${card.slug}`} className={motion.dropCard} data-size={card.size} data-testid="drop-card">
                  <span className={motion.dropMedia}>
                    <Image src={card.main.src} alt={card.main.alt} fill sizes="(max-width: 700px) 92vw, (max-width: 1100px) 46vw, 30vw" className={motion.dropMain} />
                    <Image src={card.hover.src} alt="" fill sizes="(max-width: 700px) 92vw, (max-width: 1100px) 46vw, 30vw" className={motion.dropHover} />
                    <span className={motion.dropTag}>{card.tag}</span>
                  </span>
                  <span className={motion.dropMeta}>
                    <strong>{design.title}</strong>
                    <span>
                      {product.name}
                      {card.color ? ` · ${card.color}` : ''}
                    </span>
                    <b>{usd(fromPrice(product, card.color))}</b>
                  </span>
                </Link>
              </Reveal>
            );
          })}
        </ul>
      </section>

      {/* SPRAY — scroll-scrubbed, natural scroll */}
      <section className={motion.spray} aria-labelledby="spray-heading">
        <div className={motion.sprayCopy}>
          <p className={styles.issueTag}>How it gets made</p>
          <h2 id="spray-heading" className={styles.posterHeading}>
            Idea in. <span className={styles.hlYellow}>Merch</span> out.
          </h2>
          <p className={styles.lede}>Scroll and Unit 001 does the work. You only have to bring the idea.</p>
        </div>
        <ScrubVideo
          src="/mascot/spray-scrub.mp4"
          poster="/mascot/spray-scrub-poster.webp"
          endFrame="/mascot/spray-scrub-end.webp"
          steps={['You bring the photo or the joke.', 'We cut it out and lay it out.', 'You check the exact preview.', 'It is printed when you order.']}
        />
      </section>

      {/* MAKE YOUR OWN — the working cutout tool */}
      <div className={motion.makeWrap}>
        <Parallax distance={60} rotate={4} className={motion.makeMascot}>
          <Image src="/mascot/robot-skate.webp" alt="" width={639} height={828} sizes="220px" />
        </Parallax>
        <MakeYourOwnArt products={products} styles={AI_STYLES_ENABLED ? Object.entries(photoStyles).map(([key, value]) => ({ key, label: value.label })) : []} />
      </div>

      {/* PICK YOUR CANVAS — real blanks, different colours */}
      <section className={motion.canvas} aria-labelledby="canvas-heading" data-testid="homepage-product-showcase">
        <header className={styles.sectionHead}>
          <div>
            <p className={styles.issueTag}>Five blanks we print really well</p>
            <h2 id="canvas-heading" className={styles.posterHeading}>
              Pick your <span className={styles.hlPink}>canvas</span>
            </h2>
          </div>
          <Link href="/products" className={styles.textLink}>
            Product details →
          </Link>
        </header>
        <ul className={motion.canvasRow}>
          {canvasStrip.map((item, index) => {
            const product = productById.get(item.productId);
            if (!product) return null;
            return (
              <Reveal as="li" key={item.productId} delay={index * 60} tilt={index % 2 ? -2 : 2}>
                <Link href={`/products/${product.merchandising?.slug ?? product.id}`} className={motion.canvasCard}>
                  <span className={motion.canvasMedia}>
                    <Image src={item.image} alt={item.alt} fill sizes="(max-width: 700px) 46vw, 18vw" />
                  </span>
                  <strong>{productCopy[product.id]?.spec ?? product.name}</strong>
                  <span>
                    {product.name} · {item.note}
                  </span>
                  <small>{productCopy[product.id]?.detail}</small>
                  <b>from {usd(fromPrice(product))}</b>
                </Link>
              </Reveal>
            );
          })}
        </ul>
      </section>

      {/* MEET UNIT 001 — the mascot */}
      <section className={motion.unit} aria-labelledby="unit-heading">
        <div className={motion.unitFigures}>
          <Parallax distance={-50} rotate={-3} className={motion.unitFront}>
            <Image src="/mascot/robot-hoodie-front.webp" alt="Unit 001, the PrintMe robot, in a paint-splattered hoodie" width={322} height={635} sizes="(max-width: 700px) 40vw, 220px" />
          </Parallax>
          <Parallax distance={50} rotate={3} className={motion.unitBack}>
            <Image src="/mascot/robot-hoodie-back.webp" alt="" width={300} height={627} sizes="(max-width: 700px) 36vw, 200px" />
          </Parallax>
          <span className={motion.unitNote} data-n="1">boombox head</span>
          <span className={motion.unitNote} data-n="2">signature spray can</span>
          <span className={motion.unitNote} data-n="3">will skate for snacks</span>
        </div>
        <div className={motion.unitCopy}>
          <p className={styles.issueTag}>Meet the mascot</p>
          <h2 id="unit-heading" className={styles.posterHeading}>
            Unit <span className={styles.hlYellow}>001</span>
          </h2>
          <p className={styles.lede}>
            Boombox for a head, spray can for a hand, zero respect for blank walls. He tags it, skates it and prints your stuff.
          </p>
          <div className={motion.unitClip}>
            <InViewVideo src="/mascot/skate-tunnel.mp4" poster="/mascot/skate-tunnel-poster.webp" className={motion.clipVideo} />
          </div>
          <Link href="/designs/made-by-machines" className={styles.btnInk}>
            Wear the robot
          </Link>
        </div>
      </section>

      {/* SEASONAL — Halloween until Oct 31, then the holiday shop */}
      <section className={styles.season} aria-labelledby="season-heading">
        <div className={styles.seasonCopy}>
          <p className={styles.seasonTag}>Halloween · The Slasher Shop</p>
          <h2 id="season-heading" className={styles.posterHeading}>
            Make it <span className={styles.hlAcid}>creepy.</span>
          </h2>
          <p className={styles.lede}>Put your names on a haunted design, or cut out your pet and give them their own spooky tee.</p>
          <div className={styles.seasonActions}>
            <Link href="/halloween" className={styles.btnAcid}>
              Enter the Halloween shop
            </Link>
          </div>
        </div>
        <div className={styles.seasonCards}>
          <a href="#make" className={styles.seasonCard}>
            <span className={styles.seasonCardType} aria-hidden="true">
              Your pet.
              <br />
              <em>Cut out.</em>
            </span>
            <strong>Pet photo cutout</strong>
            <small>Remove the background, put them on merch</small>
          </a>
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

      {/* SKATE BAND — trust facts over the mascot clip */}
      <section className={motion.band} aria-labelledby="band-heading">
        <InViewVideo src="/mascot/skate-park.mp4" poster="/mascot/skate-park-poster.webp" className={motion.bandVideo} />
        <div className={motion.bandShade} aria-hidden="true" />
        <div className={motion.bandCopy}>
          <h2 id="band-heading" className={motion.bandType}>
            <span data-tone="paper">Printed</span> <span data-tone="pink">to order.</span> <span data-tone="yellow">No</span> <span data-tone="ink">warehouse.</span>
          </h2>
          <ul className={motion.bandFacts}>
            <li id="shipping">
              <strong>Printed to order</strong>
              <span>Made when you order by Printify print partners. Production and shipping are estimated at checkout.</span>
            </li>
            <li>
              <strong>Preview before you pay</strong>
              <span>Previews use each product&apos;s real print area and placement.</span>
            </li>
            <li id="guarantee">
              <strong>Damaged or misprinted?</strong>
              <span>We review it and reprint verified damage or production defects.</span>
            </li>
            <li>
              <strong>Your photos stay yours</strong>
              <span>Cutout photos are deleted from the processor right after.</span>
            </li>
          </ul>
          <div className={styles.encoreActions}>
            <a href="#make" className={styles.btnPink}>
              Upload your photo
            </a>
            <a href="#drop" className={styles.btnPaper}>
              Shop the drop
            </a>
          </div>
        </div>
      </section>

      <SiteFooter />

      <nav className={styles.mobileBar} aria-label="Quick actions" data-testid="home-mobile-commerce-bar">
        <a href="#make">Upload photo</a>
        <a href="#drop">Shop the drop</a>
      </nav>
    </div>
  );
}
