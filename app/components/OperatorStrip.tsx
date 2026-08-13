"use client";

import { useEffect, useState } from "react";
import { parseEther } from "viem";
import { useAccount, useConnect, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { ALL_IDS, MANAGER } from "@/lib/config";
import { managerAbi } from "@/lib/abis";
import { fmtEth, type FwaData } from "@/lib/useFwaData";

const FWA_TOKEN = "0xa0Df17B5aC76ABaBA36E1450E2cbCd18A620C845";
const DAY = 86400;

function Countdown({ allocatedAt }: { allocatedAt: number }) {
  const now = Math.floor(Date.now() / 1000);
  const purchaserLeft = allocatedAt + DAY - now;
  const finalizeLeft = allocatedAt + 7 * DAY - now;
  if (purchaserLeft > 0) return <span className="muted">winner deciding: {Math.floor(purchaserLeft / 3600)}h {Math.floor((purchaserLeft % 3600) / 60)}m left</span>;
  if (finalizeLeft > 0) return <span className="muted">your window: {Math.floor(finalizeLeft / 3600)}h left to reclaim</span>;
  return <span className="op-error">forced sale imminent: anyone can finalize</span>;
}

export default function OperatorStrip({ data }: { data: FwaData }) {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { writeContract, isPending, error, data: txHash } = useWriteContract();
  const { isSuccess: txConfirmed } = useWaitForTransactionReceipt({ hash: txHash });
  const [floorWei, setFloorWei] = useState<bigint>();
  const [repeg, setRepeg] = useState<Record<number, string>>({});

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
  const isOperator = isConnected && !!data.operator && address?.toLowerCase() === data.operator.toLowerCase();

  if (!preview && !isConnected) {
    return (
      <p className="op-hint">
        Operator?{" "}
        <button className="btn btn-small" onClick={() => connectors[0] && connect({ connector: connectors[0] })}>
          Connect wallet
        </button>
      </p>
    );
  }
  if (!preview && !isOperator) return null;

  const off = isPending || preview;
  const backing = floorWei && data.discountBps > 0n ? (floorWei * 10000n) / data.discountBps : undefined;
  const call = (functionName: string, args?: readonly unknown[]) =>
    writeContract({ address: MANAGER!, abi: managerAbi, functionName, args } as Parameters<typeof writeContract>[0]);

  const listingIds = Object.values(data.listingIdByToken);

  return (
    <section className="op-strip">
      <h2>Operator console{preview ? " (preview: manager not deployed yet)" : ""}</h2>
      <p className="muted">
        Floor {floorWei ? fmtEth(floorWei) : "n/a"} · buyback rate {Number(data.discountBps) / 100}% · list backing = floor ÷ {Number(data.discountBps) / 10000} = {backing ? fmtEth(backing) : "n/a"}
      </p>
      <div className="op-global">
        <button className="btn" disabled={off} onClick={() => call("sweepETH")}>Sweep ETH</button>
        <button className="btn" disabled={off} onClick={() => call("sweepToken", [FWA_TOKEN])}>Sweep $FWA</button>
        <button className="btn" disabled={off || listingIds.length === 0} onClick={() => call("claimFees", [listingIds])}>Claim fees</button>
        <button className="btn" disabled={off} onClick={() => call("withdrawEarnings")}>Withdraw earnings</button>
        <button className="btn" disabled={off || listingIds.length === 0} onClick={() => call("claimDepositorTokens", [listingIds])}>Claim $FWA rewards</button>
        <button className="btn" disabled={off} onClick={() => call("withdrawRewardTokens")}>Withdraw reward tokens</button>
        <button className="btn" disabled={off} onClick={() => call("activateListings", [50n])}>Activate listings</button>
      </div>
      <div className="op-rows">
        {ALL_IDS.map((id) => {
          const listingId = data.listingIdByToken[id];
          const st = data.statuses[id];
          const kind = st?.kind;
          return (
            <div className="op-row" key={id}>
              <span className="op-noun">Noun {id}</span>
              {(kind === "manager" || preview) && (
                <>
                  <button className="btn btn-small" disabled={off || !backing} onClick={() => backing && call("list", [BigInt(id), backing])}>
                    List at {backing ? fmtEth(backing) : "floor ÷ rate"}
                  </button>
                  <button className="btn btn-small" disabled={off} onClick={() => call("returnNouns", [[BigInt(id)]])}>
                    Return home
                  </button>
                </>
              )}
              {kind === "listed" && listingId !== undefined && (
                <>
                  <span className="muted">
                    pegged {fmtEth(st.backing)}
                    {backing && st.backing > 0n ? `, drift ${(Number((backing - st.backing) * 1000n / st.backing) / 10).toFixed(1)}%` : ""}
                  </span>
                  <button className="btn btn-small" disabled={off} onClick={() => call("withdrawListing", [listingId])}>Withdraw</button>
                  <input
                    className="op-input"
                    placeholder="new backing (ETH)"
                    value={repeg[id] ?? ""}
                    onChange={(e) => setRepeg({ ...repeg, [id]: e.target.value })}
                  />
                  <button
                    className="btn btn-small"
                    disabled={off || !repeg[id] || Number(repeg[id]) < 1}
                    onClick={() => {
                      const nb = parseEther(repeg[id]);
                      const topUp = nb > st.backing ? nb - st.backing : 0n;
                      call("updateBacking", [listingId, nb, topUp]);
                    }}
                  >
                    Re-peg
                  </button>
                </>
              )}
              {kind === "settlement" && listingId !== undefined && (
                <>
                  <Countdown allocatedAt={st.allocatedAt} />
                  <button className="btn btn-small" disabled={off} onClick={() => call("reclaimNFT", [listingId])}>
                    Reclaim NFT (pay winner 90%, keep the Noun)
                  </button>
                  <button className="btn btn-small" disabled={off} onClick={() => call("reclaimBackingAndSurrenderNoun", [listingId])}>
                    Reclaim backing (keep 99%, surrender the Noun)
                  </button>
                  <button className="btn btn-small" disabled={off} onClick={() => call("finalizeUnsettled", [listingId])}>
                    Finalize
                  </button>
                </>
              )}
              {kind === "kept" && <span className="muted">gone to a new Nouner</span>}
              {(kind === "home" || kind === "treasury") && !preview && <span className="muted">in the treasury</span>}
            </div>
          );
        })}
      </div>
      {txHash && (
        <p className="muted">
          {txConfirmed ? "Confirmed: " : "Pending: "}
          <a href={`https://etherscan.io/tx/${txHash}`} target="_blank" rel="noreferrer" className="feed-link">{txHash.slice(0, 18)}...</a>
        </p>
      )}
      {error && <p className="op-error">{error.message.split("\n")[0]}</p>}
    </section>
  );
}
