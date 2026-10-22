import Link from 'next/link';
import { isReviewFeatureEnabled } from '@/lib/feature-flags';
import { AI_STYLES_ENABLED } from '@/lib/ai/availability';
import styles from './SiteFooter.module.css';

/**
 * Expressive but fully functional footer. Every claim here is backed by the
 * approved catalog policies (made to order, defect/damage reprints, preview
 * before checkout); no delivery-time promises are made because production
 * and transit are quoted per order.
 */
export function SiteFooter() {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.brandCol}>
          <Link href="/" aria-label="PrintMe.ai home" className={styles.logo}>
            {/* eslint-disable-next-line @next/next/no-img-element -- static brand SVG */}
            <img src="/brand/printme-logo-stacked-inverse.svg" alt="PrintMe.ai" width={220} height={171} loading="lazy" />
          </Link>
          <p className={styles.brandBio}>
            An independent print shop for original merch and your own ideas. Your imagination, no permission required.
          </p>
        </div>

        <div className={styles.col}>
          <h2 className={styles.colTitle}>Make</h2>
          <nav className={styles.colNav} aria-label="Make">
            <Link href="/create">Upload a photo</Link>
            <Link href="/pets">PrintMe Pets</Link>
            <Link href="/#make">Remove a background</Link>
            {AI_STYLES_ENABLED && <Link href="/create?style=illustrated">AI styles</Link>}
            {isReviewFeatureEnabled('text-thread') && <Link href="/text-thread">Text-thread designer</Link>}
          </nav>
        </div>

        <div className={styles.col}>
          <h2 className={styles.colTitle}>Shop</h2>
          <nav className={styles.colNav} aria-label="Shop">
            <Link href="/shop">All designs</Link>
            <Link href="/drops">Drops</Link>
            <Link href="/collections">Collections</Link>
            <Link href="/halloween">Halloween</Link>
            <Link href="/products">Products</Link>
          </nav>
        </div>

        <div className={styles.col}>
          <h2 className={styles.colTitle}>Help</h2>
          <nav className={styles.colNav} aria-label="Help">
            <Link href="/#shipping">Production &amp; shipping</Link>
            <Link href="/#guarantee">Damage &amp; misprints</Link>
            <a href="mailto:support@printme.ai">support@printme.ai</a>
          </nav>
        </div>
      </div>

      <div className={styles.bottomBar}>
        <p>&copy; {new Date().getFullYear()} PrintMe.ai · Every item made to order.</p>
        <p className={styles.sign}>make shit. print shit.</p>
      </div>
    </footer>
  );
}
