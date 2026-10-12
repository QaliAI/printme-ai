'use client';

import Link from 'next/link';
import { Search, ShoppingBag } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import styles from '@/app/home-v2.module.css';
import { Navbar } from '@/components/Navbar';
import { readLocalCart } from '@/lib/commerce/local-cart';
import { PrintMeWordmark } from '@/components/brand/PrintMeWordmark';

const navigation = [
  { href: '/shop', label: 'Shop' },
  { href: '/create', label: 'Create' },
  { href: '/halloween', label: 'Halloween' },
  { href: '/collections', label: 'Gifts & Collections' },
];

const legacyApplicationPrefixes = [
  '/app',
  '/admin',
  '/auth',
  '/checkout',
];

export function HomepageV2Header() {
  const pathname = usePathname();
  const [cartCount, setCartCount] = useState(0);

  useEffect(() => {
    function refreshCartCount() {
      try {
        const items = readLocalCart(window.localStorage);
        const total = items.reduce((acc, item) => acc + item.quantity, 0);
        setCartCount(total);
      } catch {
        setCartCount(0);
      }
    }

    refreshCartCount();
    window.addEventListener('storage', refreshCartCount);
    window.addEventListener('printme:cart-updated', refreshCartCount);
    return () => {
      window.removeEventListener('storage', refreshCartCount);
      window.removeEventListener('printme:cart-updated', refreshCartCount);
    };
  }, []);

  if (pathname.startsWith('/studio')) {
    return null;
  }
  if (legacyApplicationPrefixes.some((prefix) => pathname.startsWith(prefix))) {
    return <Navbar />;
  }

  return (
    <header className={styles.siteHeader}>
      <div className={styles.headerPrimary}>
        <Link className={styles.wordmark} href="/" aria-label="PrintMe home">
          <PrintMeWordmark size="md" />
        </Link>
        <nav className={styles.desktopNav} aria-label="Primary navigation">
          {navigation.map((item) => (
            <Link href={item.href} key={item.label}>
              {item.label}
            </Link>
          ))}
        </nav>
        <div className={styles.headerActions}>
          <Link href="/designs" aria-label="Search designs">
            <Search aria-hidden="true" size={18} strokeWidth={1.8} />
            <span>Search</span>
          </Link>
          <Link href="/shop" aria-label={`Open bag with ${cartCount} items`}>
            <ShoppingBag aria-hidden="true" size={18} strokeWidth={1.8} />
            <span>Bag</span>
            {cartCount > 0 && (
              <span className={styles.cartBadge} data-testid="cart-badge-count">
                {cartCount}
              </span>
            )}
          </Link>
        </div>
      </div>
      <nav className={styles.mobileNav} aria-label="Mobile navigation">
        {navigation.map((item) => (
          <Link href={item.href} key={item.label}>
            {item.label}
          </Link>
        ))}
        <Link href="/designs">Search</Link>
        <Link href="/shop">
          Bag{cartCount > 0 ? ` (${cartCount})` : ''}
        </Link>
      </nav>
    </header>
  );
}
