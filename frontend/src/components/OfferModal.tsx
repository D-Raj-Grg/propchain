"use client";

import { useState, useEffect } from "react";
import { useWriteContract, useWaitForTransactionReceipt, useReadContracts, useAccount } from "wagmi";
import { parseEther, maxUint256 } from "viem";
import { toast } from "sonner";
import { getExplorerTxUrl } from "@/lib/chains";
import {
  MARKETPLACE_ABI,
  ERC20_ABI,
  MARKETPLACE_ADDRESS,
  PROP_TOKEN_ADDRESS,
} from "@/lib/contracts";

interface OfferModalProps {
  tokenId: number;
  onClose: () => void;
}

export function OfferModal({ tokenId, onClose }: OfferModalProps) {
  const { address } = useAccount();
  const [amount, setAmount] = useState("");

  const { data: approveHash, writeContract: writeApprove, isPending: isApproving } = useWriteContract();
  const { isSuccess: isApproveSuccess } = useWaitForTransactionReceipt({ hash: approveHash });

  const { data: offerHash, writeContract: writeOffer, isPending: isOffering } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: offerHash });

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

  function handleSubmit() {
    if (!amount || Number(amount) <= 0) return;

    const parsed = parseEther(amount);

    if (allowance < parsed) {
      toast.loading("Approving PROP...", { id: "offer" });
      writeApprove({
        address: PROP_TOKEN_ADDRESS,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [MARKETPLACE_ADDRESS, maxUint256],
      });
      return;
    }

    toast.loading("Submitting offer...", { id: "offer" });
    writeOffer({
      address: MARKETPLACE_ADDRESS,
      abi: MARKETPLACE_ABI,
      functionName: "makeOffer",
      args: [BigInt(tokenId), parsed],
    });
  }

  useEffect(() => {
    if (isApproveSuccess) {
      toast.success("Approved! Click Submit again.", { id: "offer" });
    }
  }, [isApproveSuccess]);

  useEffect(() => {
    if (isSuccess && offerHash) {
      const url = getExplorerTxUrl(offerHash);
      toast.success("Offer submitted!", {
        id: "offer",
        action: url
          ? { label: "View on Explorer", onClick: () => window.open(url, "_blank") }
          : undefined,
      });
      onClose();
    }
  }, [isSuccess, offerHash, onClose]);

  const needsApproval = amount && Number(amount) > 0 && allowance < parseEther(amount || "0");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="glass-card p-6 w-full max-w-md glow-brand">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Make Offer — Property #{tokenId}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl">&times;</button>
        </div>

        <div className="flex items-center bg-gray-800/60 rounded-xl border border-gray-700/50 overflow-hidden focus-within:border-purple-500/50 focus-within:ring-1 focus-within:ring-purple-500/20 transition-all">
          <input
            type="text"
            inputMode="decimal"
            placeholder="0.00"
            value={amount}
            onChange={(e) => {
              if (/^\d*\.?\d*$/.test(e.target.value)) setAmount(e.target.value);
            }}
            className="flex-1 bg-transparent px-4 py-3 text-white outline-none font-[family-name:var(--font-mono)]"
          />
          <span className="pr-4 text-gray-400 text-sm font-medium">PROP</span>
        </div>

        <div className="flex gap-3 mt-5">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-gray-600 text-gray-300 font-semibold text-sm hover:bg-gray-800/50 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!amount || Number(amount) <= 0 || isOffering || isConfirming || isApproving}
            className={`flex-1 py-2.5 rounded-xl text-white font-semibold text-sm hover:brightness-110 transition disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r ${
              needsApproval ? "from-amber-500 to-orange-500" : "from-purple-500 to-pink-500"
            }`}
          >
            {isOffering || isConfirming
              ? "Confirming..."
              : isApproving
              ? "Approving..."
              : needsApproval
              ? "Approve PROP"
              : "Submit Offer"}
          </button>
        </div>
      </div>
    </div>
  );
}
