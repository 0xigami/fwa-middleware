"use client";

import { fmtEth } from "@/lib/useFwaData";
import { txUrl } from "@/lib/wagmi";
import { useOperator } from "@/components/OperatorProvider";

const FWA_TOKEN = "0xa0Df17B5aC76ABaBA36E1450E2cbCd18A620C845";

export default function OperatorStrip() {
  const {
    preview,
    showConsole,
    off,
    suggestedBacking,
    floorWei,
    discountBps,
    listingIds,
    txHash,
    txConfirmed,
    writeError,
    call,
  } = useOperator();

  if (!showConsole) return null;

  return (
    <section className="op-strip" aria-label="Fleet actions">
      <p className="muted">
        Floor {floorWei ? fmtEth(floorWei) : "n/a"} · buyback rate {Number(discountBps) / 100}% ·
        suggested backing = floor ÷ {Number(discountBps) / 10000} ={" "}
        {suggestedBacking ? fmtEth(suggestedBacking) : "n/a"}
        {preview ? " · preview: manager not deployed yet" : ""}
      </p>
      <div className="op-global">
        <button type="button" className="btn" disabled={off} onClick={() => call("sweepETH")}>
          Sweep ETH
        </button>
        <button type="button" className="btn" disabled={off} onClick={() => call("sweepToken", [FWA_TOKEN])}>
          Sweep $FWA
        </button>
        <button
          type="button"
          className="btn"
          disabled={off || listingIds.length === 0}
          onClick={() => call("claimFees", [listingIds])}
        >
          Claim fees
        </button>
        <button type="button" className="btn" disabled={off} onClick={() => call("withdrawEarnings")}>
          Withdraw earnings
        </button>
        <button
          type="button"
          className="btn"
          disabled={off || listingIds.length === 0}
          onClick={() => call("claimDepositorTokens", [listingIds])}
        >
          Claim $FWA rewards
        </button>
        <button type="button" className="btn" disabled={off} onClick={() => call("withdrawRewardTokens")}>
          Withdraw reward tokens
        </button>
        <button type="button" className="btn" disabled={off} onClick={() => call("activateListings", [50n])}>
          Activate listings
        </button>
      </div>
      {txHash ? (
        <p className="muted">
          {txConfirmed ? "Confirmed: " : "Pending: "}
          <a href={txUrl(txHash)} target="_blank" rel="noreferrer" className="feed-link">
            {txHash.slice(0, 18)}...
          </a>
        </p>
      ) : null}
      {writeError ? <p className="op-error">{writeError}</p> : null}
    </section>
  );
}
