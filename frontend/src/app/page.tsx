"use client";

import { useState } from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { StatsDashboard } from "@/components/StatsDashboard";
import { MarketGrid } from "@/components/MarketGrid";
import { MyProperties } from "@/components/MyProperties";
import { MintProperty } from "@/components/MintProperty";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { activeChain } from "@/lib/chains";

type Tab = "marketplace" | "my-properties" | "mint";

export default function Home() {
  const [tab, setTab] = useState<Tab>("marketplace");

  const tabs: { key: Tab; label: string }[] = [
    { key: "marketplace", label: "Marketplace" },
    { key: "my-properties", label: "My Properties" },
    { key: "mint", label: "Mint" },
  ];

  return (
    <main className="min-h-screen bg-gray-950">
      {/* Nav */}
      <nav className="sticky top-0 z-50 backdrop-blur-xl bg-gray-950/80 border-b border-gray-800/50 px-6 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <svg width="28" height="28" viewBox="0 0 32 32" className="shrink-0">
              <defs>
                <linearGradient id="nav-g" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#c084fc" />
                  <stop offset="100%" stopColor="#ec4899" />
                </linearGradient>
              </defs>
              <rect width="32" height="32" rx="8" fill="#1e293b" />
              <path
                d="M10 22V10h4l4 4-4 4h4l4 4"
                fill="none"
                stroke="url(#nav-g)"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span className="font-bold text-lg text-white">PropChain</span>
          </div>
          <ConnectButton />
        </div>
      </nav>

      {/* Hero */}
      <div className="relative text-center pt-16 pb-12 px-4 bg-radial-hero">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-medium mb-6">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-purple-400" />
          </span>
          Live on {activeChain.name}
        </div>
        <h1 className="text-5xl md:text-6xl font-extrabold mb-4">
          Virtual Property.{" "}
          <span className="text-gradient">Real Yield.</span>
        </h1>
        <p className="text-gray-400 max-w-lg mx-auto text-lg">
          Mint, buy, and sell property NFTs on a decentralized marketplace.
          Earn passive PROP yield from every property you own.
        </p>
      </div>

      {/* Content */}
      <ErrorBoundary>
        <div className="max-w-6xl mx-auto px-4 pb-20 space-y-6">
          <StatsDashboard />

          {/* Tab Navigation */}
          <div className="flex gap-1 bg-gray-900/40 rounded-xl p-1 w-fit">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
                  tab === t.key
                    ? "bg-gray-800 text-white shadow-sm"
                    : "text-gray-400 hover:text-gray-300"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          {tab === "marketplace" && <MarketGrid />}
          {tab === "my-properties" && <MyProperties />}
          {tab === "mint" && <MintProperty />}
        </div>
      </ErrorBoundary>

      {/* Footer */}
      <footer className="border-t border-gray-800/50 py-6 px-4">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-gray-500">
          <span>Built with Solidity, Hardhat, Next.js, and Wagmi</span>
          <span>PropChain &mdash; NFT Property Marketplace</span>
        </div>
      </footer>
    </main>
  );
}
