# Spec: FWA middleware for Nouns DAO

What we build before the proposal goes onchain. Two deliverables: the manager contract and a small frontend to operate and watch it. KISS throughout.

Throughout: "the treasury" = the Nouns DAO timelock at 0xb1a32FC9F9D8b2cf86C068Cae13108809547ef71. "FWA core" = 0xB276F62DB0ce8CA2Ca5bc522695bE604521eAc1c.

## 1. NounsListingManager (the contract)

One contract, immutable, no proxy. Design principle: the operator can manage listings but assets can only ever exit toward the treasury. Reusable across future proposals.

### Storage / immutables

- `NOUNS` (0x9C8fF314C9Bc7F6e59A9d9225Fb22946427eDC03), `FWA` (core), `TREASURY` (timelock) as immutables
- `operator` address, settable only by `TREASURY`
- inventory tracking: set of tokenIds currently held or listed by the manager

### Roles

| Who | Can |
|-|-|
| Treasury (by proposal) | load Nouns + ETH, pull via approval, set operator, arbitrary-call escape hatch (see below) |
| Operator | list, withdraw, relist, updateBacking, reclaim flows, trigger sweeps |
| Anyone | `claimFees`, `withdrawEarnings`, `finalizeUnsettled` (pull-pattern, only credit the manager) |

Design change from review: `returnNouns` / `sweepETH` / `sweepToken` are operator-gated, not permissionless. A stranger calling them would send assets to the safe destination but unwind the program early (ETH swept before listing = stuck at the treasury until a new proposal). Destinations stay hardcoded, so gating costs nothing in trust.

Verified from source + live chain (2026-08-13): `listNFT(address,uint256)` payable, backing = msg.value; live settlementDiscountBps = 9000 (90%, source default was 8500 — owner-tuned, operator must read it at listing time for the floor ÷ 0.9 pricing); buyback remainder 10% goes to protocol owner (`retainedToProtocol = true`); keepNFT returns 99% of backing to depositor; `updateBacking(id, newBacking)` payable, raises and lowers with same-call refund; `withdrawListing` uses safeTransferFrom (manager needs `onERC721Received`), settlement payouts are pushed ETH (manager needs `receive()`); fees are pull (`claimListingFees` then `withdrawEarnings`); `proposalMaxOperations` = 10 confirmed; no listing caps; gates: `whitelistEnabled` + per-collection whitelist (Nouns whitelisted) and a global `withdrawOnly` switch.

### Flows

1. **Load.** Proposal executes: `nouns.setApprovalForAll(manager, true)` → `manager.pull(uint256[] ids)` (onlyTreasury, transfers the 24 in one call) → `setApprovalForAll(manager, false)` → ETH transfer. Four actions total. This matters because Nouns proposals cap at 10 actions (`proposalMaxOperations`, verify on the live governor), so 24 individual transfers do not fit.
2. **List.** Operator calls `list(tokenId, backing)`. Manager approves FWA core and calls `listNFT` with `backing` from its ETH balance. Listing at floor ÷ 0.9 is operator policy, priced at listing time.
3. **Winner keeps.** FWA returns backing to the manager (depositor). Anyone sweeps it to the treasury.
4. **Winner takes ETH.** Noun comes back to the manager. Operator may relist (policy for a future tranche) or anyone returns it to the treasury.
5. **Withdraw.** Operator calls `withdrawListing` passthrough for undrawn listings. Noun lands in manager, anyone returns it home.
6. **Fees and rewards.** `claimListingFees` passthrough (operator or keeper), then permissionless `sweepETH()`. $FWA token rewards via `sweepToken`.
7. **Wind-down.** Operator withdraws all, anyone sweeps and returns all. No special state needed.

### Passthroughs to FWA (operator-gated)

`listNFT`, `withdrawListing`, `relistNFT`, `updateBacking`, `depositorReclaimBacking`, `depositorReclaimNFT`, `finalizeUnsettled`, `claimListingFees`, `recoverStuckNFT`.

### Escape hatch

`execute(target, value, data)` gated to `TREASURY` only. If FWA upgrades and interfaces drift, a proposal can still do anything needed. The operator never gets this power.

### Invariants (enforced in code, checked in tests)

- Nouns move only: treasury → manager → FWA core, and back along the same path, terminating at the treasury
- ETH moves only: treasury → manager → FWA (as backing), and back, terminating at the treasury
- Any ERC20 moves only: manager → treasury
- No function lets the operator set a destination address

### Verify from FWA source before writing code

