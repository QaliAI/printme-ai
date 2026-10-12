import type { Metadata } from 'next';
import { Anton, Archivo, Permanent_Marker, Space_Mono } from 'next/font/google';
import './globals.css';
import { Navbar } from '@/components/Navbar';
import { PunkHeader } from '@/components/punk/PunkHeader';
import { isReviewFeatureEnabled } from '@/lib/feature-flags';
import { CommerceSessionTracker } from '@/components/commerce/CommerceSessionTracker';

// Punk collage type system (all SIL Open Font License):
// Anton = massive condensed headlines, Archivo = grotesk headings + legible UI,
// Space Mono = editorial microtype, Permanent Marker = graffiti annotations only.
const anton = Anton({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-poster',
  display: 'swap',
});

const archivo = Archivo({
  subsets: ['latin'],
  axes: ['wdth'],
  variable: '--font-sans',
  display: 'swap',
});

const spaceMono = Space_Mono({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-mono',
  display: 'swap',
});

const permanentMarker = Permanent_Marker({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-marker',
  display: 'swap',
  preload: false,
});

export const metadata: Metadata = {
  metadataBase: new URL('https://printme.ai'),
  title: {
    default: 'PrintMe.ai | Your imagination. No permission required.',
    template: '%s | PrintMe.ai',
  },
  description:
    'Upload a photo or pick an original design, preview it on real products, and get it printed to order. Tees, posters and mugs made your way.',
  keywords: [
    'custom prints',
    'personalized gifts',
    'photo gifts',
    'custom poster',
    'custom t-shirt',
    'custom mug',
    'pet art gifts',
  ],
  openGraph: {
    title: 'PrintMe.ai | Your imagination. No permission required.',
    description:
      'Upload a photo or pick an original design, preview it on real products, and get it printed to order.',
    type: 'website',
    url: 'https://printme.ai',
    siteName: 'PrintMe.ai',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'PrintMe.ai | Your imagination. No permission required.',
    description:
      'Upload a photo or pick an original design, preview it on real products, and get it printed to order.',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const homepageV2Enabled = isReviewFeatureEnabled('homepage');

  return (
    <html lang="en" className="h-full">
      <body
        className={`${anton.variable} ${archivo.variable} ${spaceMono.variable} ${permanentMarker.variable} font-sans min-h-full flex flex-col bg-[#F3F0E9] text-[#111111]`}
      >
        <CommerceSessionTracker />
        {homepageV2Enabled ? <PunkHeader /> : <Navbar />}
        <main id="main" className="flex-1">{children}</main>
      </body>
    </html>
  );
}
