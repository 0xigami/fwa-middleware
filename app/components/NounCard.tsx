"use client";

import { parseEther } from "viem";
import { shortAddr } from "@/lib/config";
import { fmtEth, type NounStatus } from "@/lib/useFwaData";
import { useOperator } from "@/components/OperatorProvider";

const DAY = 86400;

function Badge({ status }: { status: NounStatus }) {
  switch (status.kind) {
    case "treasury":
      return <span className="badge b-idle">In treasury</span>;
    case "manager":
      return <span className="badge b-warm">Held by manager</span>;
    case "listed":
      return <span className="badge b-live">Listed {fmtEth(status.backing)}</span>;
    case "settlement": {
      const left = status.allocatedAt + 7 * 86400 - Math.floor(Date.now() / 1000);
      const hours = Math.max(1, Math.floor(left / 3600));
      return (
        <span className="badge b-hot">
          {left > 0 ? `in settlement, ${hours}h to decide` : "settlement overdue"}
        </span>
      );
    }
    case "kept":
      return <span className="badge b-gone">Kept by {shortAddr(status.by)}</span>;
    case "home":
      return <span className="badge b-home">Home</span>;
  }
}

function Countdown({ allocatedAt }: { allocatedAt: number }) {
  const now = Math.floor(Date.now() / 1000);
  const purchaserLeft = allocatedAt + DAY - now;
  const finalizeLeft = allocatedAt + 7 * DAY - now;
  if (purchaserLeft > 0) {
    return (
      <span className="muted">
        winner deciding: {Math.floor(purchaserLeft / 3600)}h {Math.floor((purchaserLeft % 3600) / 60)}m left
      </span>
    );
  }
  if (finalizeLeft > 0) {
    return <span className="muted">your window: {Math.floor(finalizeLeft / 3600)}h left to reclaim</span>;
  }
  return <span className="op-error">forced sale imminent: anyone can finalize</span>;
}

function NounActions({
  id,
  status,
  listingId,
}: {
  id: number;
  status: NounStatus;
  listingId?: bigint;
}) {
  const {
    preview,
    showConsole,
    off,
    suggestedBacking,
    placeholder,
    listBacking,
    listErrors,
    repeg,
    setListBacking,
    setRepeg,
    call,
    onList,
  } = useOperator();

  if (!showConsole) return null;

  const kind = status.kind;

  if (kind === "manager" || preview) {
    return (
      <div className="noun-actions">
        <label className="op-backing">
          <span className="op-backing-label">ETH backing</span>
          <input
            className="op-input"
            type="text"
            inputMode="decimal"
            enterKeyHint="done"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            placeholder={placeholder || "ETH backing"}
            value={listBacking[id] ?? ""}
            aria-invalid={Boolean(listErrors[id])}
            aria-describedby={listErrors[id] ? `list-error-${id}` : undefined}
            onChange={(e) => setListBacking(id, e.target.value)}
          />
        </label>
        {listErrors[id] ? (
          <p className="op-error op-row-error" id={`list-error-${id}`} role="alert">
            {listErrors[id]}
          </p>
        ) : null}
        <button type="button" className="btn" disabled={off} onClick={() => onList(id)}>
          List
        </button>
        <button
          type="button"
          className="btn"
          disabled={off}
          onClick={() => call("returnNouns", [[BigInt(id)]])}
        >
          Return home
        </button>
      </div>
    );
  }

  if (kind === "listed" && listingId !== undefined) {
    return (
      <div className="noun-actions">
        <span className="muted">
          pegged {fmtEth(status.backing)}
          {suggestedBacking && status.backing > 0n
            ? `, drift ${(Number(((suggestedBacking - status.backing) * 1000n) / status.backing) / 10).toFixed(1)}%`
            : ""}
        </span>
        <button
          type="button"
          className="btn"
          disabled={off}
          onClick={() => call("withdrawListing", [listingId])}
        >
          Withdraw
        </button>
        <label className="op-backing">
          <span className="op-backing-label">New backing</span>
          <input
            className="op-input"
            type="text"
            inputMode="decimal"
            enterKeyHint="done"
            autoComplete="off"
            placeholder="ETH"
            value={repeg[id] ?? ""}
            onChange={(e) => setRepeg(id, e.target.value)}
          />
        </label>
        <button
          type="button"
          className="btn"
          disabled={off || !repeg[id] || Number(repeg[id]) < 1}
          onClick={() => {
            const nb = parseEther(repeg[id]);
            const topUp = nb > status.backing ? nb - status.backing : 0n;
            call("updateBacking", [listingId, nb, topUp]);
          }}
        >
          Re-peg
        </button>
      </div>
    );
  }

  if (kind === "settlement" && listingId !== undefined) {
    return (
      <div className="noun-actions">
        <Countdown allocatedAt={status.allocatedAt} />
        <button
          type="button"
          className="btn"
          disabled={off}
          onClick={() => call("reclaimNFT", [listingId])}
          title="Pay winner 90%, keep the Noun"
        >
          Reclaim NFT
        </button>
        <button
          type="button"
          className="btn"
          disabled={off}
          onClick={() => call("reclaimBackingAndSurrenderNoun", [listingId])}
          title="Keep 99%, surrender the Noun"
        >
          Reclaim backing
        </button>
        <button
          type="button"
          className="btn"
          disabled={off}
          onClick={() => call("finalizeUnsettled", [listingId])}
        >
          Finalize
        </button>
      </div>
    );
  }

  return null;
}

export default function NounCard({
  id,
  status,
  listingId,
}: {
  id: number;
  status: NounStatus;
  listingId?: bigint;
}) {
  return (
    <article className="noun-card">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`https://noun.pics/${id}.png?size=160`} alt={`Noun ${id}`} width={160} height={160} />
      <div className="noun-id">Noun {id}</div>
      <Badge status={status} />
      <NounActions id={id} status={status} listingId={listingId} />
    </article>
  );
}
