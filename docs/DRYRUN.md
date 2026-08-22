# Mainnet dry-run: full lifecycle, real ETH, live FWA

2026-08-22. Before asking the treasury to trust `NounsListingManager`, we ran the exact bytecode through its entire lifecycle on Ethereum mainnet against the live FWA protocol. Not a fork, not a testnet: real ETH, a real NFT, the same code.

## Setup

A second instance of the same contract (same source, same compiler, [verified](https://etherscan.io/address/0xC5e5B4461c721A217e9d210256435Eae08D72000#code)) was deployed with a throwaway EOA standing in for the treasury and a [Ten Thousand Tokens](https://etherscan.io/token/0x26D7Ad0E930b54b84C00DAad077Ee31Ba9e2Fb2E) NFT (whitelisted on FWA) standing in for a Noun. `MIN_BACKING` 0.05 ETH, listing backed with 0.1 ETH.

| | |
|-|-|
| Production manager | [`0x89ec417Fa93F02926bF9c28316dA4E7d0F28089b`](https://etherscan.io/address/0x89ec417Fa93F02926bF9c28316dA4E7d0F28089b#code) |
| Dry-run instance (same bytecode) | [`0xC5e5B4461c721A217e9d210256435Eae08D72000`](https://etherscan.io/address/0xC5e5B4461c721A217e9d210256435Eae08D72000#code) |
| FWA listing | id 163927, TTT #1520, 0.1 ETH backing |

## The ledger

Every step of the proposal's real flow, in order. Steps 2 to 5 are the exact four proposal actions; steps 6 onward are the operator and keeper lifecycle.

| # | Step | Tx |
|-|-|-|
| 1 | Deploy production manager | [`0x99d8...adf5`](https://etherscan.io/tx/0x99d8310801fa0915d1bdea6e1ff37b107a0888bec5b542fe7b905f260c85adf5) |
| 2 | Deploy dry-run instance | [`0xafd1...fb48`](https://etherscan.io/tx/0xafd1310a9455040cc8d0073756129f0c79ee20f61d80be668212eb628030fb48) |
| 3 | `setApprovalForAll(manager, true)` (= proposal action 1) | [`0xd144...c960`](https://etherscan.io/tx/0xd144dc88f6bb0025789c2eb69531dd4182d9634cf8635a383ec606b75b92c960) |
| 4 | `pull([1520])` (= proposal action 2) | [`0x5627...6fb2`](https://etherscan.io/tx/0x5627ff4b80372e1c87a83bf7afa004714737807b19acb3e4488b3e639d3e6fb2) |
| 5 | `setApprovalForAll(manager, false)` (= proposal action 3) | [`0x2e8c...33ad`](https://etherscan.io/tx/0x2e8c4999c06a9384f85cbac65831fa1eca202336a0614806a4b88d6eb1bb33ad) |
| 6 | Fund backing via `receive()` (= proposal action 4) | [`0xc4db...ca5f`](https://etherscan.io/tx/0xc4dbf9bcdb067bd06fb36604d437646893b00d087f8bbf6b340797165629ca5f) |
| 7 | `list(1520, 0.1 ETH)` into FWA | [`0xbc5a...3aab`](https://etherscan.io/tx/0xbc5acf2a141611d3c0b50c00839167894d03db4ebded4a46bdf006aaf92d3aab) |
| 8 | `activateListings` (permissionless keeper fn) | [`0x5002...5fdf`](https://etherscan.io/tx/0x50026c265732fa48da8d76f9a277af5fa3d763450a349054818a918e30835fdf) |
| 9 | Fee accrues from a live third-party draw, `claimFees` pays it to the manager | [`0x4b1d...6bf3`](https://etherscan.io/tx/0x4b1d2b6c7ab0b11e1ee238ed1b342516c6afcfe44ded82610830e689ea966bf3) |
| 10 | `withdrawListing`: NFT + full backing return to the manager | [`0x8cbc...a1be`](https://etherscan.io/tx/0x8cbcf12ee5846d35a249c5567fd5b664f514a327cf696c3e02c965a0bcaca1be) |
| 11 | `returnNouns`: NFT back to the treasury address | [`0x1b8e...4146`](https://etherscan.io/tx/0x1b8eefd167e3db7eca59134e13d9d7aefe9dd8d9e6edf1c20a51baeff5dc4146) |
| 12 | `sweepETH`: every wei back to the treasury address | [`0xdbaa...5f10`](https://etherscan.io/tx/0xdbaa7db332a665e3c997befb7ea2d4f948995f1a73d7a9e94752b5b7fe815f10) |

## What it proved

- The four proposal actions execute exactly as encoded in [TRANSACTIONS.md](TRANSACTIONS.md), against live contracts.
- The full round trip conserves value: the manager ended holding backing + accrued fees to the wei (0.1 ETH + 11,943,944,643,911 wei of fee share from one live draw), then swept to 0.
- Fees accrue to a listing from pool-wide draws and `claimListingFees` pays the manager directly. (`withdrawEarnings` correctly reverts `NoEarnings` when there is no separate fee credit; that path only carries fees settled during withdraw/re-price.)
- The exit lock (`unsettledAcquisitionCount`) cleared in minutes at current volume; withdrawal was never stuck.
- Every exit landed at the hardcoded treasury address. The operator never had a choice of destination, which is the contract's entire design.

Not exercised live (a draw of our own listing did not occur in the window, by design of the odds): the settlement branches (keep / buyback / reclaim). Those are covered by the fork suite in [`contracts/test/`](../contracts/test/NounsListingManager.t.sol), which replays them against forked mainnet state.
