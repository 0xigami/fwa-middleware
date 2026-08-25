import { formatEther, parseEther } from "viem";

/** Production NounsListingManager MIN_BACKING. Local UI check only — not a contract change. */
export const MIN_BACKING_WEI = parseEther("1");

/** Same math the operator strip already uses: floor ÷ (discountBps / 10000). */
export function suggestedBackingWei(
  floorWei: bigint | undefined,
  discountBps: bigint,
): bigint | undefined {
  if (!floorWei || discountBps <= 0n) return undefined;
  return (floorWei * 10000n) / discountBps;
}

export function formatBackingPlaceholder(wei: bigint): string {
  const s = Number(formatEther(wei));
  return (s >= 100 ? s.toFixed(2) : s.toFixed(4)).replace(/\.?0+$/, "");
}

function normalizeEthInput(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.includes(",") && !trimmed.includes(".")) return trimmed.replace(",", ".");
  return trimmed;
}

/**
 * Resolve the ETH backing for list(). Typed value wins; empty falls back to the
 * floor ÷ rate suggestion when present. Never sends below MIN_BACKING.
 */
export function resolveListBacking(
  raw: string,
  fallback: bigint | undefined,
): { wei: bigint } | { error: string } {
  const normalized = normalizeEthInput(raw);
  let wei: bigint;
  if (!normalized) {
    if (fallback === undefined) return { error: "Enter an ETH backing amount." };
    wei = fallback;
  } else {
    try {
      wei = parseEther(normalized);
    } catch {
      return { error: "Enter a valid ETH amount." };
    }
  }
  if (wei < MIN_BACKING_WEI) return { error: "Backing must be at least 1 ETH." };
  return { wei };
}
