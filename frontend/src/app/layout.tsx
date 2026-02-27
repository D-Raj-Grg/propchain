import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { Providers } from "./providers";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "PropChain — NFT Property Marketplace",
  description: "Buy, sell, and earn yield from virtual property NFTs using PROP tokens on Ethereum.",
  openGraph: {
    title: "PropChain — NFT Property Marketplace",
    description: "Mint, buy, and sell property NFTs on a decentralized marketplace. Earn passive PROP yield from every property you own.",
    url: "https://propchain-marketplace.vercel.app",
    siteName: "PropChain",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "PropChain — NFT Property Marketplace",
    description: "Mint, buy, and sell property NFTs on a decentralized marketplace. Earn passive PROP yield from every property you own.",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body
        className={`${inter.className} ${jetbrainsMono.variable} bg-gray-950 text-white min-h-screen antialiased`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
