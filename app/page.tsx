import Link from 'next/link';
import { Button } from '@/components/Button';
import { Container } from '@/components/Container';

export default function Home() {
  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="py-20 md:py-32">
        <Container size="lg">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div className="flex flex-col gap-6">
              <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-gray-900">
                Turn Any Photo Into <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Custom Art</span>
              </h1>
              <p className="text-xl text-gray-600">
                Transform your favorite memories into stunning wall art, custom gifts, and personalized merchandise with AI-powered style presets.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/auth/signup" className="w-full sm:w-auto">
                  <Button size="lg" className="w-full">
                    Create Yours Now
                  </Button>
                </Link>
                <Link href="#examples" className="w-full sm:w-auto">
                  <Button size="lg" variant="outline" className="w-full">
                    See Examples
                  </Button>
                </Link>
              </div>
              <div className="flex items-center gap-6 pt-4 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Fast & Easy
                </div>
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Premium Quality
                </div>
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Shipped Fast
                </div>
              </div>
            </div>

            {/* Mock Hero Image */}
            <div className="bg-gradient-to-br from-blue-100 to-purple-100 rounded-2xl p-8 aspect-square flex items-center justify-center">
              <div className="text-center text-gray-600">
                <div className="text-6xl mb-4">🎨</div>
                <p className="font-semibold">AI Design Preview</p>
                <p className="text-sm text-gray-500">Upload your photo to get started</p>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* Style Presets Preview */}
      <section className="py-20 bg-white">
        <Container size="lg">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">12 AI Style Presets</h2>
            <p className="text-xl text-gray-600">Choose from our curated collection of artistic styles</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {['Oil Painting', 'Watercolor', 'Pop Art', 'Vintage', 'B&W Editorial', 'Cartoon', 'Pet Royal', 'Sketch', 'Line Art', 'Cinematic', 'Toy Style', 'Clean Cutout'].map(
              (style) => (
                <div
                  key={style}
                  className="bg-gray-100 rounded-lg p-6 aspect-square flex items-center justify-center hover:shadow-md transition-shadow"
                >
                  <p className="text-center font-semibold text-gray-700">{style}</p>
                </div>
              )
            )}
          </div>
        </Container>
      </section>

      {/* Products Section */}
      <section className="py-20">
        <Container size="lg">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Print on Any Product</h2>
            <p className="text-xl text-gray-600">From canvas to mugs, t-shirts to tote bags</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            {['Canvas', 'Poster', 'Mug', 'T-Shirt', 'Hoodie', 'Phone Case', 'Tote Bag', 'Sticker', 'Frame', 'Digital'].map(
              (product) => (
                <div
                  key={product}
                  className="bg-white border border-gray-200 rounded-lg p-6 text-center hover:shadow-md transition-shadow"
                >
                  <div className="text-4xl mb-3">📦</div>
                  <p className="font-semibold text-gray-900">{product}</p>
                </div>
              )
            )}
          </div>
        </Container>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <Container size="md">
          <div className="text-center">
            <h2 className="text-4xl font-bold mb-6">Ready to Create Something Amazing?</h2>
            <p className="text-xl mb-8 opacity-90">Start with your photo. Finish with your masterpiece.</p>
            <Link href="/auth/signup">
              <Button size="lg" className="bg-white text-blue-600 hover:bg-gray-100">
                Get Started Free
              </Button>
            </Link>
          </div>
        </Container>
      </section>
    </div>
  );
}
