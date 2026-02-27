"use client";

import { formatUnits } from "viem";
import { MapPin } from "lucide-react";

interface PropertyCardProps {
  tokenId: number;
  name: string;
  location: string;
  area: number;
  price?: bigint;
  priceLabel?: string;
  onAction?: () => void;
  actionLabel?: string;
  actionColor?: "purple" | "emerald" | "amber" | "red";
  secondaryAction?: () => void;
  secondaryLabel?: string;
  isPending?: boolean;
  yieldInfo?: string;
}

const actionColors = {
  purple: "from-purple-500 to-cyan-500",
  emerald: "from-emerald-500 to-teal-500",
  amber: "from-amber-500 to-orange-500",
  red: "from-red-500 to-rose-500",
};

export function PropertyCard({
  tokenId,
  name,
  location,
  area,
  price,
  priceLabel,
  onAction,
  actionLabel,
  actionColor = "purple",
  secondaryAction,
  secondaryLabel,
  isPending,
  yieldInfo,
}: PropertyCardProps) {
  return (
    <div className="glass-card p-5 flex flex-col gap-3 hover:border-gray-600/50 transition-colors">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-semibold text-white text-lg">{name}</h3>
          <p className="text-sm text-gray-400 flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 text-purple-400" /> {location}
          </p>
        </div>
        <span className="text-xs bg-gray-800 px-2 py-1 rounded-lg text-gray-400 font-mono">
          #{tokenId}
        </span>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4 text-sm">
        <div>
          <span className="text-gray-500">Area</span>
          <p className="text-white font-medium">{area} m&sup2;</p>
        </div>
        {price !== undefined && (
          <div>
            <span className="text-gray-500">{priceLabel || "Price"}</span>
            <p className="text-white font-medium font-[family-name:var(--font-mono)]">
              {Number(formatUnits(price, 18)).toLocaleString()} PROP
            </p>
          </div>
        )}
        {yieldInfo && (
          <div>
            <span className="text-gray-500">Pending Yield</span>
            <p className="text-emerald-400 font-medium font-[family-name:var(--font-mono)]">
              {yieldInfo} PROP
            </p>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2 mt-auto pt-1">
        {onAction && actionLabel && (
          <button
            onClick={onAction}
            disabled={isPending}
            className={`flex-1 py-2.5 rounded-xl bg-gradient-to-r ${actionColors[actionColor]} text-white text-sm font-semibold hover:brightness-110 transition disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isPending ? "Confirming..." : actionLabel}
          </button>
        )}
        {secondaryAction && secondaryLabel && (
          <button
            onClick={secondaryAction}
            disabled={isPending}
            className="flex-1 py-2.5 rounded-xl border border-gray-600 text-gray-300 text-sm font-semibold hover:bg-gray-800/50 transition disabled:opacity-50"
          >
            {secondaryLabel}
          </button>
        )}
      </div>
    </div>
  );
}
