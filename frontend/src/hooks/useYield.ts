"use client";

import { useReadContracts } from "wagmi";
import { formatUnits } from "viem";
import {
  PROPERTY_YIELD_ABI,
  PROPERTY_YIELD_ADDRESS,
} from "@/lib/contracts";

export function useYield(tokenIds: number[]) {
  const yieldCalls = tokenIds.map((id) => ({
    address: PROPERTY_YIELD_ADDRESS as `0x${string}`,
    abi: PROPERTY_YIELD_ABI,
    functionName: "pendingYield" as const,
    args: [BigInt(id)] as const,
  }));

  const { data: yieldData, isLoading, refetch } = useReadContracts({
    contracts: [
      {
        address: PROPERTY_YIELD_ADDRESS,
        abi: PROPERTY_YIELD_ABI,
        functionName: "yieldRate",
      },
      ...yieldCalls,
    ],
    query: {
      enabled: tokenIds.length > 0,
      refetchInterval: 5_000,
    },
  });

  const yieldRate = yieldData?.[0]?.result as bigint | undefined;

  const pendingYields = tokenIds.map((_, i) => {
    const val = yieldData?.[i + 1]?.result as bigint | undefined;
    return val ?? 0n;
  });

  const totalPending = pendingYields.reduce((sum, y) => sum + y, 0n);

  return {
    isLoading,
    refetch,
    yieldRate: yieldRate ? formatUnits(yieldRate, 18) : "0",
    pendingYields: pendingYields.map((y) => formatUnits(y, 18)),
    totalPending,
    totalPendingFormatted: formatUnits(totalPending, 18),
  };
}
