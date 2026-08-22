# Audit Report: NounsListingManager

**Date:** 2026-08-22
**Auditor:** Claude (checklist-driven, Solodit-anchored)
**Checklist version:** 370 items across 13 categories
**Commit:** bd0ac0a (contracts/src/NounsListingManager.sol, solc 0.8.26 pinned)

---

## Scope

`NounsListingManager` is an immutable, non-upgradeable middleware between the Nouns DAO treasury (timelock) and the FWA gacha protocol on Ethereum mainnet. The treasury loads Nouns and ETH into it via proposal actions; an operator lists Nouns into FWA with ETH backing (floored by immutable `MIN_BACKING`), manages backing, and unwinds positions. Every exit destination is hardcoded: Nouns can only move treasury → manager → FWA and back to the treasury, ETH only into FWA backing or to the treasury, ERC20s only to the treasury. Six functions are deliberately permissionless keeper hooks (fee claims, settlement finalization, listing activation, reward claims). The treasury retains a `setOperator` and an arbitrary-call `execute()` escape hatch, both callable only by a passed proposal.

Out of scope: the FWA core and FWARewards contracts themselves (externally owned, Etherscan-verified, params previously verified against live state), the Nouns token/governor/timelock, the frontend, and the proposal transaction encoding (checked separately as part of deployment).

This is the third review round: a manual security round (rewards passthroughs, immutable `MIN_BACKING`, `relist()` removal, raw-call `sweepToken`) and a 48-agent adversarial review (1 confirmed finding, `pull()` stale-id skip, fixed) preceded it. This pass walks the full checklist against the final code.

## Checklist coverage

- Categories walked: Attacker's Mindset (25), Basics (135), Centralization Risk (7), External Call (14), Heuristics (17), Token (24) — 222 items
- Categories excluded by scope, with reason: Defi (no AMM/lending/oracle math in the manager), Integrations (no Uniswap/Chainlink/LayerZero-class dependencies), Hash/Merkle (none), Signature (none), Multi-chain (single-chain, no CREATE2 address reuse), Low Level (no assembly, no delegatecall), Timelock (consumes the Nouns timelock, does not implement one)
- Items applicable & reviewed in depth: ~74
- Items not applicable: ~148 (proxy/upgradeability items — contract is immutable with no proxy; Solidity <0.8.26 version-specific compiler bugs — pinned 0.8.26; ERC20-implementation items — contract implements no token; signature/permit items — none present)

## Findings

No Critical, High, or Medium findings.

### [Low] Constructor does not zero-check `operator_`  (ref: SOL-Basics-Initialization-1)

- **Location:** `NounsListingManager.sol:77-95`
- **Impact:** Deploying with `operator_ = address(0)` (bad deploy script, copy-paste slip) yields a manager where every operator function reverts. No funds at risk — the treasury can repair it via `setOperator`, but only through a full governance proposal (~1 week), and if it happened before proposing, redeploying is cheaper than repairing.
- **Exploit path:** Not attacker-exploitable; purely a deployment footgun. All four contract addresses are zero-checked but the operator is not.
- **Recommendation:** No code change needed this late (it would invalidate the reviewed bytecode); mitigate procedurally — the deploy script must assert `operator != address(0)` and the post-deploy verification step must read back `operator()` before the proposal references the address. Note `setOperator(address(0))` remains allowed by design as a treasury-controlled "pause".

### [Low] `MIN_BACKING` is a static floor while the Nouns floor price moves  (ref: SOL-CR-7, SOL-CR-4)

- **Location:** `NounsListingManager.sol:49, 140, 151`
- **Impact:** A malicious or compromised operator can lower any listing's backing to exactly `MIN_BACKING` via `updateBacking`. If the Nouns floor rises well above `MIN_BACKING ÷ (settlementDiscountBps/10000)`, a colluding drawer keeps the Noun at a discount. Bounded loss per Noun ≈ market floor − (backing × 90%). The same applies to `reclaimBackingAndSurrenderNoun`, which forfeits the Noun for 99% of backing.
- **Exploit path:** Operator key compromise → `updateBacking(id, MIN_BACKING, 0)` on all listings → accomplice draws until allocation → accomplice keeps below market.
- **Recommendation:** Accepted residual risk, already adjudicated in spec §3.5: `MIN_BACKING` is a per-deployment floor, not a peg; the treasury can replace the operator or unwind via proposal. Deploy with `MIN_BACKING` set meaningfully (the planned 1.22 ETH backing ÷ headroom, not the 1 ETH test value chosen arbitrarily), and keep the operator on a multisig, not an EOA.

## Informational

