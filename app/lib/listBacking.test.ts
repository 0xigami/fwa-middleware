import assert from "node:assert/strict";
import test from "node:test";
import { encodeFunctionData, parseEther } from "viem";
import { managerAbi } from "./abis.ts";
import {
  formatBackingPlaceholder,
  resolveListBacking,
  suggestedBackingWei,
} from "./listBacking.ts";

test("suggested backing is floor ÷ buyback rate", () => {
  const floor = parseEther("1.15");
  const suggested = suggestedBackingWei(floor, 9000n);
  assert.ok(suggested);
  assert.equal(formatBackingPlaceholder(suggested), "1.2778");
  assert.equal(suggestedBackingWei(undefined, 9000n), undefined);
});

test("empty field falls back to placeholder wei", () => {
  const fallback = parseEther("1.2778");
  const resolved = resolveListBacking("", fallback);
  assert.ok("wei" in resolved);
  assert.equal(resolved.wei, fallback);
});

test("typed backing wins over the placeholder", () => {
  const resolved = resolveListBacking("1.5", parseEther("1.2778"));
  assert.ok("wei" in resolved);
  assert.equal(resolved.wei, parseEther("1.5"));
});

test("rejects below 1 ETH without producing list args", () => {
  const typed = resolveListBacking("0.9", parseEther("1.2778"));
  assert.deepEqual(typed, { error: "Backing must be at least 1 ETH." });
  const emptyLow = resolveListBacking("", parseEther("0.5"));
  assert.deepEqual(emptyLow, { error: "Backing must be at least 1 ETH." });
});

test("empty with unknown floor asks for a number", () => {
  assert.deepEqual(resolveListBacking("   ", undefined), {
    error: "Enter an ETH backing amount.",
  });
});

test("list calldata uses the typed backing in wei", () => {
  const resolved = resolveListBacking("2.25", parseEther("1.2778"));
  assert.ok("wei" in resolved);
  const data = encodeFunctionData({
    abi: managerAbi,
    functionName: "list",
    args: [11n, resolved.wei],
  });
  const expected = encodeFunctionData({
    abi: managerAbi,
    functionName: "list",
    args: [11n, parseEther("2.25")],
  });
  assert.equal(data, expected);
  assert.ok(data.includes("2.25") === false);
});
