"use client";

import { useEffect, useMemo, useState } from "react";
import type { Address, Chain } from "viem";
import { useAccount, useConnect, useDisconnect, useSwitchChain } from "wagmi";
import { shortAddr } from "@/lib/config";
import { TARGET_CHAIN, walletConnectProjectId } from "@/lib/wagmi";

function connectorLabel(id: string, name: string): string {
  if (id === "walletConnect") return "Rainbow";
  if (id === "injected") return "Browser wallet";
  return name;
}

export default function WalletBar({
  operator,
  chain = TARGET_CHAIN,
}: {
  operator?: Address;
  chain?: Chain;
}) {
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

  const wrongNetwork = isConnected && chainId !== chain.id;
  const isOperator =
    isConnected && !!operator && address?.toLowerCase() === operator.toLowerCase();

  return (
    <section className="wallet-bar" aria-label="Wallet">
      {!isConnected ? (
        <>
          <p className="wallet-bar-copy">
            {operator
              ? "Operator is gami.eth. On a phone, tap Connect Rainbow — WalletConnect opens Rainbow, which prompts the Nano X. No browser extension."
              : "On a phone, tap Connect Rainbow. WalletConnect opens Rainbow (deep link). No browser extension."}
          </p>
          <div className="wallet-bar-actions">
            {!mounted ? (
              <button type="button" className="btn" disabled>
                Connect Rainbow
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
                  {isPending ? "Opening Rainbow…" : `Connect ${connectorLabel(c.id, c.name)}`}
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
              {chainId === chain.id ? chain.name : `chain ${chainId ?? "?"}`}
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
            Wrong network. This panel signs on {chain.name} (chain {chain.id}), not chain {chainId}.
            Switch before signing.
          </p>
          <button
            type="button"
            className="btn"
            disabled={switching}
            onClick={() => switchChain({ chainId: chain.id })}
          >
            {switching ? "Switching…" : `Switch to ${chain.name}`}
          </button>
        </div>
      )}

      {(connectError || switchError) && (
        <p className="op-error">{(connectError ?? switchError)?.message.split("\n")[0]}</p>
      )}
    </section>
  );
}
