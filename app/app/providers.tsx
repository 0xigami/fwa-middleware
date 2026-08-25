"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";
import { useEffect, useMemo, useState } from "react";
import { getConfig } from "@/lib/wagmi";

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  const [walletConnectReady, setWalletConnectReady] = useState(false);

  useEffect(() => {
    setWalletConnectReady(true);
  }, []);

  const config = useMemo(
    () => getConfig({ walletConnect: walletConnectReady }),
    [walletConnectReady],
  );

  return (
    <WagmiProvider config={config} key={walletConnectReady ? "wc" : "ssr"}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}
