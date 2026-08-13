# FWA frontend

Public status page + thin operator strip for the "Fake World Assets" Nouns DAO proposal. One page, no backend: all reads are client-side against a public mainnet RPC (multicall for ownerOf/listings, eth_getLogs for events, 60s refresh).

## Run

```sh
pnpm install
cp .env.example .env.local   # fill in after the manager deploys
pnpm dev
```

Before the manager is deployed, leave `NEXT_PUBLIC_MANAGER_ADDRESS` unset: the page shows all 24 Nouns as "In treasury" and stats as n/a.

## Env

| Var | What |
|-|-|
| `NEXT_PUBLIC_MANAGER_ADDRESS` | NounsListingManager address (unset pre-deploy) |
| `NEXT_PUBLIC_START_BLOCK` | Manager deploy block, bounds event scans (defaults to latest minus 1M blocks) |
| `NEXT_PUBLIC_RPC` | Optional RPC override (default: https://ethereum-rpc.publicnode.com) |

## Operator strip

Connect an injected wallet. If the address matches `manager.operator()`, per-Noun buttons appear: list at floor divided by the FWA settlement discount (floor from CoinGecko), withdraw listing, return home, plus sweep/claim buttons. Anything fancier: Etherscan is the fallback console.

## Deploy (Vercel)

Root directory `app/`, framework Next.js, `pnpm build`. Set the three env vars in the Vercel project. Redeploy after the manager contract goes live to bake in the address.

## Notes

- ABIs: `fwa-core-abi.json` and `manager-abi.json` are the full reference ABIs; the app uses minimal hand-typed subsets in `lib/abis.ts`.
- Status derivation: Nouns `ownerOf` (treasury / manager / FWA core / anyone else) crossed with FWA `listings()` structs and manager `Listed` events for the tokenId to listingId map.
- If RPC reads ever get heavy, add a checkpoint JSON route (StockRip secretdash pattern). Not needed for v1.
