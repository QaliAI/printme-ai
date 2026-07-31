import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import Link from 'next/link';
import './globals.css';
import { Navbar } from '@/components/Navbar';
import { HomepageV2Header } from '@/components/home-v2/HomepageV2Header';
import { isReviewFeatureEnabled } from '@/lib/feature-flags';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  metadataBase: new URL('https://printme.ai'),
  title: {
    default: 'PrintMe | Create custom prints from your photos',
    template: '%s | PrintMe',
  },
  description:
    'Upload a photo, prepare the artwork, preview it on an approved product, and create a personalized print from any device.',
  keywords: [
    'custom prints',
    'personalized gifts',
    'photo gifts',
    'custom poster',
    'custom t-shirt',
    'custom mug',
  ],
  openGraph: {
    title: 'PrintMe | Create custom prints from your photos',
    description:
      'Upload once, customize the artwork, and preview it on posters, tees, and mugs.',
    type: 'website',
    url: 'https://printme.ai',
    siteName: 'PrintMe',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'PrintMe | Create custom prints from your photos',
    description:
      'Upload once, customize the artwork, and preview it on posters, tees, and mugs.',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const commercePreviewEnabled = isReviewFeatureEnabled('commerce');
  const homepageV2Enabled = isReviewFeatureEnabled('homepage');
  const showReviewNavigation =
    process.env.VERCEL_ENV === 'preview' && commercePreviewEnabled;

  return (
    <html lang="en" className="h-full">
      <body className={`${inter.className} min-h-full flex flex-col bg-gray-50`}>
        {homepageV2Enabled ? <HomepageV2Header /> : <Navbar />}
        {showReviewNavigation && (
          <aside className="border-y border-stone-300 bg-amber-50 px-4 py-3 text-stone-900">
            <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-5 gap-y-2 text-sm">
              <strong className="mr-auto">PrintMe review preview</strong>
              <nav
                aria-label="PrintMe review routes"
                className="flex flex-wrap gap-x-4 gap-y-2"
              >
                <Link className="underline underline-offset-4" href="/create">
                  Create
                </Link>
                <Link className="underline underline-offset-4" href="/shop-v2">
                  Shop
                </Link>
                <Link className="underline underline-offset-4" href="/designs">
                  Designs
                </Link>
                <Link className="underline underline-offset-4" href="/products">
                  Products
                </Link>
              </nav>
            </div>
          </aside>
        )}
        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}
