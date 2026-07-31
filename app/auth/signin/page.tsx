'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Card, CardBody, CardHeader, CardFooter } from '@/components/Card';
import { signIn } from '@/lib/auth';

function SignInContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '/app';
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({ email: '', password: '' });

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      setLoading(true);
      await signIn(formData.email, formData.password);
      router.push(redirect);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to sign in');
    } finally {
      setLoading(false);
    }
  };

  const redirectParam = searchParams.get('redirect');

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <h1 className="text-2xl font-bold text-gray-900">Sign In</h1>
        <p className="text-sm text-gray-600 mt-2">Welcome back to PrintMe.ai</p>
      </CardHeader>

      <CardBody>
        <form onSubmit={handleSignIn} className="space-y-4">
          {error && <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
            <Input
              type="email"
              placeholder="you@example.com"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
            <Input
              type="password"
              placeholder="••••••••"
              required
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            />
          </div>

          <Button type="submit" size="lg" loading={loading} className="w-full">
            Sign In
          </Button>
        </form>
      </CardBody>

      <CardFooter className="flex flex-col gap-4">
        <p className="text-sm text-gray-600 text-center">
          Don&apos;t have an account?{' '}
          <Link
            href={`/auth/signup${redirectParam ? `?redirect=${encodeURIComponent(redirectParam)}` : ''}`}
            className="font-medium text-blue-600 hover:text-blue-700"
          >
            Sign up
          </Link>
        </p>
        <Link href="/auth/reset-password" className="text-sm text-center text-blue-600 hover:text-blue-700 font-medium">
          Forgot password?
        </Link>
      </CardFooter>
    </Card>
  );
}

export default function SignInPage() {
  return (
    <Suspense
      fallback={
        <div className="w-full max-w-md p-8 text-center bg-white rounded-2xl shadow-lg">
          <div className="text-4xl animate-pulse">✨</div>
        </div>
      }
    >
      <SignInContent />
    </Suspense>
  );
}
