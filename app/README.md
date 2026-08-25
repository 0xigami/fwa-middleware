# FWA frontend

Public status page + thin operator strip for the "Fake World Assets" Nouns DAO proposal. One page, no backend: all reads are client-side against a public mainnet RPC (multicall for ownerOf/listings, eth_getLogs for events, 60s refresh).

## Run

```sh
pnpm install
cp .env.example .env.local
pnpm dev
```

The listing manager is public config: set `MANAGER_ADDRESS` in `lib/config.ts` or `NEXT_PUBLIC_MANAGER_ADDRESS` (not a secret) and deploy. Until that address is in config the page shows all 24 Nouns as "In treasury", stats as n/a, and writes disabled.

## Env

| Var | What |
|-|-|
| `NEXT_PUBLIC_MANAGER_ADDRESS` | Optional public listing manager. Empty = preview. Not a secret. |
| `NEXT_PUBLIC_START_BLOCK` | Optional event-scan start block. |
| `NEXT_PUBLIC_RPC` | Optional RPC override (default: https://ethereum-rpc.publicnode.com) |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | Reown Cloud project ID for WalletConnect. Set in Vercel; never commit a real ID. |

## Operator strip

CONNECT (top right) opens RainbowKit: injected wallets on laptop, same modal with WalletConnect on phone. Operator txs target Ethereum mainnet. If the connected address matches `manager.operator()`, per-Noun buttons appear: list at floor divided by the FWA settlement discount (floor from CoinGecko), withdraw listing, return home, plus sweep/claim buttons. Anything fancier: Etherscan is the fallback console.

## Deploy (Vercel)

Root directory `app/`, framework Next.js, `pnpm build`. Set `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` in the Vercel project. After 992, put the public manager address in `lib/config.ts` or `NEXT_PUBLIC_MANAGER_ADDRESS` (public, not a Vercel secret) and redeploy.

## Notes

- ABIs: `fwa-core-abi.json` and `manager-abi.json` are the full reference ABIs; the app uses minimal hand-typed subsets in `lib/abis.ts`.
- Status derivation: Nouns `ownerOf` (treasury / manager / FWA core / anyone else) crossed with FWA `listings()` structs and manager `Listed` events for the tokenId to listingId map.
- If RPC reads ever get heavy, add a checkpoint JSON route (StockRip secretdash pattern). Not needed for v1.
