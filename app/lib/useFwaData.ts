"use client";

import { useEffect, useState } from "react";
import { createPublicClient, formatEther, http, zeroAddress, type Address } from "viem";
import { mainnet } from "viem/chains";
import {
  ALL_IDS, FWA_CORE, MANAGER, NOUNS_TOKEN, RPC_URL, START_BLOCK, TREASURY, shortAddr,
} from "./config";
import {
  evAllocated, evBidAccepted, evKept, evListed, evNounReturned, evSweptETH, evWithdrawn,
  fwaAbi, managerAbi, nounsAbi,
} from "./abis";

export const client = createPublicClient({ chain: mainnet, transport: http(RPC_URL) });

export type NounStatus =
  | { kind: "treasury" }
  | { kind: "manager" }
  | { kind: "listed"; backing: bigint }
  | { kind: "settlement"; allocatedAt: number; backing: bigint }
  | { kind: "kept"; by: Address }
  | { kind: "home" };

export type FeedItem = { key: string; block: bigint; index: number; text: string; tx: string };

export type FwaData = {
  loading: boolean;
  statuses: Record<number, NounStatus>;
  listingIdByToken: Record<number, bigint>;
  operator?: Address;
  discountBps: bigint;
  feed: FeedItem[];
  stats: { fees?: string; draws?: number; keeps?: number; buybacks?: number; daysLive?: number };
};

export function fmtEth(wei: bigint): string {
  const s = Number(formatEther(wei));
  return (s >= 100 ? s.toFixed(2) : s.toFixed(4)).replace(/\.?0+$/, "") + " ETH";
}

const initial: FwaData = {
  loading: true,
  statuses: Object.fromEntries(ALL_IDS.map((id) => [id, { kind: "treasury" }])),
  listingIdByToken: {},
  discountBps: 9000n,
  feed: [],
  stats: {},
};

