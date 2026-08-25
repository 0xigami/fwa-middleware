import { createConfig, http, injected } from "wagmi";
import { walletConnect } from "wagmi/connectors";
import { mainnet } from "wagmi/chains";
import { RPC_URL } from "@/lib/config";

/** Ethereum mainnet — Nouns, FWA core, and the listing manager live here. */
export const TARGET_CHAIN = mainnet;

export const walletConnectProjectId =
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID?.trim() ?? "";

export function getConfig() {
  return createConfig({
    chains: [TARGET_CHAIN],
    connectors: [
      injected(),
      ...(walletConnectProjectId
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
                // Rainbow — Gami's iPhone wallet; Ledger Nano X signs through it.
                explorerRecommendedWalletIds: [
                  "1ae92b26df02f0abca6304df07debccd18262fdf5fe82daa81593582dac9a369",
                ],
              },
            }),
          ]
        : []),
    ],
    transports: { [TARGET_CHAIN.id]: http(RPC_URL) },
    ssr: true,
  });
}
