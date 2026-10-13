'use client';

import Link from 'next/link';
import { Search, ShoppingBag } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Navbar } from '@/components/Navbar';
import { readLocalCart } from '@/lib/commerce/local-cart';
import styles from './PunkHeader.module.css';

const navigation = [
  { href: '/shop', label: 'Shop' },
  { href: '/create', label: 'Create' },
  { href: '/drops', label: 'Drops' },
  { href: '/halloween', label: 'Halloween' },
  { href: '/collections', label: 'Collections' },
];

const legacyApplicationPrefixes = ['/app', '/admin', '/auth', '/checkout'];

export function PunkHeader() {
  const pathname = usePathname();
  const [cartCount, setCartCount] = useState(0);

  useEffect(() => {
    function refreshCartCount() {
      try {
        const items = readLocalCart(window.localStorage);
        setCartCount(items.reduce((acc, item) => acc + item.quantity, 0));
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

  if (pathname.startsWith('/studio')) return null;
  if (legacyApplicationPrefixes.some((prefix) => pathname.startsWith(prefix))) return <Navbar />;

  return (
    <header className={styles.header}>
      <a className={styles.skip} href="#main">
        Skip to content
      </a>
      <div className={styles.ticker} aria-hidden="true">
        <div>
          {Array.from({ length: 2 }).map((_, i) => (
            <span key={i}>
              Make shit. Print shit. ✶ Your imagination, no permission required ✶ Printed to order ✶ Preview before you pay ✶ Issue Nº 01 out now ✶&nbsp;
            </span>
          ))}
        </div>
      </div>
      <div className={styles.bar}>
        <Link className={styles.logo} href="/" aria-label="PrintMe.ai home">
          {/* eslint-disable-next-line @next/next/no-img-element -- static brand SVG, sized explicitly */}
          <img src="/brand/printme-logo-horizontal-web.svg" alt="PrintMe.ai" width={196} height={52} />
        </Link>
        <nav className={styles.nav} aria-label="Primary navigation">
          {navigation.map((item) => (
            <Link key={item.href} href={item.href} aria-current={pathname === item.href ? 'page' : undefined}>
              {item.label}
            </Link>
          ))}
        </nav>
        <div className={styles.actions}>
          <Link href="/designs" aria-label="Search designs" className={styles.iconLink}>
            <Search aria-hidden="true" size={20} strokeWidth={2.4} />
          </Link>
          <Link href="/shop" aria-label={`Open bag with ${cartCount} items`} className={styles.bag}>
            <ShoppingBag aria-hidden="true" size={20} strokeWidth={2.4} />
            <span>Bag</span>
            {cartCount > 0 && (
              <span className={styles.badge} data-testid="cart-badge-count">
                {cartCount}
              </span>
            )}
          </Link>
          <Link href="/create" className={styles.make}>
            Make something
          </Link>
        </div>
      </div>
      <nav className={styles.mobileNav} aria-label="Mobile navigation">
        {navigation.map((item) => (
          <Link key={item.href} href={item.href} aria-current={pathname === item.href ? 'page' : undefined}>
            {item.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
