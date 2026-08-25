"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";

export default function ConnectControl() {
  return (
    <ConnectButton.Custom>
      {({ account, chain, openAccountModal, openChainModal, openConnectModal, mounted }) => {
        const connected = mounted && account && chain;

        if (!connected) {
          return (
            <button type="button" className="btn connect-btn" onClick={openConnectModal}>
              CONNECT
            </button>
          );
        }

        if (chain.unsupported) {
          return (
            <button type="button" className="btn connect-btn" onClick={openChainModal}>
              Wrong network
            </button>
          );
        }

        return (
          <button type="button" className="btn connect-btn" onClick={openAccountModal}>
            {account.displayName}
          </button>
        );
      }}
    </ConnectButton.Custom>
  );
}
