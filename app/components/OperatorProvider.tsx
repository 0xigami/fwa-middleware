"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { parseEther } from "viem";
import { useAccount, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { MANAGER } from "@/lib/config";
import { managerAbi } from "@/lib/abis";
import {
  formatBackingPlaceholder,
  resolveListBacking,
  suggestedBackingWei,
} from "@/lib/listBacking";
import type { FwaData } from "@/lib/useFwaData";
import { TARGET_CHAIN } from "@/lib/wagmi";

export type OperatorContextValue = {
  preview: boolean;
  showConsole: boolean;
  off: boolean;
  suggestedBacking?: bigint;
  placeholder: string;
  floorWei?: bigint;
  discountBps: bigint;
  listingIds: bigint[];
  listBacking: Record<number, string>;
  listErrors: Record<number, string>;
  repeg: Record<number, string>;
  txHash?: `0x${string}`;
  txConfirmed: boolean;
  writeError?: string;
  setListBacking: (id: number, value: string) => void;
  setRepeg: (id: number, value: string) => void;
  call: (functionName: string, args?: readonly unknown[]) => void;
  onList: (id: number) => void;
};

const OperatorContext = createContext<OperatorContextValue | null>(null);

export function OperatorProvider({
  data,
  children,
}: {
  data: FwaData;
  children: ReactNode;
}) {
  const { address, isConnected, chainId } = useAccount();
  const { writeContract, isPending, error, data: txHash } = useWriteContract();
  const { isSuccess: txConfirmed } = useWaitForTransactionReceipt({ hash: txHash });
  const [floorWei, setFloorWei] = useState<bigint>();
  const [repeg, setRepegState] = useState<Record<number, string>>({});
  const [listBacking, setListBackingState] = useState<Record<number, string>>({});
  const [listErrors, setListErrors] = useState<Record<number, string>>({});

  useEffect(() => {
    fetch("https://api.coingecko.com/api/v3/nfts/nouns")
      .then((r) => r.json())
      .then((j) => {
        const floor = j?.floor_price?.native_currency;
        if (typeof floor === "number" && floor > 0) setFloorWei(parseEther(floor.toString()));
      })
      .catch(() => {});
  }, []);

  const preview = !MANAGER;
  const isOperator =
    isConnected && !!data.operator && address?.toLowerCase() === data.operator.toLowerCase();
  const onTargetChain = chainId === TARGET_CHAIN.id;
  const showConsole = preview || isOperator;
  const off = isPending || preview || (isConnected && !onTargetChain);
  const suggestedBacking = suggestedBackingWei(floorWei, data.discountBps);
  const placeholder = suggestedBacking ? formatBackingPlaceholder(suggestedBacking) : "";
  const listingIds = Object.values(data.listingIdByToken);

  const call = useCallback(
    (functionName: string, args?: readonly unknown[]) => {
      if (!MANAGER) return;
      writeContract({
        address: MANAGER,
        abi: managerAbi,
        functionName,
        args,
        chainId: TARGET_CHAIN.id,
      } as Parameters<typeof writeContract>[0]);
    },
    [writeContract],
  );

  const setListBacking = useCallback((id: number, value: string) => {
    setListBackingState((prev) => ({ ...prev, [id]: value }));
    setListErrors((prev) => {
      if (!prev[id]) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);

  const setRepeg = useCallback((id: number, value: string) => {
    setRepegState((prev) => ({ ...prev, [id]: value }));
  }, []);

  const onList = useCallback(
    (id: number) => {
      const resolved = resolveListBacking(listBacking[id] ?? "", suggestedBacking);
      if ("error" in resolved) {
        setListErrors((prev) => ({ ...prev, [id]: resolved.error }));
        return;
      }
      setListErrors((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      call("list", [BigInt(id), resolved.wei]);
    },
    [call, listBacking, suggestedBacking],
  );

  const value = useMemo<OperatorContextValue>(
    () => ({
      preview,
      showConsole,
      off,
      suggestedBacking,
      placeholder,
      floorWei,
      discountBps: data.discountBps,
      listingIds,
      listBacking,
      listErrors,
      repeg,
      txHash,
      txConfirmed,
      writeError: error?.message.split("\n")[0],
      setListBacking,
      setRepeg,
      call,
      onList,
    }),
    [
      preview,
      showConsole,
      off,
      suggestedBacking,
      placeholder,
      floorWei,
      data.discountBps,
      listingIds,
      listBacking,
      listErrors,
      repeg,
      txHash,
      txConfirmed,
      error,
      setListBacking,
      setRepeg,
      call,
      onList,
    ],
  );

  return <OperatorContext.Provider value={value}>{children}</OperatorContext.Provider>;
}

export function useOperator(): OperatorContextValue {
  const ctx = useContext(OperatorContext);
  if (!ctx) throw new Error("useOperator must be used inside OperatorProvider");
  return ctx;
}
