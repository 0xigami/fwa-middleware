# fwa-middleware

Middleware for the "Fake World Assets" Nouns DAO proposal: 24 treasury Nouns listed on [fwa.fun](https://fwa.fun) at floor ÷ 0.9, with every exit path hardcoded back to the Nouns treasury.

Spec: [docs/SPEC.md](docs/SPEC.md).

## Layout

- `contracts/` Foundry project: `NounsListingManager.sol` + mainnet-fork tests
- `app/` nounish frontend: public status page + operator panel (Next.js, viem/wagmi, pnpm)

## Addresses

| | |
|-|-|
| NounsListingManager (deployed + verified 2026-08-22) | 0x89ec417Fa93F02926bF9c28316dA4E7d0F28089b |
| Nouns token | 0x9C8fF314C9Bc7F6e59A9d9225Fb22946427eDC03 |
| Nouns treasury (timelock, nouns.eth) | 0xb1a32FC9F9D8b2cf86C068Cae13108809547ef71 |
| FWA core | 0xB276F62DB0ce8CA2Ca5bc522695bE604521eAc1c |

## Trust model

The operator can manage listings but can never choose a destination: Nouns move only manager ↔ FWA or manager → treasury; ETH moves only manager → FWA (backing) or manager → treasury; ERC20s move only manager → treasury. Treasury-gated `execute()` exists as an escape hatch for FWA interface drift; the operator never gets it.

## Verification trail

Everything a voter needs to check the safety claims, in one place:

| What | Where |
|-|-|
| Verified source on Etherscan | [0x89ec417F...089b](https://etherscan.io/address/0x89ec417Fa93F02926bF9c28316dA4E7d0F28089b#code) |
| Mainnet-fork test suite (27 tests, 4 suites, incl. an exact replay of the 4 proposal actions with all 24 Noun ids) | [contracts/test/NounsListingManager.t.sol](contracts/test/NounsListingManager.t.sol) |
| Security audit, checklist-driven, 222 items walked: no critical/high/medium findings | [audit-report.md](audit-report.md) |
| Live mainnet dry-run of the same bytecode: full lifecycle, every tx linked | [docs/DRYRUN.md](docs/DRYRUN.md) |
| The exact proposal transactions, pre-encoded | [docs/TRANSACTIONS.md](docs/TRANSACTIONS.md) |
| Design spec incl. adjudicated review items | [docs/SPEC.md](docs/SPEC.md) |

Run the tests yourself: `cd contracts && MAINNET_RPC_URL=<any archive rpc> forge test`. Three review rounds preceded deployment: a manual security pass, a large multi-agent adversarial review (one confirmed finding, fixed: `pull()` now skips ids the treasury no longer owns instead of reverting), and the final checklist audit above.