1. `listNFT(address,uint256)` exact signature and how backing is paid (msg.value vs param)
2. Where the 10% goes on a buyback (protocol vs depositor), affects branch math in the proposal
3. Min backing (docs say 0.05, no getter found)
4. `updateBacking` semantics (raise and lower, ETH flows)
5. `proposalMaxOperations` on the live Nouns governor
6. FWA depositor callbacks: does the manager need `onERC721Received` plus anything FWA-specific

### Testing

Foundry, mainnet fork:

- full lifecycle: load → list → draw (impersonate FWA VRF flow or prank winner) → both settle branches → sweep → return
- fuzz: operator calls with arbitrary args can never move assets anywhere but treasury/FWA
- invariant suite on the three bullet points above
- gas sanity on `pull(uint256[24])`

Then a `/security-review` pass, then deploy + verify on Etherscan, then dry-run the full cycle with one cheap NFT from a whitelisted collection (not a Noun, ours are votes) before the proposal goes up.

## 2. Frontend (the window into the machine)

One page, nounish, public. Two jobs: let anyone watch the experiment live (this is the campaign asset), let the operator act without crafting calldata.

### Public view (no wallet)

- The 24 in the pyramid layout, live status per Noun: **Listed** (with current backing), **In settlement** (24h countdown), **Kept by 0x...**, **Home in the treasury**
- Stat tiles: fees earned to date (swept + accrued), draws across the fleet, keeps vs buybacks, days live
- Event feed, newest first: "Noun 1929 drawn. Winner took the ETH. Fee share earned so far: 0.41 ETH"
- Everything is an onchain read: manager events + FWA core events via `eth_getLogs`, listing structs via multicall. No backend, no indexer for v1. If RPC reads get heavy, add a checkpoint JSON route like StockRip's secretdash

### Operator view (wallet-gated to `operator`)

- Per-Noun action buttons mapping 1:1 to the passthroughs: list at floor ÷ 0.9 (floor fetched, editable), withdraw, relist, reclaim
- Settlement-window timers with alerts for anything requiring action within 24h
- Sweep buttons (also visible to everyone, since they're permissionless)

### Stack

- Next.js + TypeScript, viem + wagmi, minimal wallet connect, pnpm, Vercel
- Nounish styling: Londrina Solid, nouns.wtf palette, noun.pics images, ⌐◨-◨
- Repo: README first, then contract, then app

## 3. Proposal transactions (final shape)

1. `nouns.setApprovalForAll(manager, true)`
2. `manager.pull([11, 26, 82, 89, 279, 408, 548, 559, 801, 861, 1914, 1917, 1929, 1933, 1942, 1950, 1954, 1957, 1958, 1969, 1980, 1983, 1988, 1989])`
3. `nouns.setApprovalForAll(manager, false)`
4. Send ~30 ETH to the manager (treasury holds 81 raw ETH, covers it without unstaking)

Operator lists all 24 within days of execution, at floor ÷ 0.9 read at listing time, and every listing tx is linkable from the frontend.

## 3.5 Ultracode review outcomes (2026-08-13)

Confirmed and fixed: `pull()` now skips ids the treasury no longer owns (emits `PullSkipped`) so a concurrent proposal moving one of the 24 cannot expire the whole program. Refuted by the verify panel: FWAToken transfer-lock stranding, missing claimTopSpot, acquisition-spam exit blocking, treasury-ETH-dip and FWA-drift bricking (full exit always available).

Adjudicated doc/ops items:

- `settlementDiscountBps` is FWA-owner-tunable after we list. The "nets exactly the same" balance holds only at the rate read at listing time. Ops rule: operator monitors the rate and re-pegs via `updateBacking` if it moves. Frontend should surface the live rate next to each backing.
- `MIN_BACKING` is a per-deployment floor, not a peg to the Nouns floor. If floor rises far above it, the guarantee weakens for future tranches; a future proposal can deploy a fresh manager with a higher floor. Documented, accepted for v1.
- Listing price is operator policy above `MIN_BACKING`, not enforced by the proposal transactions. The proposal text says so plainly.
- Test-coverage debt for the reviewer round: settlement-branch fork tests (keep / buyback / reclaim paths need a simulated draw, likely via storage manipulation of FWA's allocation state), FWARewards claim path, sweepToken. Current suite: 20 tests covering lifecycle, access control, backing floor, stale-id pull, escape hatch, updateBacking.

## 4. Build order

1. FWA source verification pass (the six items above)
2. Contract + fork tests
3. Frontend
4. Security review
5. Deploy, verify, dry-run with a cheap whitelisted NFT
6. Candidate on nouns.camp for feedback, then the proposal (gami buys 2 Nouns at floor, self-delegates, proposes with 4 votes)
