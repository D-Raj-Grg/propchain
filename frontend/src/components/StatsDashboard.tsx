"use client";

import { useAccount } from "wagmi";
import { useMarketplace } from "@/hooks/useMarketplace";
import { useUserProperties } from "@/hooks/usePropertyNFT";
import { StatCard } from "./StatCard";

export function StatsDashboard() {
  const { address } = useAccount();
  const { isLoading, totalSupply, feePercent, propBalanceFormatted } = useMarketplace();
  const { balance: nftBalance } = useUserProperties();

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <StatCard
        label="Total Properties"
        value={totalSupply.toString()}
        sub="Minted NFTs"
        isLoading={isLoading}
        accent="brand"
      />
      <StatCard
        label="Marketplace Fee"
        value={`${feePercent}%`}
        sub="On every sale"
        isLoading={isLoading}
        accent="pink"
      />
      {address && (
        <>
          <StatCard
            label="Your Properties"
            value={nftBalance.toString()}
            sub="Owned NFTs"
            isLoading={isLoading}
            accent="emerald"
          />
          <StatCard
            label="PROP Balance"
            value={propBalanceFormatted}
            sub="Available to spend"
            isLoading={isLoading}
            accent="amber"
          />
        </>
      )}
    </div>
  );
}
