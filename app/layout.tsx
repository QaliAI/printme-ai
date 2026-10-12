import type { Metadata } from 'next';
import { Bricolage_Grotesque, DM_Sans } from 'next/font/google';
import './globals.css';
import { Navbar } from '@/components/Navbar';
import { HomepageV2Header } from '@/components/home-v2/HomepageV2Header';
import { isReviewFeatureEnabled } from '@/lib/feature-flags';
import { CommerceSessionTracker } from '@/components/commerce/CommerceSessionTracker';

const bricolageGrotesque = Bricolage_Grotesque({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
});

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL('https://printme.ai'),
  title: {
    default: 'PrintMe | Your photo. Your joke. Your merch.',
    template: '%s | PrintMe',
  },
  description:
    'Turn pets, people, and inside jokes into one-of-a-kind art you can print on gifts you will actually want to give.',
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
    title: 'PrintMe | Your photo. Your joke. Your merch.',
    description:
      'Turn pets, people, and inside jokes into one-of-a-kind art you can print on gifts you will actually want to give.',
    type: 'website',
    url: 'https://printme.ai',
    siteName: 'PrintMe',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'PrintMe | Your photo. Your joke. Your merch.',
    description:
      'Turn pets, people, and inside jokes into one-of-a-kind art you can print on gifts you will actually want to give.',
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
        className={`${bricolageGrotesque.variable} ${dmSans.variable} font-sans min-h-full flex flex-col bg-[#FFF9EF] text-[#151512]`}
      >
        <CommerceSessionTracker />
        {homepageV2Enabled ? <HomepageV2Header /> : <Navbar />}
        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}
