'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { Button } from './Button';
import { Container } from './Container';

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

    // eslint-disable-next-line react-hooks/set-state-in-effect
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
          <Link href="/" className="flex items-center gap-2.5 group">
            {/* Logo mark */}
            <div className="relative w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-600 via-purple-600 to-rose-600 flex items-center justify-center shadow-md group-hover:shadow-lg transition-shadow">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              {/* Sparkle accent */}
              <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-amber-400 rounded-full ring-2 ring-white" />
            </div>
            <div className="text-xl font-bold text-slate-900 tracking-tight">
              PrintMe<span className="text-indigo-600">.ai</span>
            </div>
          </Link>

          <div className="flex items-center gap-6">
            <Link
              href="/#how-it-works"
              className="hidden md:inline text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
            >
              How it Works
            </Link>
            <Link
              href="/gift-ideas"
              className="hidden md:inline text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
            >
              Gift Ideas
            </Link>
            <Link
              href="/faq"
              className="hidden md:inline text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
            >
              FAQ
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
                    <Link href="/auth/signup">
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
