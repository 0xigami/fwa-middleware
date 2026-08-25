import { createConfig, http, injected } from "wagmi";
import { walletConnect } from "wagmi/connectors";
import { mainnet } from "wagmi/chains";
import { RPC_URL } from "@/lib/config";

/** Rainbow WalletConnect explorer id — iPhone path: WC → Rainbow → Nano X. */
export const RAINBOW_WALLET_ID =
  "1ae92b26df02f0abca6304df07debccd18262fdf5fe82daa81593582dac9a369";

/**
 * Ethereum mainnet. NounsListingManager 0x89ec417F…089b and FWA core live here.
 * Robinhood Chain 4663 is StockRip, not this operator panel — no code at those addresses.
 */
export const TARGET_CHAIN = mainnet;

export const walletConnectProjectId =
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID?.trim() ?? "";

export function txUrl(hash: string, chain = TARGET_CHAIN): string {
  const base = chain.blockExplorers?.default.url ?? "https://etherscan.io";
  return `${base}/tx/${hash}`;
}

export function getConfig(opts?: { walletConnect?: boolean }) {
  const useWalletConnect = Boolean(opts?.walletConnect && walletConnectProjectId);

  return createConfig({
    chains: [TARGET_CHAIN],
    connectors: [
      injected(),
      ...(useWalletConnect
        ? [
            walletConnect({
              projectId: walletConnectProjectId,
              showQrModal: true,
              metadata: {
                name: "FWA Operator",
                description: "Nouns listing manager operator panel",
                url: "https://fwa-operator.vercel.app",
                icons: ["https://noun.pics/11.png"],
              },
              qrModalOptions: {
                enableExplorer: true,
                explorerRecommendedWalletIds: [RAINBOW_WALLET_ID],
                explorerExcludedWalletIds: "ALL",
                mobileWallets: [
                  {
                    id: "rainbow",
                    name: "Rainbow",
                    links: {
                      native: "rainbow://",
                      universal: "https://rnbwapp.com",
                    },
                  },
                ],
              },
            }),
          ]
        : []),
    ],
    transports: {
      [TARGET_CHAIN.id]: http(RPC_URL),
    },
    ssr: true,
  });
}
