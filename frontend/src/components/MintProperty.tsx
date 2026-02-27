"use client";

import { useState, useEffect } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from "wagmi";
import { parseEther } from "viem";
import { toast } from "sonner";
import { Lock, ShieldAlert } from "lucide-react";
import { getExplorerTxUrl } from "@/lib/chains";
import { PROPERTY_NFT_ABI, PROPERTY_NFT_ADDRESS } from "@/lib/contracts";

export function MintProperty() {
  const { address } = useAccount();
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [area, setArea] = useState("");
  const [mintPrice, setMintPrice] = useState("");

  // Admin guard: read contract owner
  const { data: contractOwner } = useReadContract({
    address: PROPERTY_NFT_ADDRESS,
    abi: PROPERTY_NFT_ABI,
    functionName: "owner",
  });

  const isAdmin = address && contractOwner && address.toLowerCase() === (contractOwner as string).toLowerCase();

  const { data: hash, writeContract, isPending, error: mintError } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  // Error handling
  useEffect(() => {
    if (mintError) {
      toast.dismiss("mint");
      toast.error((mintError as any).shortMessage || "Minting failed");
    }
  }, [mintError]);

  function handleMint() {
    if (!name || !location || !area || !mintPrice || !address) return;

    toast.loading("Minting property...", { id: "mint" });
    writeContract({
      address: PROPERTY_NFT_ADDRESS,
      abi: PROPERTY_NFT_ABI,
      functionName: "mintProperty",
      args: [address, name, location, BigInt(area), parseEther(mintPrice)],
    });
  }

  useEffect(() => {
    if (isSuccess && hash) {
      const url = getExplorerTxUrl(hash);
      toast.success("Property minted!", {
        id: "mint",
        action: url
          ? { label: "View on Explorer", onClick: () => window.open(url, "_blank") }
          : undefined,
      });
      setName("");
      setLocation("");
      setArea("");
      setMintPrice("");
    }
  }, [isSuccess, hash]);

  if (!address) {
    return (
      <div className="glass-card p-8 text-center">
        <Lock className="w-10 h-10 text-gray-500 mx-auto mb-3" />
        <p className="text-gray-400">Connect your wallet to mint properties</p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="glass-card p-8 text-center">
        <ShieldAlert className="w-10 h-10 text-gray-500 mx-auto mb-3" />
        <p className="text-gray-400 font-semibold">Admin Only</p>
        <p className="text-xs text-gray-500 mt-1">
          Only the contract owner can mint new properties.
        </p>
      </div>
    );
  }

  return (
    <div className="glass-card p-6 max-w-lg">
      <h3 className="text-lg font-semibold mb-4">Mint New Property</h3>
      <p className="text-xs text-gray-500 mb-5">Admin only — creates a new PropertyNFT</p>

      <div className="space-y-4">
        <div>
          <label className="text-xs text-gray-400 font-medium uppercase tracking-wider block mb-1.5">
            Property Name
          </label>
          <input
            type="text"
            placeholder="Downtown Loft"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-gray-800/60 rounded-xl border border-gray-700/50 px-4 py-2.5 text-white outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/20 transition-all text-sm"
          />
        </div>

        <div>
          <label className="text-xs text-gray-400 font-medium uppercase tracking-wider block mb-1.5">
            Location
          </label>
          <input
            type="text"
            placeholder="New York"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="w-full bg-gray-800/60 rounded-xl border border-gray-700/50 px-4 py-2.5 text-white outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/20 transition-all text-sm"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-gray-400 font-medium uppercase tracking-wider block mb-1.5">
              Area (m&sup2;)
            </label>
            <input
              type="text"
              inputMode="numeric"
              placeholder="100"
              value={area}
              onChange={(e) => {
                if (/^\d*$/.test(e.target.value)) setArea(e.target.value);
              }}
              className="w-full bg-gray-800/60 rounded-xl border border-gray-700/50 px-4 py-2.5 text-white outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/20 transition-all text-sm font-[family-name:var(--font-mono)]"
            />
          </div>
          <div>
            <label className="text-xs text-gray-400 font-medium uppercase tracking-wider block mb-1.5">
              Mint Price (PROP)
            </label>
            <input
              type="text"
              inputMode="decimal"
              placeholder="500"
              value={mintPrice}
              onChange={(e) => {
                if (/^\d*\.?\d*$/.test(e.target.value)) setMintPrice(e.target.value);
              }}
              className="w-full bg-gray-800/60 rounded-xl border border-gray-700/50 px-4 py-2.5 text-white outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/20 transition-all text-sm font-[family-name:var(--font-mono)]"
            />
          </div>
        </div>

        <button
          onClick={handleMint}
          disabled={!name || !location || !area || !mintPrice || isPending || isConfirming}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-500 to-cyan-500 text-white font-semibold hover:brightness-110 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending || isConfirming ? "Minting..." : "Mint Property NFT"}
        </button>
      </div>
    </div>
  );
}
