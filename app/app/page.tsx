import Link from 'next/link';
import { Button } from '@/components/Button';
import { Container } from '@/components/Container';
import { Card, CardBody } from '@/components/Card';

export default function AppPage() {
  return (
    <Container size="lg" className="py-12">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Welcome Back!</h1>
        <p className="text-lg text-gray-600">Ready to create something amazing?</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <Link href="/app/create/style">
          <Card hover className="cursor-pointer h-full">
            <CardBody className="text-center py-12">
              <div className="text-5xl mb-4">🎨</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Create New</h3>
              <p className="text-gray-600 mb-4">Start a new design from scratch</p>
              <Button variant="outline" className="w-full">
                Begin
              </Button>
            </CardBody>
          </Card>
        </Link>

        <Link href="/app/orders">
          <Card hover className="cursor-pointer h-full">
            <CardBody className="text-center py-12">
              <div className="text-5xl mb-4">📦</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">My Orders</h3>
              <p className="text-gray-600 mb-4">View your order history and status</p>
              <Button variant="outline" className="w-full">
                View Orders
              </Button>
            </CardBody>
          </Card>
        </Link>

        <Link href="/app/designs">
          <Card hover className="cursor-pointer h-full">
            <CardBody className="text-center py-12">
              <div className="text-5xl mb-4">💾</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">My Designs</h3>
              <p className="text-gray-600 mb-4">Manage your saved designs</p>
              <Button variant="outline" className="w-full">
                View Designs
              </Button>
            </CardBody>
          </Card>
        </Link>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">💡 Pro Tip</h3>
        <p className="text-gray-700">Start by choosing your favorite AI art style, then upload a photo. Our AI will transform it in seconds!</p>
      </div>
    </Container>
  );
}
