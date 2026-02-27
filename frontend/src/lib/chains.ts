import { sepolia, baseSepolia, mainnet } from "wagmi/chains";

const chainId = Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? 11155111);

const chainMap = {
  1: mainnet,
  11155111: sepolia,
  84532: baseSepolia,
} as const;

export const activeChain = chainMap[chainId as keyof typeof chainMap] ?? sepolia;

export function getExplorerTxUrl(hash: string): string | null {
  const explorer = activeChain.blockExplorers?.default;
  if (!explorer) return null;
  return `${explorer.url}/tx/${hash}`;
}

export function getExplorerAddressUrl(address: string): string | null {
  const explorer = activeChain.blockExplorers?.default;
  if (!explorer) return null;
  return `${explorer.url}/address/${address}`;
}