async function fetchAll(): Promise<FwaData> {
  const owners = await client.multicall({
    contracts: ALL_IDS.map((id) => ({
      address: NOUNS_TOKEN, abi: nounsAbi, functionName: "ownerOf" as const, args: [BigInt(id)] as const,
    })),
  });

  const data: FwaData = { ...initial, loading: false, statuses: {}, stats: {} };

  if (!MANAGER) {
    for (const id of ALL_IDS) data.statuses[id] = { kind: "treasury" };
    return data;
  }
  const manager = MANAGER;

  const latest = await client.getBlockNumber();
  const fromBlock = START_BLOCK ?? (latest > 1_000_000n ? latest - 1_000_000n : 0n);
  const range = { fromBlock, toBlock: latest } as const;

  const [managerLogs, views] = await Promise.all([
    client.getLogs({ address: MANAGER, events: [evListed, evNounReturned, evSweptETH], ...range }),
    client.multicall({
      contracts: [
        { address: MANAGER, abi: managerAbi, functionName: "operator" as const },
        { address: FWA_CORE, abi: fwaAbi, functionName: "feeCredit" as const, args: [MANAGER] as const },
        { address: FWA_CORE, abi: fwaAbi, functionName: "settlementDiscountBps" as const },
      ],
    }),
  ]);

  if (views[0].status === "success") data.operator = views[0].result as Address;
  const feeCredit = views[1].status === "success" ? (views[1].result as bigint) : 0n;
  if (views[2].status === "success") data.discountBps = views[2].result as bigint;

  const returned = new Set<number>();
  const listedLogs = managerLogs.filter((l) => l.eventName === "Listed");
  let sweptTotal = 0n;
  for (const log of managerLogs) {
    if (log.eventName === "Listed") {
      const { tokenId, listingId } = log.args as { tokenId: bigint; listingId: bigint };
      data.listingIdByToken[Number(tokenId)] = listingId;
    } else if (log.eventName === "NounReturned") {
      returned.add(Number((log.args as { tokenId: bigint }).tokenId));
    } else if (log.eventName === "SweptETH") {
      sweptTotal += (log.args as { amount: bigint }).amount;
    }
  }

  const listingIds = [...new Set(Object.values(data.listingIdByToken))];
  const tokenByListing: Record<string, number> = {};
  for (const [tok, lid] of Object.entries(data.listingIdByToken)) tokenByListing[lid.toString()] = Number(tok);

  const [fwaLogs, listingRows] = await Promise.all([
    listingIds.length
      ? Promise.all([
          client.getLogs({ address: FWA_CORE, event: evAllocated, args: { listingId: listingIds }, ...range }),
          client.getLogs({ address: FWA_CORE, event: evKept, args: { listingId: listingIds }, ...range }),
          client.getLogs({ address: FWA_CORE, event: evBidAccepted, args: { listingId: listingIds }, ...range }),
          client.getLogs({ address: FWA_CORE, event: evWithdrawn, args: { listingId: listingIds }, ...range }),
        ]).then((r) => r.flat())
      : Promise.resolve([]),
    listingIds.length
      ? client.multicall({
          contracts: listingIds.map((lid) => ({
            address: FWA_CORE, abi: fwaAbi, functionName: "listings" as const, args: [lid] as const,
          })),
        })
      : Promise.resolve([]),
  ]);

  const listingInfo: Record<string, { purchaser: Address; value: bigint; allocatedAt: number }> = {};
  listingIds.forEach((lid, i) => {
    const row = listingRows[i];
    if (row && row.status === "success") {
      const [, , purchaser, , , value, , , , allocatedAt] = row.result as readonly [Address, Address, Address, bigint, bigint, bigint, bigint, bigint, bigint, bigint, number];
      listingInfo[lid.toString()] = { purchaser, value, allocatedAt: Number(allocatedAt) };
    }
  });

  ALL_IDS.forEach((id, i) => {
    const res = owners[i];
    const owner = res.status === "success" ? (res.result as Address).toLowerCase() : "";
    if (owner === TREASURY.toLowerCase()) {
      data.statuses[id] = returned.has(id) ? { kind: "home" } : { kind: "treasury" };
    } else if (owner === manager.toLowerCase()) {
      data.statuses[id] = { kind: "manager" };
    } else if (owner === FWA_CORE.toLowerCase()) {
      const info = listingInfo[(data.listingIdByToken[id] ?? 0n).toString()];
      data.statuses[id] =
        info && info.purchaser !== zeroAddress
          ? { kind: "settlement", allocatedAt: info.allocatedAt, backing: info.value }
          : { kind: "listed", backing: info?.value ?? 0n };
    } else if (owner) {
      data.statuses[id] = { kind: "kept", by: res.result as Address };
    } else {
      data.statuses[id] = { kind: "treasury" };
    }
  });

  const noun = (lid: bigint) => `Noun ${tokenByListing[lid.toString()] ?? "?"}`;
  const feed: FeedItem[] = [];
  const push = (log: { blockNumber: bigint; logIndex: number; transactionHash: string }, text: string) =>
    feed.push({ key: `${log.transactionHash}-${log.logIndex}`, block: log.blockNumber, index: log.logIndex, text, tx: log.transactionHash });

  for (const log of managerLogs) {
    const a = log.args as Record<string, bigint>;
    if (log.eventName === "Listed") push(log, `Noun ${a.tokenId} listed on fwa.fun with ${fmtEth(a.backing)} backing.`);
    else if (log.eventName === "NounReturned") push(log, `Noun ${a.tokenId} returned home to the treasury.`);
    else if (log.eventName === "SweptETH") push(log, `${fmtEth(a.amount)} swept to the treasury.`);
  }
  for (const log of fwaLogs) {
    const a = log.args as { listingId: bigint; purchaser?: Address; backing?: bigint; payout?: bigint };
    if (log.eventName === "NFTAllocated") push(log, `${noun(a.listingId)} drawn by ${shortAddr(a.purchaser!)}. Settlement window open.`);
    else if (log.eventName === "NFTKept") push(log, `${noun(a.listingId)} kept by ${shortAddr(a.purchaser!)}. Backing returned to the manager.`);
    else if (log.eventName === "DepositorBidAccepted") push(log, `Winner took the ETH on ${noun(a.listingId)}: ${fmtEth(a.payout ?? 0n)} paid out. The Noun heads back.`);
    else if (log.eventName === "ListingWithdrawn") push(log, `Listing for ${noun(a.listingId)} withdrawn by the operator.`);
  }
  feed.sort((x, y) => (y.block === x.block ? y.index - x.index : Number(y.block - x.block)));
  data.feed = feed.slice(0, 50);

  data.stats.draws = fwaLogs.filter((l) => l.eventName === "NFTAllocated").length;
  data.stats.keeps = fwaLogs.filter((l) => l.eventName === "NFTKept").length;
  data.stats.buybacks = fwaLogs.filter((l) => l.eventName === "DepositorBidAccepted").length;
  data.stats.fees = fmtEth(sweptTotal + feeCredit);
  if (listedLogs.length) {
    const first = listedLogs.reduce((m, l) => (l.blockNumber < m.blockNumber ? l : m));
    const block = await client.getBlock({ blockNumber: first.blockNumber });
    data.stats.daysLive = Math.max(0, Math.floor((Date.now() / 1000 - Number(block.timestamp)) / 86400));
  }
  return data;
}

export function useFwaData(): FwaData {
  const [data, setData] = useState<FwaData>(initial);
  useEffect(() => {
    let alive = true;
    const run = () => fetchAll().then((d) => alive && setData(d)).catch((e) => console.error("fwa fetch", e));
    run();
    const t = setInterval(run, 60_000);
    return () => { alive = false; clearInterval(t); };
  }, []);
  return data;
}
