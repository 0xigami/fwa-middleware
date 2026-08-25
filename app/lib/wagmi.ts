import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { http } from "wagmi";
import { mainnet } from "wagmi/chains";
import { RPC_URL } from "@/lib/config";

/**
 * Ethereum mainnet. NounsListingManager 0x89ec417F…089b and FWA core live here.
 * Robinhood Chain 4663 is StockRip, not this operator panel — no code at those addresses.
 */
export const TARGET_CHAIN = mainnet;

export const walletConnectProjectId =
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID?.trim() ?? "";

/** RainbowKit requires a 32-char projectId at config time. Empty ID still builds; WC needs the real Reown ID. */
const RAINBOWKIT_PROJECT_ID =
  walletConnectProjectId || "00000000000000000000000000000000";

export function txUrl(hash: string, chain = TARGET_CHAIN): string {
  const base = chain.blockExplorers?.default.url ?? "https://etherscan.io";
  return `${base}/tx/${hash}`;
}

export const config = getDefaultConfig({
  appName: "Fake World Assets",
  projectId: RAINBOWKIT_PROJECT_ID,
  chains: [TARGET_CHAIN],
  ssr: true,
  transports: {
    [TARGET_CHAIN.id]: http(RPC_URL),
  },
});
