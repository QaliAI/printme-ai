'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from './Button';
import { Container } from './Container';

export function Navbar() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);
      setLoading(false);
    };

    checkAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });

    return () => subscription?.unsubscribe();
  }, []);

  return (
    <nav className="bg-white border-b border-gray-200">
      <Container>
        <div className="flex items-center justify-between py-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              PrintMe.ai
            </div>
          </Link>

          <div className="flex items-center gap-6">
            <Link href="/gift-ideas" className="text-sm font-medium text-gray-600 hover:text-gray-900">
              Gift Ideas
            </Link>
            <Link href="/faq" className="text-sm font-medium text-gray-600 hover:text-gray-900">
              FAQ
            </Link>

            {!loading && (
              <div className="flex items-center gap-3">
                {user ? (
                  <>
                    <Link href="/app">
                      <Button size="sm">Dashboard</Button>
                    </Link>
                    <Link href="/auth/signout">
                      <Button size="sm" variant="outline">
                        Sign Out
                      </Button>
                    </Link>
                  </>
                ) : (
                  <>
                    <Link href="/auth/signin">
                      <Button size="sm" variant="ghost">
                        Sign In
                      </Button>
                    </Link>
                    <Link href="/auth/signup">
                      <Button size="sm">Get Started</Button>
                    </Link>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </Container>
    </nav>
  );
}
