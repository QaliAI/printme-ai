'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from '@/lib/auth';

export default function SignOutPage() {
  const router = useRouter();

  useEffect(() => {
    const logout = async () => {
      try {
        await signOut();
        router.push('/');
      } catch (error) {
        console.error('Sign out failed:', error);
        router.push('/');
      }
    };

    logout();
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-gray-600">Signing out...</p>
    </div>
  );
}
