"use client";

import { useState, useEffect } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContracts } from "wagmi";
import { formatUnits } from "viem";
import { toast } from "sonner";
import { getExplorerTxUrl } from "@/lib/chains";
import {
  MARKETPLACE_ABI,
  PROPERTY_NFT_ABI,
  MARKETPLACE_ADDRESS,
  PROPERTY_NFT_ADDRESS,
} from "@/lib/contracts";

interface UserOffer {
  tokenId: number;
  offerId: number;
  amount: bigint;
  propertyName: string;
  propertyLocation: string;
}

export function MyOffers() {
  const { address } = useAccount();
  const [userOffers, setUserOffers] = useState<UserOffer[]>([]);

  // Get total supply to iterate all properties
  const { data: supplyData } = useReadContracts({
    contracts: [
      {
        address: PROPERTY_NFT_ADDRESS,
        abi: PROPERTY_NFT_ABI,
        functionName: "totalSupply",
      },
    ],
    query: { refetchInterval: 5_000 },
  });

  const totalSupply = Number((supplyData?.[0]?.result as bigint) ?? 0n);

  // Get offer counts for all properties
  const offerCountCalls = [];
  for (let i = 0; i < totalSupply; i++) {
    offerCountCalls.push({
      address: MARKETPLACE_ADDRESS as `0x${string}`,
      abi: MARKETPLACE_ABI,
      functionName: "offerCount" as const,
      args: [BigInt(i)] as const,
    });
  }

  const { data: offerCountData } = useReadContracts({
    contracts: offerCountCalls,
    query: { enabled: totalSupply > 0, refetchInterval: 5_000 },
  });

  // Build offer read calls for all (tokenId, offerId) pairs
  const offerReadCalls: Array<{
    address: `0x${string}`;
    abi: typeof MARKETPLACE_ABI;
    functionName: "offers";
    args: readonly [bigint, bigint];
  }> = [];
  const propReadCalls: Array<{
    address: `0x${string}`;
    abi: typeof PROPERTY_NFT_ABI;
    functionName: "properties";
    args: readonly [bigint];
  }> = [];
  const offerMeta: Array<{ tokenId: number; offerId: number }> = [];

  if (offerCountData) {
    for (let tokenId = 0; tokenId < totalSupply; tokenId++) {
      const count = Number((offerCountData[tokenId]?.result as bigint) ?? 0n);
      for (let offerId = 0; offerId < count; offerId++) {
        offerReadCalls.push({
          address: MARKETPLACE_ADDRESS as `0x${string}`,
          abi: MARKETPLACE_ABI,
          functionName: "offers",
          args: [BigInt(tokenId), BigInt(offerId)] as const,
        });
        offerMeta.push({ tokenId, offerId });
      }
    }
    // Also read property metadata for each unique tokenId that has offers
    const uniqueTokenIds = [...new Set(offerMeta.map((m) => m.tokenId))];
    for (const tokenId of uniqueTokenIds) {
      propReadCalls.push({
        address: PROPERTY_NFT_ADDRESS as `0x${string}`,
        abi: PROPERTY_NFT_ABI,
        functionName: "properties",
        args: [BigInt(tokenId)] as const,
      });
    }
  }

  const { data: offersAndPropsData } = useReadContracts({
    contracts: [...offerReadCalls, ...propReadCalls],
    query: { enabled: offerReadCalls.length > 0, refetchInterval: 5_000 },
  });

  useEffect(() => {
    if (!offersAndPropsData || !address || offerReadCalls.length === 0) {
      setUserOffers([]);
      return;
    }

    // Build property name map
    const uniqueTokenIds = [...new Set(offerMeta.map((m) => m.tokenId))];
    const propMap = new Map<number, { name: string; location: string }>();
    for (let i = 0; i < uniqueTokenIds.length; i++) {
      const prop = offersAndPropsData[offerReadCalls.length + i]?.result as [string, string, bigint, bigint] | undefined;
      if (prop) {
        propMap.set(uniqueTokenIds[i], { name: prop[0], location: prop[1] });
      }
    }

    const mine: UserOffer[] = [];
    for (let i = 0; i < offerMeta.length; i++) {
      const offer = offersAndPropsData[i]?.result as [string, bigint, boolean] | undefined;
      if (offer && offer[2] && offer[0].toLowerCase() === address.toLowerCase()) {
        const meta = offerMeta[i];
        const propInfo = propMap.get(meta.tokenId);
        mine.push({
          tokenId: meta.tokenId,
          offerId: meta.offerId,
          amount: offer[1],
          propertyName: propInfo?.name ?? `Property #${meta.tokenId}`,
          propertyLocation: propInfo?.location ?? "",
        });
      }
    }
    setUserOffers(mine);
  }, [offersAndPropsData, address]);

  // Cancel offer
  const { data: cancelHash, writeContract: writeCancel, isPending: isCancelling, error: cancelError } = useWriteContract();
  const { isLoading: isConfirmingCancel, isSuccess: isCancelSuccess } = useWaitForTransactionReceipt({ hash: cancelHash });

  useEffect(() => {
    if (cancelError) {
      toast.dismiss("cancel-offer");
      toast.error((cancelError as any).shortMessage || "Cancel failed");
    }
  }, [cancelError]);

  useEffect(() => {
    if (isCancelSuccess && cancelHash) {
      const url = getExplorerTxUrl(cancelHash);
      toast.success("Offer cancelled & refunded!", {
        id: "cancel-offer",
        action: url
          ? { label: "View on Explorer", onClick: () => window.open(url, "_blank") }
          : undefined,
      });
    }
  }, [isCancelSuccess, cancelHash]);

  function handleCancel(tokenId: number, offerId: number) {
    toast.loading("Cancelling offer...", { id: "cancel-offer" });
    writeCancel({
      address: MARKETPLACE_ADDRESS,
      abi: MARKETPLACE_ABI,
      functionName: "cancelOffer",
      args: [BigInt(tokenId), BigInt(offerId)],
    });
  }

  if (!address) {
    return (
      <div className="glass-card p-8 text-center">
        <div className="text-4xl mb-3">&#x1F4DD;</div>
        <p className="text-gray-400">Connect your wallet to view your offers</p>
      </div>
    );
  }

  if (userOffers.length === 0) {
    return (
      <div className="glass-card p-8 text-center">
        <div className="text-4xl mb-3">&#x1F4E8;</div>
        <p className="text-gray-400">No active offers</p>
        <p className="text-xs text-gray-500 mt-1">Make offers on properties in the marketplace</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {userOffers.map((o) => (
        <div key={`${o.tokenId}-${o.offerId}`} className="glass-card p-4 flex items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="font-semibold text-white truncate">{o.propertyName}</h4>
              <span className="text-xs bg-gray-800 px-2 py-0.5 rounded-lg text-gray-400 font-mono shrink-0">
                #{o.tokenId}
              </span>
            </div>
            {o.propertyLocation && (
              <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                <span className="text-purple-400">&#x25C9;</span> {o.propertyLocation}
              </p>
            )}
          </div>
          <div className="text-right shrink-0">
            <p className="text-sm text-gray-400">Your Offer</p>
            <p className="text-white font-semibold font-[family-name:var(--font-mono)]">
              {Number(formatUnits(o.amount, 18)).toLocaleString()} PROP
            </p>
          </div>
          <button
            onClick={() => handleCancel(o.tokenId, o.offerId)}
            disabled={isCancelling || isConfirmingCancel}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-red-500 to-rose-500 text-white text-sm font-semibold hover:brightness-110 transition disabled:opacity-50 shrink-0"
          >
            {isCancelling || isConfirmingCancel ? "Cancelling..." : "Cancel"}
          </button>
        </div>
      ))}
    </div>
  );
}
