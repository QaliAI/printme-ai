'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const user = await getCurrentUser();
      const requiresAuth = pathname?.startsWith('/app/orders');

      if (requiresAuth && !user) {
        router.push(`/auth/signin?redirect=${encodeURIComponent(pathname)}`);
      } else {
        setLoading(false);
      }
    };

    checkAuth();
  }, [router, pathname]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-80px)]">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full border-4 border-gray-300 border-t-blue-600 w-12 h-12"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
