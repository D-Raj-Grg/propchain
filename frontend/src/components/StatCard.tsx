"use client";

interface StatCardProps {
  label: string;
  value: string;
  sub?: string;
  isLoading?: boolean;
  accent?: "brand" | "emerald" | "amber" | "pink";
}

const accentBorder = {
  brand: "border-t-purple-400",
  emerald: "border-t-emerald-400",
  amber: "border-t-amber-400",
  pink: "border-t-pink-400",
};

export function StatCard({ label, value, sub, isLoading, accent }: StatCardProps) {
  return (
    <div
      className={`glass-card p-5 border-t-2 ${accent ? accentBorder[accent] : "border-t-gray-700"}`}
    >
      <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">{label}</p>
      {isLoading ? (
        <div className="h-8 w-24 rounded-lg bg-gray-800 animate-shimmer mt-1" />
      ) : (
        <p className="text-2xl font-bold font-[family-name:var(--font-mono)] mt-1">{value}</p>
      )}
      {sub && <p className="text-[11px] text-gray-500 mt-1">{sub}</p>}
    </div>
  );
}
