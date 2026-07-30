'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getCurrentProfile } from '@/lib/auth';

const navigation = [
  ['Overview', '/studio'],
  ['Designs', '/studio/designs'],
  ['Collections', '/studio/collections'],
  ['Drops', '/studio/drops'],
  ['Products', '/studio/products'],
  ['Publishing', '/studio/publishing'],
] as const;

export function StudioShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [authorized, setAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    void getCurrentProfile()
      .then((profile) => {
        if (cancelled) return;
        if (!profile?.is_admin) {
          router.replace(
            `/auth/signin?redirect=${encodeURIComponent(pathname)}`,
          );
          setAuthorized(false);
          return;
        }
        setAuthorized(true);
      })
      .catch(() => {
        if (!cancelled) {
          router.replace(
            `/auth/signin?redirect=${encodeURIComponent(pathname)}`,
          );
          setAuthorized(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [pathname, router]);

  if (authorized !== true) {
    return (
      <main className="studio-auth-state" aria-busy="true">
        <p>Verifying Studio access...</p>
      </main>
    );
  }

  return (
    <div className="studio-shell">
      <aside className="studio-sidebar">
        <Link href="/studio" className="studio-brand">
          <span>PrintMe</span>
          <strong>Studio</strong>
        </Link>
        <nav aria-label="Studio">
          {navigation.map(([label, href]) => (
            <Link
              key={href}
              href={href}
              aria-current={pathname === href ? 'page' : undefined}
            >
              {label}
            </Link>
          ))}
        </nav>
        <Link href="/" className="studio-store-link">
          View storefront
        </Link>
      </aside>
      <main className="studio-main">{children}</main>
    </div>
  );
}
