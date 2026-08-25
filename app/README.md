# FWA frontend

Public status page + thin operator strip for the "Fake World Assets" Nouns DAO proposal. One page, no backend: all reads are client-side against a public mainnet RPC (multicall for ownerOf/listings, eth_getLogs for events, 60s refresh).

## Run

```sh
pnpm install
cp .env.example .env.local
pnpm dev
```

The listing manager address is pasted in the operator UI after proposal 992 executes (saved in this phone's localStorage). Until then the page shows all 24 Nouns as "In treasury" and stats as n/a.

## Env

| Var | What |
|-|-|
| `NEXT_PUBLIC_MANAGER_ADDRESS` | Optional local override only. Do not set on Vercel. |
| `NEXT_PUBLIC_START_BLOCK` | Optional local override for event-scan start block. Do not set on Vercel. |
| `NEXT_PUBLIC_RPC` | Optional RPC override (default: https://ethereum-rpc.publicnode.com) |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | Reown Cloud project ID for WalletConnect. Set in Vercel; never commit a real ID. |

## Operator strip

Connect Rainbow over WalletConnect (iPhone: Rainbow prompts the Nano X). Paste the public listing manager address once; it is stored on the phone. Operator txs target Ethereum mainnet. If the address matches `manager.operator()`, per-Noun buttons appear: list at floor divided by the FWA settlement discount (floor from CoinGecko), withdraw listing, return home, plus sweep/claim buttons. Wrong-network means switch to Ethereum. Anything fancier: Etherscan is the fallback console.

## Deploy (Vercel)

Root directory `app/`, framework Next.js, `pnpm build`. Set `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` in the Vercel project. Do not put the manager address in Vercel env.

## Notes

- ABIs: `fwa-core-abi.json` and `manager-abi.json` are the full reference ABIs; the app uses minimal hand-typed subsets in `lib/abis.ts`.
- Status derivation: Nouns `ownerOf` (treasury / manager / FWA core / anyone else) crossed with FWA `listings()` structs and manager `Listed` events for the tokenId to listingId map.
- If RPC reads ever get heavy, add a checkpoint JSON route (StockRip secretdash pattern). Not needed for v1.
