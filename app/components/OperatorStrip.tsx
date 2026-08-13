"use client";

import { useEffect, useState } from "react";
import { parseEther } from "viem";
import { useAccount, useConnect, useWriteContract } from "wagmi";
import { ALL_IDS, MANAGER } from "@/lib/config";
import { managerAbi } from "@/lib/abis";
import { fmtEth, type FwaData } from "@/lib/useFwaData";

export default function OperatorStrip({ data }: { data: FwaData }) {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { writeContract, isPending, error } = useWriteContract();
  const [floorWei, setFloorWei] = useState<bigint>();

  useEffect(() => {
    fetch("https://api.coingecko.com/api/v3/nfts/nouns")
      .then((r) => r.json())
      .then((j) => {
        const floor = j?.floor_price?.native_currency;
        if (typeof floor === "number" && floor > 0) setFloorWei(parseEther(floor.toString()));
      })
      .catch(() => {});
  }, []);

  if (!MANAGER || !data.operator) return null;

  if (!isConnected) {
    return (
      <p className="op-hint">
        Operator?{" "}
        <button className="btn btn-small" onClick={() => connectors[0] && connect({ connector: connectors[0] })}>
          Connect wallet
        </button>
      </p>
    );
  }

  if (address?.toLowerCase() !== data.operator.toLowerCase()) return null;

  const backing = floorWei && data.discountBps > 0n ? (floorWei * 10000n) / data.discountBps : undefined;
  const call = (functionName: "list" | "withdrawListing" | "returnNouns" | "sweepETH" | "claimFees" | "withdrawEarnings", args?: readonly unknown[]) =>
    writeContract({ address: MANAGER!, abi: managerAbi, functionName, args } as Parameters<typeof writeContract>[0]);

  const listingIds = Object.values(data.listingIdByToken);

  return (
    <section className="op-strip">
      <h2>Operator console</h2>
      <p className="muted">
        Floor {floorWei ? fmtEth(floorWei) : "n/a"}, list backing {backing ? fmtEth(backing) : "n/a"} (floor divided
        by {Number(data.discountBps) / 10000}). Etherscan is the fallback console.
      </p>
      <div className="op-global">
        <button className="btn" disabled={isPending} onClick={() => call("sweepETH")}>Sweep ETH</button>
        <button className="btn" disabled={isPending || listingIds.length === 0} onClick={() => call("claimFees", [listingIds])}>Claim fees</button>
        <button className="btn" disabled={isPending} onClick={() => call("withdrawEarnings")}>Withdraw earnings</button>
      </div>
      <div className="op-rows">
        {ALL_IDS.map((id) => {
          const listingId = data.listingIdByToken[id];
          const status = data.statuses[id]?.kind;
          return (
            <div className="op-row" key={id}>
              <span className="op-noun">Noun {id}</span>
              <button className="btn btn-small" disabled={isPending || !backing || status !== "manager"} onClick={() => backing && call("list", [BigInt(id), backing])}>
                List
              </button>
              <button className="btn btn-small" disabled={isPending || listingId === undefined || status !== "listed"} onClick={() => listingId !== undefined && call("withdrawListing", [listingId])}>
                Withdraw
              </button>
              <button className="btn btn-small" disabled={isPending || status !== "manager"} onClick={() => call("returnNouns", [[BigInt(id)]])}>
                Return home
              </button>
            </div>
          );
        })}
      </div>
      {error && <p className="op-error">{error.message.split("\n")[0]}</p>}
    </section>
  );
}