| # | Location | Note |
|-|-|
| I-1 | `sweepToken` (L190-195) | A call to an address with no code returns `ok=true`, `ret.length==0` → silent success and a misleading `SweptToken` event. No funds involved, no loss (SOL-EC-12). |
| I-2 | `sweepToken` (L192) | Zero-balance sweep calls `transfer(TREASURY, 0)`; some tokens revert on zero-amount transfer. Benign — retry when balance is non-zero (SOL-Token-FE-10). |
| I-3 | `setOperator` (L119-122) | Single-step transfer. Acceptable here because the setter is the DAO timelock itself and a wrong address is recoverable by a follow-up proposal; two-step would add a proposal round-trip for no security gain (SOL-CR-6). |
| I-4 | `pull` (L116) | `Pulled(tokenIds)` emits the full input array including skipped ids; consumers must also read `PullSkipped` events to know what actually moved. |
| I-5 | `list` (L141) | If `FWA.listNFT` ever reverted after `approve`, the approval to FWA would persist. FWA is the only approved spender and the tx reverts atomically anyway — unreachable residue. |

## Acknowledged non-issues

- **Reentrancy:** The only mutable state is `operator`; no accounting exists to desynchronize. All value-bearing exits terminate at the treasury regardless of call ordering, and Nouns `transferFrom` has no receiver hooks. CEI concerns are moot (SOL-EC-1, SOL-EC-13, SOL-AM-ReentrancyAttack-2).
- **Permissionless keeper functions** (`claimFees`, `withdrawEarnings`, `finalizeUnsettled`, `activateListings`, `claimDepositorTokens`, `withdrawRewardTokens`): each is a passthrough to a function that is already permissionless or depositor-gated on FWA/FWARewards, and every payout credits the manager itself. Gating them would add nothing (SOL-Basics-Function-9).
- **`execute()` arbitrary call:** gated to the treasury, i.e. usable only by a passed Nouns proposal — equivalent in trust to the proposal system itself (SOL-Basics-Function-6).
- **`sweepToken` as a call gadget:** the operator controls only the target address; calldata is fixed to `transfer(TREASURY, amount)`. Any selector-colliding function on a hostile target executes with the treasury as beneficiary and zero value — no extraction path (SOL-EC-5).
- **Plain `transferFrom` to the treasury** (not `safeTransferFrom`): required — the Nouns timelock's `onERC721Received` returns void, so the safe variant always reverts against it; the Nouns auction house uses the same pattern. Both endpoints (treasury, manager with `onERC721Received`) are known-good receivers, so SOL-Token-NfE1-1 is satisfied by construction.
- **`pull()` bricking on a burned id:** `ownerOf` reverts for burned Nouns, which would revert the whole pull. Unreachable: only the auction-house minter can burn, and only Nouns it holds at settlement — a Noun moved out of the treasury by a concurrent proposal cannot be burned by its new holder, and the stale-id skip handles the moved case.
- **Force-fed / donated ETH and tokens:** no balance-dependent accounting exists; anything received is sweepable to the treasury (SOL-AM-DA-1, SOL-Basics-Payment-3).
- **Griefing via `activateListings(hugeCount)` or foreign listing ids in claim arrays:** either reverts harmlessly or performs work already permitted directly on FWA; no manager state is touched (SOL-AM-GA-1).
- **ETH lockup:** `sweepETH` covers the balance; `execute()` is the backstop if the timelock's receive path ever changed (SOL-Basics-Payment-7).
- **Compiler:** pinned 0.8.26; every version-specific item in the checklist targets older versions. No assembly, no `unchecked`, no `selfdestruct`, no delegatecall.

## Trust assumptions (out-of-contract, disclosed in the proposal)

1. **FWA owner is an EOA** and can tune live parameters (`settlementDiscountBps` observed owner-changed from the source default 8500 to 9000). The operator must read it at listing time and after; a hostile change alters keep economics but cannot take the Nouns except through the normal draw/keep flow at the backing price.
2. **`finalizeUnsettled` after the 7-day reclaim window is a forced sale at backing.** This is an FWA rule, permissionless to trigger. Settlement timers are a mandatory operational duty, not optional monitoring — the operator console's countdown exists for this.
3. **Operator honesty is bounded, not assumed:** worst-case operator damage is early unwind (everything back to the treasury) or the Low-2 discount scenario, never redirection of assets.

## Open questions for the developer

1. Production `MIN_BACKING` value — tests use 1 ETH; the strategy backs at ~1.22 ETH. Confirm the deploy value leaves re-peg headroom below the intended backing but above any exploitable discount (see Low-2).
2. Production `operator` address — EOA or multisig? Recommendation is multisig given Low-2 is the only residual with economic teeth.
3. Confirm at deploy time (not from the 8/14 snapshot) that live FWA `settlementDiscountBps`, whitelist status for Nouns, and the exit-lock duration still match the values the strategy and fork tests assume.

## Verdict

Nothing blocks deployment. The two Low findings require no code change — one deploy-script assertion and one parameter-choice confirmation. Sign-off is conditional only on the standard pre-flight already planned: re-run the fork suite at a fresh block and re-verify live FWA parameters immediately before deploy and again before the proposal is submitted.
