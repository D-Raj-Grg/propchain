"use client";

import { useState, useEffect } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContracts } from "wagmi";
import { parseEther, formatUnits } from "viem";
import { toast } from "sonner";
import { PropertyCard } from "./PropertyCard";
import { getExplorerTxUrl } from "@/lib/chains";
import { useUserProperties } from "@/hooks/usePropertyNFT";
import { useYield } from "@/hooks/useYield";
import { useMarketplace } from "@/hooks/useMarketplace";
import {
  PROPERTY_NFT_ABI,
  MARKETPLACE_ABI,
  PROPERTY_YIELD_ABI,
  PROPERTY_NFT_ADDRESS,
  MARKETPLACE_ADDRESS,
  PROPERTY_YIELD_ADDRESS,
} from "@/lib/contracts";

export function MyProperties() {
  const { address } = useAccount();
  const { properties, isLoading, balance } = useUserProperties();
  const { nftApprovedForAll, refetch: refetchMarket } = useMarketplace();
  const tokenIds = properties.map((p) => p.tokenId);
  const { pendingYields, totalPending, totalPendingFormatted, refetch: refetchYield } = useYield(tokenIds);

  const [listTokenId, setListTokenId] = useState<number | null>(null);
  const [listPrice, setListPrice] = useState("");

  // Check listing status for each owned property
  const listingCalls = properties.map((p) => ({
    address: MARKETPLACE_ADDRESS as `0x${string}`,
    abi: MARKETPLACE_ABI,
    functionName: "listings" as const,
    args: [BigInt(p.tokenId)] as const,
  }));

  const { data: listingStatuses } = useReadContracts({
    contracts: listingCalls,
    query: { enabled: properties.length > 0, refetchInterval: 5_000 },
  });

  // Approve NFT for marketplace
  const { data: approveHash, writeContract: writeApprove, isPending: isApproving, error: approveError } = useWriteContract();
  const { isSuccess: isApproveSuccess } = useWaitForTransactionReceipt({ hash: approveHash });

  // List property
  const { data: listHash, writeContract: writeList, isPending: isListing, error: listError } = useWriteContract();
  const { isLoading: isConfirmingList, isSuccess: isListSuccess } = useWaitForTransactionReceipt({ hash: listHash });

  // Delist property
  const { data: delistHash, writeContract: writeDelist, isPending: isDelisting, error: delistError } = useWriteContract();
  const { isLoading: isConfirmingDelist, isSuccess: isDelistSuccess } = useWaitForTransactionReceipt({ hash: delistHash });

  // Claim yield
  const { data: claimHash, writeContract: writeClaim, isPending: isClaiming, error: claimError } = useWriteContract();
  const { isLoading: isConfirmingClaim, isSuccess: isClaimSuccess } = useWaitForTransactionReceipt({ hash: claimHash });

  // Error handling
  useEffect(() => {
    if (approveError) {
      toast.dismiss("tx");
      toast.error((approveError as any).shortMessage || "Approval failed");
    }
  }, [approveError]);

  useEffect(() => {
    if (listError) {
      toast.dismiss("tx");
      toast.error((listError as any).shortMessage || "Listing failed");
    }
  }, [listError]);

  useEffect(() => {
    if (delistError) {
      toast.dismiss("tx");
      toast.error((delistError as any).shortMessage || "Delisting failed");
    }
  }, [delistError]);

  useEffect(() => {
    if (claimError) {
      toast.dismiss("yield");
      toast.error((claimError as any).shortMessage || "Claim failed");
    }
  }, [claimError]);

  function handleList(tokenId: number) {
    if (!nftApprovedForAll) {
      toast.loading("Approving NFTs for marketplace...", { id: "tx" });
      writeApprove({
        address: PROPERTY_NFT_ADDRESS,
        abi: PROPERTY_NFT_ABI,
        functionName: "setApprovalForAll",
        args: [MARKETPLACE_ADDRESS, true],
      });
      return;
    }
    setListTokenId(tokenId);
  }

  function submitListing() {
    if (listTokenId === null || !listPrice || Number(listPrice) <= 0) return;

    toast.loading("Listing property...", { id: "tx" });
    writeList({
      address: MARKETPLACE_ADDRESS,
      abi: MARKETPLACE_ABI,
      functionName: "listProperty",
      args: [BigInt(listTokenId), parseEther(listPrice)],
    });
  }

  function handleDelist(tokenId: number) {
    toast.loading("Delisting property...", { id: "tx" });
    writeDelist({
      address: MARKETPLACE_ADDRESS,
      abi: MARKETPLACE_ABI,
      functionName: "delistProperty",
      args: [BigInt(tokenId)],
    });
  }

  function handleClaimAll() {
    if (tokenIds.length === 0 || totalPending === 0n) return;

    toast.loading("Claiming yield...", { id: "yield" });
    writeClaim({
      address: PROPERTY_YIELD_ADDRESS,
      abi: PROPERTY_YIELD_ABI,
      functionName: "batchClaimYield",
      args: [tokenIds.map((id) => BigInt(id))],
    });
  }

  useEffect(() => {
    if (isApproveSuccess) {
      toast.success("NFTs approved! Now click List again.", { id: "tx" });
      refetchMarket();
    }
  }, [isApproveSuccess, refetchMarket]);

  useEffect(() => {
    if (isListSuccess && listHash) {
      const url = getExplorerTxUrl(listHash);
      toast.success("Property listed!", {
        id: "tx",
        action: url
          ? { label: "View on Explorer", onClick: () => window.open(url, "_blank") }
          : undefined,
      });
      setListTokenId(null);
      setListPrice("");
    }
  }, [isListSuccess, listHash]);

  useEffect(() => {
    if (isDelistSuccess && delistHash) {
      const url = getExplorerTxUrl(delistHash);
      toast.success("Property delisted!", {
        id: "tx",
        action: url
          ? { label: "View on Explorer", onClick: () => window.open(url, "_blank") }
          : undefined,
      });
    }
  }, [isDelistSuccess, delistHash]);

  useEffect(() => {
    if (isClaimSuccess && claimHash) {
      const url = getExplorerTxUrl(claimHash);
      toast.success("Yield claimed!", {
        id: "yield",
        action: url
          ? { label: "View on Explorer", onClick: () => window.open(url, "_blank") }
          : undefined,
      });
      refetchYield();
    }
  }, [isClaimSuccess, claimHash, refetchYield]);

  if (!address) {
    return (
      <div className="glass-card p-8 text-center">
        <div className="text-4xl mb-3">&#x1F511;</div>
        <p className="text-gray-400">Connect your wallet to view your properties</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="glass-card p-5 h-48 animate-shimmer" />
        ))}
      </div>
    );
  }

  if (balance === 0) {
    return (
      <div className="glass-card p-8 text-center">
        <div className="text-4xl mb-3">&#x1F3E2;</div>
        <p className="text-gray-400">You don't own any properties yet</p>
        <p className="text-xs text-gray-500 mt-1">Buy properties from the marketplace to start earning yield</p>
      </div>
    );
  }

  const isListPriceValid = listPrice !== "" && Number(listPrice) > 0;

  return (
    <div className="space-y-4">
      {/* Yield Summary */}
      {totalPending > 0n && (
        <div className="glass-card p-4 flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-400">Total Pending Yield</p>
            <p className="text-xl font-bold text-emerald-400 font-[family-name:var(--font-mono)]">
              {Number(totalPendingFormatted).toFixed(4)} PROP
            </p>
          </div>
          <button
            onClick={handleClaimAll}
            disabled={isClaiming || isConfirmingClaim}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold text-sm hover:brightness-110 transition disabled:opacity-50"
          >
            {isClaiming || isConfirmingClaim ? "Claiming..." : "Claim All Yield"}
          </button>
        </div>
      )}

      {/* List Price Modal */}
      {listTokenId !== null && (
        <div className="glass-card p-4 flex items-center gap-3 border-purple-500/30">
          <span className="text-sm text-gray-400">List Property #{listTokenId} for:</span>
          <div className="flex flex-col flex-1 max-w-xs">
            <div className="flex items-center bg-gray-800/60 rounded-xl border border-gray-700/50 overflow-hidden focus-within:border-purple-500/50">
              <input
                type="text"
                inputMode="decimal"
                placeholder="0.00"
                value={listPrice}
                onChange={(e) => {
                  if (/^\d*\.?\d*$/.test(e.target.value)) setListPrice(e.target.value);
                }}
                className="flex-1 bg-transparent px-3 py-2 text-white outline-none font-[family-name:var(--font-mono)] text-sm"
              />
              <span className="pr-3 text-gray-400 text-xs">PROP</span>
            </div>
            {listPrice !== "" && !isListPriceValid && (
              <p className="text-red-400 text-xs mt-1">Price must be greater than 0</p>
            )}
          </div>
          <button
            onClick={submitListing}
            disabled={!isListPriceValid || isListing || isConfirmingList}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-500 to-cyan-500 text-white text-sm font-semibold hover:brightness-110 transition disabled:opacity-50"
          >
            {isListing || isConfirmingList ? "Listing..." : "Confirm"}
          </button>
          <button
            onClick={() => { setListTokenId(null); setListPrice(""); }}
            className="text-gray-400 hover:text-white text-lg"
          >
            &times;
          </button>
        </div>
      )}

      {/* Property Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {properties.map((p, i) => {
          const listing = listingStatuses?.[i]?.result as [string, bigint, boolean] | undefined;
          const isListed = listing?.[2] ?? false;
          const listedPrice = listing?.[1];

          return (
            <PropertyCard
              key={p.tokenId}
              tokenId={p.tokenId}
              name={p.name}
              location={p.location}
              area={p.area}
              price={isListed ? listedPrice : undefined}
              priceLabel={isListed ? "Listed Price" : undefined}
              yieldInfo={pendingYields[i] ? Number(pendingYields[i]).toFixed(4) : undefined}
              onAction={isListed ? () => handleDelist(p.tokenId) : () => handleList(p.tokenId)}
              actionLabel={isListed ? "Delist" : nftApprovedForAll ? "List for Sale" : "Approve & List"}
              actionColor={isListed ? "red" : nftApprovedForAll ? "purple" : "amber"}
              isPending={isListing || isConfirmingList || isApproving || isDelisting || isConfirmingDelist}
            />
          );
        })}
      </div>
    </div>
  );
}
