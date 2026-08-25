"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Address } from "viem";
import { MANAGER_ENV, START_BLOCK_ENV, parseManagerAddress, parseStartBlock } from "@/lib/config";

const ADDR_KEY = "fwa.managerAddress";
const BLOCK_KEY = "fwa.startBlock";

export type ManagerSettings = {
  manager?: Address;
  startBlock?: bigint;
  ready: boolean;
  save: (address: string, startBlockRaw: string) => string | undefined;
  clear: () => void;
};

const ManagerContext = createContext<ManagerSettings | null>(null);

function readStored(): { manager?: Address; startBlock?: bigint } {
  if (typeof window === "undefined") return {};
  try {
    const manager = parseManagerAddress(localStorage.getItem(ADDR_KEY) ?? "");
    const startBlock = parseStartBlock(localStorage.getItem(BLOCK_KEY) ?? "");
    return { manager, startBlock };
  } catch {
    return {};
  }
}

export function ManagerProvider({ children }: { children: ReactNode }) {
  const [manager, setManager] = useState<Address | undefined>(undefined);
  const [startBlock, setStartBlock] = useState<bigint | undefined>(undefined);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stored = readStored();
    setManager(stored.manager ?? MANAGER_ENV);
    setStartBlock(stored.startBlock ?? (stored.manager ? undefined : START_BLOCK_ENV));
    setReady(true);
  }, []);

  const save = useCallback((address: string, startBlockRaw: string) => {
    const parsed = parseManagerAddress(address);
    if (!parsed) return "Paste a 0x address (40 hex chars).";
    const blockRaw = startBlockRaw.trim();
    if (blockRaw && parseStartBlock(blockRaw) === undefined) return "Start block must be a number.";
    const block = parseStartBlock(blockRaw);
    try {
      localStorage.setItem(ADDR_KEY, parsed);
      if (block !== undefined) localStorage.setItem(BLOCK_KEY, block.toString());
      else localStorage.removeItem(BLOCK_KEY);
    } catch {
      return "Could not save on this phone.";
    }
    setManager(parsed);
    setStartBlock(block);
    return undefined;
  }, []);

  const clear = useCallback(() => {
    try {
      localStorage.removeItem(ADDR_KEY);
      localStorage.removeItem(BLOCK_KEY);
    } catch {
      /* ignore */
    }
    setManager(undefined);
    setStartBlock(undefined);
  }, []);

  const value = useMemo(
    () => ({ manager, startBlock, ready, save, clear }),
    [manager, startBlock, ready, save, clear],
  );

  return <ManagerContext.Provider value={value}>{children}</ManagerContext.Provider>;
}

export function useManagerSettings(): ManagerSettings {
  const ctx = useContext(ManagerContext);
  if (!ctx) throw new Error("useManagerSettings must be used inside ManagerProvider");
  return ctx;
}
