import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { activeChain } from "./chains";

export const wagmiConfig = getDefaultConfig({
  appName: "PropChain",
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? "demo",
  chains: [activeChain],
  ssr: true,
});

export { activeChain, getExplorerTxUrl } from "./chains";
