"use client";

import { useEffect, useMemo, useState } from "react";
import { useAccount, useConnect, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { encodeAbiParameters, parseAbi, parseEther, formatEther } from "viem";
import { ALL_IDS, MANAGER, NOUNS_TOKEN, shortAddr } from "@/lib/config";

const DAO_DATA = "0xf790A5f59678dd733fb3De93493A91f472ca1365" as const;
const PROPOSAL_RAW = "https://raw.githubusercontent.com/0xigami/fwa-middleware/main/docs/PROPOSAL.md";

const dataAbi = parseAbi([
  "function createProposalCandidate(address[] targets, uint256[] values, string[] signatures, bytes[] calldatas, string description, string slug, uint256 proposalIdToUpdate) payable",
  "function createCandidateCost() view returns (uint256)",
]);
const nounsAbi = parseAbi(["function getCurrentVotes(address account) view returns (uint96)"]);

function buildActions(manager: `0x${string}`) {
  const approveTrue = encodeAbiParameters([{ type: "address" }, { type: "bool" }], [manager, true]);
  const approveFalse = encodeAbiParameters([{ type: "address" }, { type: "bool" }], [manager, false]);
  const pullIds = encodeAbiParameters([{ type: "uint256[]" }], [ALL_IDS.map((n) => BigInt(n))]);
  return {
    targets: [NOUNS_TOKEN, manager, NOUNS_TOKEN, manager] as `0x${string}`[],
    values: [0n, 0n, 0n, parseEther("30")],
    signatures: ["setApprovalForAll(address,bool)", "pull(uint256[])", "setApprovalForAll(address,bool)", ""],
    calldatas: [approveTrue, pullIds, approveFalse, "0x"] as `0x${string}`[],
  };
}

export default function CandidatePage() {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { writeContract, isPending, error, data: txHash } = useWriteContract();
  const receipt = useWaitForTransactionReceipt({ hash: txHash });

  const [description, setDescription] = useState("");
  const [slug, setSlug] = useState("fake-world-assets");
  const [loadErr, setLoadErr] = useState("");

  useEffect(() => {
    fetch(PROPOSAL_RAW)
      .then((r) => (r.ok ? r.text() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then(setDescription)
      .catch((e) => setLoadErr(String(e)));
  }, []);

  const { data: cost } = useReadContract({ address: DAO_DATA, abi: dataAbi, functionName: "createCandidateCost" });
  const { data: votes } = useReadContract({
    address: NOUNS_TOKEN, abi: nounsAbi, functionName: "getCurrentVotes",
    args: address ? [address] : undefined, query: { enabled: !!address },
  });

  const actions = useMemo(() => (MANAGER ? buildActions(MANAGER) : undefined), []);
  const fee = votes !== undefined && votes > 0n ? 0n : cost ?? 0n;
  const ready = !!actions && description.length > 0 && slug.length > 0 && isConnected;

  function submit() {
    if (!actions) return;
    writeContract({
      address: DAO_DATA,
      abi: dataAbi,
      functionName: "createProposalCandidate",
      args: [actions.targets, actions.values, actions.signatures, actions.calldatas, description, slug, 0n],
      value: fee,
    });
  }

  const campUrl = address ? `https://nouns.camp/candidates/${address.toLowerCase()}-${slug}` : undefined;

  return (
    <main className="main">
      <h1 className="title">Submit proposal candidate</h1>
      <p className="subtitle">
        One signature. Packages the four proposal actions plus the full PROPOSAL.md into{" "}
        <code>createProposalCandidate</code> on the Nouns DAO data contract ({shortAddr(DAO_DATA)}).
      </p>

      {!MANAGER && <p className="badge b-hot">NEXT_PUBLIC_MANAGER_ADDRESS is unset. Set it and restart.</p>}

      {!isConnected ? (
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          {connectors.map((c) => (
            <button key={c.uid} className="op-row" onClick={() => connect({ connector: c })}>
              Connect {c.name}
            </button>
          ))}
        </div>
      ) : (
        <p className="muted">
          Connected {shortAddr(address!)} · {votes !== undefined ? `${votes} votes` : "reading votes..."} ·{" "}
          {fee === 0n ? "candidate fee waived (nouner)" : `fee ${formatEther(fee)} ETH (no votes at snapshot)`}
        </p>
      )}

      {actions && (
        <table style={{ width: "100%", margin: "1rem 0", fontSize: "0.85rem" }}>
          <thead>
            <tr><th align="left">#</th><th align="left">Target</th><th align="left">Value</th><th align="left">Signature</th><th align="left">Calldata</th></tr>
          </thead>
          <tbody>
            {actions.targets.map((t, i) => (
              <tr key={i}>
                <td>{i + 1}</td>
                <td>{t === NOUNS_TOKEN ? "Nouns token" : "Manager"} ({shortAddr(t)})</td>
                <td>{formatEther(actions.values[i])} ETH</td>
                <td><code>{actions.signatures[i] || "(plain ETH transfer)"}</code></td>
                <td style={{ maxWidth: 260, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  <code>{actions.calldatas[i]}</code>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <p className="muted">
        Slug{" "}
        <input value={slug} onChange={(e) => setSlug(e.target.value.replace(/[^a-z0-9-]/g, ""))} style={{ width: 220 }} />
        {campUrl && <> → will live at <a className="feed-link" href={campUrl}>{campUrl}</a></>}
      </p>

      {loadErr ? (
        <p className="badge b-hot">Failed to load PROPOSAL.md from GitHub: {loadErr}</p>
      ) : (
        <>
          <p className="muted">Description (loaded from docs/PROPOSAL.md on main, {description.length.toLocaleString()} chars, editable):</p>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            style={{ width: "100%", height: 260, fontFamily: "monospace", fontSize: "0.75rem" }}
          />
        </>
      )}

      <div style={{ margin: "1rem 0" }}>
        <button className="op-row" disabled={!ready || isPending} onClick={submit}>
          {isPending ? "Sign in wallet..." : `Create candidate${fee > 0n ? ` (${formatEther(fee)} ETH fee)` : ""}`}
        </button>
      </div>

      {error && <p className="badge b-hot">{error.message.split("\n")[0]}</p>}
      {txHash && (
        <p className="muted">
          Tx <a className="feed-link" href={`https://etherscan.io/tx/${txHash}`}>{shortAddr(txHash)}</a>
          {receipt.isSuccess && campUrl && <> · confirmed. View it on <a className="feed-link" href={campUrl}>nouns.camp</a></>}
        </p>
      )}
    </main>
  );
}
