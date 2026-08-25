"use client";

import { useEffect, useMemo, useState } from "react";
import type { Address } from "viem";
import { useAccount, useConnect, useDisconnect, useSwitchChain } from "wagmi";
import { shortAddr } from "@/lib/config";
import { TARGET_CHAIN, walletConnectProjectId } from "@/lib/wagmi";

function connectorLabel(id: string, name: string): string {
  if (id === "walletConnect") return "WalletConnect";
  if (id === "injected") return "Browser wallet";
  return name;
}

export default function WalletBar({ operator }: { operator?: Address }) {
  const { address, isConnected, chainId } = useAccount();
  const { connect, connectors, isPending, error: connectError } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain, isPending: switching, error: switchError } = useSwitchChain();
  const [mounted, setMounted] = useState(false);
  const [hasInjected, setHasInjected] = useState(false);

  useEffect(() => {
    setMounted(true);
    setHasInjected("ethereum" in window);
  }, []);

  const visibleConnectors = useMemo(
    () =>
      connectors.filter((c) => {
        if (c.id === "injected") return hasInjected;
        return true;
      }),
    [connectors, hasInjected],
  );

  const wrongNetwork = isConnected && chainId !== TARGET_CHAIN.id;
  const isOperator =
    isConnected && !!operator && address?.toLowerCase() === operator.toLowerCase();

  return (
    <section className="wallet-bar" aria-label="Wallet">
      {!isConnected ? (
        <>
          <p className="wallet-bar-copy">
            {operator
              ? "Operator is gami.eth. On a phone, connect Rainbow with WalletConnect (Ledger Nano signs inside Rainbow). A browser extension is not required."
              : "Connect a wallet. On a phone, use WalletConnect to open Rainbow. A browser extension is not required."}
          </p>
          <div className="wallet-bar-actions">
            {!mounted ? (
              <button type="button" className="btn" disabled>
                Connect
              </button>
            ) : (
              visibleConnectors.map((c) => (
                <button
                  type="button"
                  key={c.uid}
                  className="btn"
                  disabled={isPending}
                  onClick={() => connect({ connector: c })}
                >
                  {isPending ? "Opening…" : `Connect ${connectorLabel(c.id, c.name)}`}
                </button>
              ))
            )}
          </div>
          {mounted && visibleConnectors.length === 0 && (
            <p className="op-error">
              {walletConnectProjectId
                ? "No wallet available in this browser."
                : "WalletConnect is not configured. Set NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID and redeploy."}
            </p>
          )}
        </>
      ) : (
        <>
          <div className="wallet-bar-status">
            <p>
              Connected {shortAddr(address!)}
              {isOperator ? " · operator" : operator ? " · not the operator" : ""}
              {" · "}
              {chainId === TARGET_CHAIN.id ? TARGET_CHAIN.name : `chain ${chainId ?? "?"}`}
            </p>
            <button type="button" className="btn" onClick={() => disconnect()}>
              Disconnect
            </button>
          </div>
          {operator && !isOperator && (
            <p className="wallet-bar-copy">
              This wallet is not the operator. Connect gami.eth ({shortAddr(operator)}) to list.
            </p>
          )}
        </>
      )}

      {wrongNetwork && (
        <div className="wrong-network" role="alert">
          <p>
            Wrong network. This panel signs on {TARGET_CHAIN.name} (chain {TARGET_CHAIN.id}), not chain{" "}
            {chainId}. Switch before listing.
          </p>
          <button
            type="button"
            className="btn"
            disabled={switching}
            onClick={() => switchChain({ chainId: TARGET_CHAIN.id })}
          >
            {switching ? "Switching…" : `Switch to ${TARGET_CHAIN.name}`}
          </button>
        </div>
      )}

      {(connectError || switchError) && (
        <p className="op-error">{(connectError ?? switchError)?.message.split("\n")[0]}</p>
      )}
    </section>
  );
}
