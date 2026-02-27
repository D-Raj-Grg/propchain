"use client";

import { useReadContracts, useAccount } from "wagmi";
import { formatUnits } from "viem";
import {
  PROPERTY_NFT_ABI,
  PROPERTY_NFT_ADDRESS,
} from "@/lib/contracts";

export interface PropertyData {
  tokenId: number;
  name: string;
  location: string;
  area: number;
  mintPrice: string;
}

export function useUserProperties() {
  const { address } = useAccount();

  const { data: balanceData, isLoading: loadingBalance } = useReadContracts({
    contracts: address
      ? [
          {
            address: PROPERTY_NFT_ADDRESS,
            abi: PROPERTY_NFT_ABI,
            functionName: "balanceOf",
            args: [address],
          },
        ]
      : [],
    query: { refetchInterval: 5_000 },
  });

  const balance = (balanceData?.[0]?.result as bigint) ?? 0n;

  // Build contract calls to get token IDs for each index
  const tokenIdCalls = [];
  for (let i = 0; i < Number(balance); i++) {
    if (address) {
      tokenIdCalls.push({
        address: PROPERTY_NFT_ADDRESS as `0x${string}`,
        abi: PROPERTY_NFT_ABI,
        functionName: "tokenOfOwnerByIndex" as const,
        args: [address, BigInt(i)] as const,
      });
    }
  }

  const { data: tokenIdData, isLoading: loadingTokenIds } = useReadContracts({
    contracts: tokenIdCalls,
    query: {
      enabled: Number(balance) > 0,
      refetchInterval: 5_000,
    },
  });

  const tokenIds = tokenIdData
    ? tokenIdData.map((r) => (r.result as bigint) ?? 0n)
    : [];

  // Build contract calls to get property metadata
  const propertyCalls = tokenIds.map((id) => ({
    address: PROPERTY_NFT_ADDRESS as `0x${string}`,
    abi: PROPERTY_NFT_ABI,
    functionName: "properties" as const,
    args: [id] as const,
  }));

  const { data: propertyData, isLoading: loadingProps } = useReadContracts({
    contracts: propertyCalls,
    query: {
      enabled: tokenIds.length > 0,
      refetchInterval: 5_000,
    },
  });

  const properties: PropertyData[] = tokenIds.map((tokenId, i) => {
    const result = propertyData?.[i]?.result as
      | [string, string, bigint, bigint]
      | undefined;
    return {
      tokenId: Number(tokenId),
      name: result?.[0] ?? "Loading...",
      location: result?.[1] ?? "",
      area: Number(result?.[2] ?? 0),
      mintPrice: result?.[3] ? formatUnits(result[3], 18) : "0",
    };
  });

  return {
    isLoading: loadingBalance || loadingTokenIds || loadingProps,
    balance: Number(balance),
    properties,
  };
}
