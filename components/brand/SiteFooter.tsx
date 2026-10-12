import Link from 'next/link';
import { PrintMeWordmark } from './PrintMeWordmark';
import styles from './SiteFooter.module.css';

export function SiteFooter() {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.brandCol}>
          <Link href="/" aria-label="PrintMe Home">
            <PrintMeWordmark size="md" />
          </Link>
          <p className={styles.brandBio}>
            A fast, fun personalized gift studio. Your photo. Your joke. Your merch. Made to order with archival inks.
          </p>
          <div className={styles.trustBadges}>
            <span>✓ Preview before you buy</span>
            <span>✓ Free defect &amp; damage replacement</span>
            <span>✓ Printed to order in 2–3 days</span>
          </div>
        </div>

        <div className={styles.col}>
          <h4 className={styles.colTitle}>Gift Studio</h4>
          <nav className={styles.colNav} aria-label="Gift Studio Links">
            <Link href="/create">Make Something</Link>
            <Link href="/shop">Shop Collection</Link>
            <Link href="/halloween">Halloween Drop</Link>
            <Link href="/collections">Collections</Link>
            <Link href="/products">All Products</Link>
          </nav>
        </div>

        <div className={styles.col}>
          <h4 className={styles.colTitle}>Approved Items</h4>
          <nav className={styles.colNav} aria-label="Products">
            <Link href="/products/everyday-tee">Everyday Tee · $34</Link>
            <Link href="/products/keepsake-mug">Keepsake Mug · $19</Link>
            <Link href="/products/gallery-poster">Gallery Poster · $29</Link>
            <Link href="/create">Matching Sets</Link>
          </nav>
        </div>

        <div className={styles.col}>
          <h4 className={styles.colTitle}>Support &amp; Trust</h4>
          <nav className={styles.colNav} aria-label="Support Links">
            <Link href="/#shipping">Production &amp; Shipping</Link>
            <Link href="/#guarantee">Damage Replacement</Link>
            <a href="mailto:support@printme.ai">support@printme.ai</a>
            <Link href="/policies">Terms &amp; Policies</Link>
          </nav>
        </div>
      </div>

      <div className={styles.bottomBar}>
        <p>&copy; {new Date().getFullYear()} PrintMe. All rights reserved. Made to order.</p>
        <p>No generic gifts. Weirdly yours.</p>
      </div>
    </footer>
  );
}
