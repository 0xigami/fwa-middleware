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
