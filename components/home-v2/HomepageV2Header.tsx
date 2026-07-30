'use client';

import Link from 'next/link';
import { Search, ShoppingBag } from 'lucide-react';
import { usePathname } from 'next/navigation';
import styles from '@/app/home-v2.module.css';
import { Navbar } from '@/components/Navbar';

const navigation = [
  { href: '/designs', label: 'Shop Designs' },
  { href: '/create', label: 'Create Yours' },
  { href: '/#products', label: 'Products' },
  { href: '/#gifts', label: 'Gifts' },
];

export function HomepageV2Header() {
  const pathname = usePathname();

  if (pathname.startsWith('/studio')) {
    return null;
  }
  if (pathname !== '/') {
    return <Navbar />;
  }

  return (
    <header className={styles.siteHeader}>
      <div className={styles.headerPrimary}>
        <Link className={styles.wordmark} href="/" aria-label="PrintMe home">
          <span aria-hidden="true">P</span>
          PrintMe
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
          <Link href="/shop-v2" aria-label="Open cart">
            <ShoppingBag aria-hidden="true" size={18} strokeWidth={1.8} />
            <span>Cart</span>
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
      </nav>
    </header>
  );
}
