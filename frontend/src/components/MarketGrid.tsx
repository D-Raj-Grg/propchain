"use client";

import { useState, useEffect } from "react";
import { useReadContracts, useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseEther, formatUnits, maxUint256 } from "viem";
import { toast } from "sonner";
import { Home, Hammer } from "lucide-react";
import { PropertyCard } from "./PropertyCard";
import { OfferModal } from "./OfferModal";
import { getExplorerTxUrl } from "@/lib/chains";
import {
  PROPERTY_NFT_ABI,
  MARKETPLACE_ABI,
  ERC20_ABI,
  PROPERTY_NFT_ADDRESS,
  MARKETPLACE_ADDRESS,
  PROP_TOKEN_ADDRESS,
} from "@/lib/contracts";

interface ListingData {
  tokenId: number;
  name: string;
  location: string;
  area: number;
  seller: string;
  price: bigint;
}

export function MarketGrid() {
  const { address } = useAccount();
  const [listings, setListings] = useState<ListingData[]>([]);
  const [offerTokenId, setOfferTokenId] = useState<number | null>(null);

  // Get total supply to iterate
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

  // Build listing calls for all token IDs
  const listingCalls = [];
  const propertyCalls = [];
  for (let i = 0; i < totalSupply; i++) {
    listingCalls.push({
      address: MARKETPLACE_ADDRESS as `0x${string}`,
      abi: MARKETPLACE_ABI,
      functionName: "listings" as const,
      args: [BigInt(i)] as const,
    });
    propertyCalls.push({
      address: PROPERTY_NFT_ADDRESS as `0x${string}`,
      abi: PROPERTY_NFT_ABI,
      functionName: "properties" as const,
      args: [BigInt(i)] as const,
    });
  }

  const { data: listingsData } = useReadContracts({
    contracts: [...listingCalls, ...propertyCalls],
    query: { enabled: totalSupply > 0, refetchInterval: 5_000 },
  });

  useEffect(() => {
    if (!listingsData || totalSupply === 0) return;

    const active: ListingData[] = [];
    for (let i = 0; i < totalSupply; i++) {
      const listing = listingsData[i]?.result as [string, bigint, boolean] | undefined;
      const prop = listingsData[totalSupply + i]?.result as [string, string, bigint, bigint] | undefined;

      if (listing && listing[2] && prop) {
        active.push({
          tokenId: i,
          seller: listing[0],
          price: listing[1],
          name: prop[0],
          location: prop[1],
          area: Number(prop[2]),
        });
      }
    }
    setListings(active);
  }, [listingsData, totalSupply]);

  // Buy transaction
  const { data: buyHash, writeContract: writeBuy, isPending: isBuying, error: buyError } = useWriteContract();
  const { isLoading: isConfirmingBuy, isSuccess: isBuySuccess } = useWaitForTransactionReceipt({ hash: buyHash });

  // Approve PROP for marketplace
  const { data: approveHash, writeContract: writeApprove, isPending: isApproving, error: approveError } = useWriteContract();
  const { isLoading: isConfirmingApprove, isSuccess: isApproveSuccess } = useWaitForTransactionReceipt({ hash: approveHash });

  // Error handling
  useEffect(() => {
    if (buyError) {
      toast.dismiss("tx");
      toast.error((buyError as any).shortMessage || "Purchase failed");
    }
  }, [buyError]);

  useEffect(() => {
    if (approveError) {
      toast.dismiss("tx");
      toast.error((approveError as any).shortMessage || "Approval failed");
    }
  }, [approveError]);

  // Check allowance
  const { data: allowanceData } = useReadContracts({
    contracts: address
      ? [
          {
            address: PROP_TOKEN_ADDRESS,
            abi: ERC20_ABI,
            functionName: "allowance",
            args: [address, MARKETPLACE_ADDRESS],
          },
        ]
      : [],
    query: { refetchInterval: 3_000 },
  });

  const allowance = (allowanceData?.[0]?.result as bigint) ?? 0n;

  function handleBuy(tokenId: number, price: bigint) {
    if (allowance < price) {
      toast.loading("Approving PROP tokens...", { id: "tx" });
      writeApprove({
        address: PROP_TOKEN_ADDRESS,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [MARKETPLACE_ADDRESS, maxUint256],
      });
      return;
    }

    toast.loading("Purchasing property...", { id: "tx" });
    writeBuy({
      address: MARKETPLACE_ADDRESS,
      abi: MARKETPLACE_ABI,
      functionName: "buyProperty",
      args: [BigInt(tokenId)],
    });
  }

  useEffect(() => {
    if (isApproveSuccess) {
      toast.success("PROP approved! Click Buy again.", { id: "tx" });
    }
  }, [isApproveSuccess]);

  useEffect(() => {
    if (isBuySuccess && buyHash) {
      const url = getExplorerTxUrl(buyHash);
      toast.success("Property purchased!", {
        id: "tx",
        action: url
          ? { label: "View on Explorer", onClick: () => window.open(url, "_blank") }
          : undefined,
      });
    }
  }, [isBuySuccess, buyHash]);

  if (!address) {
    return (
      <div className="glass-card p-8 text-center">
        <Home className="w-10 h-10 text-gray-500 mx-auto mb-3" />
        <p className="text-gray-400">Connect your wallet to browse the marketplace</p>
      </div>
    );
  }

  if (listings.length === 0) {
    return (
      <div className="glass-card p-8 text-center">
        <Hammer className="w-10 h-10 text-gray-500 mx-auto mb-3" />
        <p className="text-gray-400">No properties listed yet</p>
        <p className="text-xs text-gray-500 mt-1">Properties will appear here once listed for sale</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {listings.map((l) => (
          <PropertyCard
            key={l.tokenId}
            tokenId={l.tokenId}
            name={l.name}
            location={l.location}
            area={l.area}
            price={l.price}
            priceLabel="Listed Price"
            onAction={() => handleBuy(l.tokenId, l.price)}
            actionLabel={allowance < l.price ? "Approve PROP" : "Buy Now"}
            actionColor={allowance < l.price ? "amber" : "purple"}
            secondaryAction={() => setOfferTokenId(l.tokenId)}
            secondaryLabel="Make Offer"
            isPending={isBuying || isConfirmingBuy || isApproving || isConfirmingApprove}
          />
        ))}
      </div>

      {offerTokenId !== null && (
        <OfferModal
          tokenId={offerTokenId}
          onClose={() => setOfferTokenId(null)}
        />
      )}
    </>
  );
}
