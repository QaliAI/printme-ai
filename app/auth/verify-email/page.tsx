import Link from 'next/link';
import { Button } from '@/components/Button';
import { Card, CardBody, CardHeader } from '@/components/Card';

export default function VerifyEmailPage() {
  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <h1 className="text-2xl font-bold text-gray-900">Verify Your Email</h1>
      </CardHeader>
      <CardBody className="space-y-4">
        <p className="text-gray-600">Check your email for a verification link. Click the link to activate your account.</p>
        <p className="text-sm text-gray-500">Didn't receive an email? Check your spam folder or contact support.</p>
        <Link href="/auth/signin">
          <Button variant="outline" className="w-full">
            Back to Sign In
          </Button>
        </Link>
      </CardBody>
    </Card>
  );
}
