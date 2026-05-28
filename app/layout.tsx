import type { Metadata } from "next";
import { Inter } from "next/font/google";
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
  return (
    <html lang="en" className="h-full">
      <body className={`${inter.className} min-h-full flex flex-col bg-gray-50`}>
        <Navbar />
        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}
