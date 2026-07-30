import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import { Navbar } from "@/components/Navbar";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "PrintMe.ai - Turn Photos into Custom Prints",
  description: "Create custom art, gifts, and merchandise with AI-powered photo editing. Upload, generate, and order premium prints.",
  keywords: "AI art, custom prints, merchandise, gifts, photo editing",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const commercePreviewEnabled =
    process.env.NEXT_PUBLIC_COMMERCE_V2_ENABLED === "true";

  return (
    <html lang="en" className="h-full">
      <body className={`${inter.className} min-h-full flex flex-col bg-gray-50`}>
        <Navbar />
        {commercePreviewEnabled && (
          <aside className="border-y border-stone-300 bg-amber-50 px-4 py-3 text-stone-900">
            <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-5 gap-y-2 text-sm">
              <strong className="mr-auto">Commerce V2 review preview</strong>
              <nav
                aria-label="Commerce V2 review routes"
                className="flex flex-wrap gap-x-4 gap-y-2"
              >
                <Link className="underline underline-offset-4" href="/shop-v2">
                  Shop V2
                </Link>
                <Link className="underline underline-offset-4" href="/designs">
                  Designs
                </Link>
                <Link className="underline underline-offset-4" href="/drops">
                  Drops
                </Link>
                <Link className="underline underline-offset-4" href="/collections">
                  Collections
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
