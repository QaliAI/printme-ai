'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { Button } from './Button';
import { Container } from './Container';
import { PrintMeWordmark } from '@/components/brand/PrintMeWordmark';

export function Navbar() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [scrolled, setScrolled] = useState(false);

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

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <nav
      className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-white/85 backdrop-blur-xl border-b border-slate-200/80 shadow-sm'
          : 'bg-white/0 border-b border-transparent'
      }`}
    >
      <Container>
        <div className="flex items-center justify-between py-3.5">
          <Link href="/" className="flex items-center group">
            <PrintMeWordmark size="md" />
          </Link>

          <div className="flex items-center gap-6">
            <Link
              href="/shop"
              className="text-sm font-semibold text-stone-700 hover:text-stone-900 transition-colors"
            >
              Shop
            </Link>
            <Link
              href="/create"
              className="text-sm font-semibold text-stone-700 hover:text-stone-900 transition-colors"
            >
              Create
            </Link>
            <Link
              href="/halloween"
              className="text-sm font-semibold text-stone-700 hover:text-stone-900 transition-colors"
            >
              Halloween
            </Link>
            <Link
              href="/collections"
              className="hidden md:inline text-sm font-semibold text-stone-700 hover:text-stone-900 transition-colors"
            >
              Collections
            </Link>

            {!loading && (
              <div className="flex items-center gap-2">
                {user ? (
                  <>
                    <Link href="/app">
                      <Button size="sm">Dashboard</Button>
                    </Link>
                    <Link href="/auth/signout">
                      <Button size="sm" variant="ghost">
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
                    <Link href="/app/create/style">
                      <Button
                        size="sm"
                        className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-md"
                      >
                        Get Started
                      </Button>
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
