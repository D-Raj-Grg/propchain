"use client";

import { useReadContracts, useAccount } from "wagmi";
import { formatUnits } from "viem";
import {
  ERC20_ABI,
  PROPERTY_NFT_ABI,
  MARKETPLACE_ABI,
  PROP_TOKEN_ADDRESS,
  PROPERTY_NFT_ADDRESS,
  MARKETPLACE_ADDRESS,
} from "@/lib/contracts";

export interface ListingInfo {
  tokenId: bigint;
  name: string;
  location: string;
  area: bigint;
  seller: string;
  price: bigint;
  priceFormatted: string;
}

export function useMarketplace() {
  const { address } = useAccount();

  const { data, isLoading, refetch } = useReadContracts({
    contracts: [
      {
        address: PROPERTY_NFT_ADDRESS,
        abi: PROPERTY_NFT_ABI,
        functionName: "totalSupply",
      },
      {
        address: MARKETPLACE_ADDRESS,
        abi: MARKETPLACE_ABI,
        functionName: "feeBasisPoints",
      },
      {
        address: PROP_TOKEN_ADDRESS,
        abi: ERC20_ABI,
        functionName: "balanceOf",
        args: address ? [address] : undefined,
      },
      {
        address: PROP_TOKEN_ADDRESS,
        abi: ERC20_ABI,
        functionName: "allowance",
        args: address ? [address, MARKETPLACE_ADDRESS] : undefined,
      },
      {
        address: PROPERTY_NFT_ADDRESS,
        abi: PROPERTY_NFT_ABI,
        functionName: "isApprovedForAll",
        args: address ? [address, MARKETPLACE_ADDRESS] : undefined,
      },
    ],
    query: { refetchInterval: 5_000 },
  });

  const totalSupply = data?.[0]?.result as bigint | undefined;
  const feeBps = data?.[1]?.result as bigint | undefined;
  const propBalance = data?.[2]?.result as bigint | undefined;
  const propAllowance = data?.[3]?.result as bigint | undefined;
  const nftApprovedForAll = data?.[4]?.result as boolean | undefined;

  return {
    isLoading,
    refetch,
    totalSupply: totalSupply ?? 0n,
    feePercent: feeBps ? Number(feeBps) / 100 : 5,
    propBalance: propBalance ?? 0n,
    propBalanceFormatted: propBalance ? formatTokenAmount(propBalance) : "0.00",
    propAllowance: propAllowance ?? 0n,
    nftApprovedForAll: nftApprovedForAll ?? false,
  };
}

function formatTokenAmount(value: bigint): string {
  const num = Number(formatUnits(value, 18));
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(2)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(2)}K`;
  if (num < 0.01 && num > 0) return "<0.01";
  return num.toFixed(2);
}
