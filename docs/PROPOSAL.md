# Fake World Assets

![](https://i.imgur.com/iYD3j6m.png)

## ⚡️ TLDR

Quick summary:

- Send 24 treasury Nouns into [fwa.fun](https://fwa.fun), the onchain gacha machine
- Each backed with ~1.22 ETH so a winner nets exactly the same whether they keep the Noun or take the ETH
- No discounts, no giveaways. Anyone who keeps a Noun turned down its exact cash value to do so
- Every listing earns an equal share of every draw fee in the protocol, paid to the treasury
- In expectation, a listing earns back its own backing in fees before it is ever drawn (math below)
- Ask is ~30 ETH, 0.7% of the treasury
- Nouns and ETH move through a reusable manager contract whose every exit is hardcoded to the treasury

*Throughout this proposal, "the treasury" means the Nouns DAO treasury, the timelock at [nouns.eth](https://etherscan.io/address/0xb1a32FC9F9D8b2cf86C068Cae13108809547ef71). Full details below...*

---

## 🙋 Background

I'm gami, Nouner since the early days (Nouns 13 and 189) and founder of [Gnars](https://gnars.com), which got started with 69 ETH from [Prop 51](https://nouns.wtf/vote/51) in April 2022 and has been proliferating Nouns ever since. You've seen my proposals before. They tend to bring voters out of the woodwork. Bring them.

In July 2026 I forked FWA onto Robinhood Chain as [StockRip](https://stockrip.com): 74,000+ draws, 1,700+ ETH of volume, 900+ players ([live stats](https://stockrip.com/secretdash)). So I know this machine from both sides of the glass, because I run one. I've also fed FWA a Noun of my own: [Noun 1382](https://nouns.wtf/noun/1382), backed with my own ETH, priced too low, gone in three hours, lol. That mistake is where this proposal's pricing rule comes from.

## 🎰 Why

The treasury holds 604 Nouns and gains one every day. Since the reserve went to 2.8 ETH in April, 101 of the last 102 auctions ended with zero bids: 26 Nouns burned, 75 swept into the treasury, one single winner. The treasury's ~4,000 ETH is mostly staked and earning. Its 604 Nouns earn nothing.

FWA is the busiest NFT machine on Ethereum right now: ~2,900 draws a day, ~236 ETH a day in draw fees, 6,100+ active listings (measured onchain, methodology at the bottom). Nouns is already whitelisted as collection #17. The machine is running either way. This proposal puts 24 of our idle Nouns inside it, earning, and in front of people.

## ⚖️ The true decision

Each Noun is listed with backing set to floor ÷ 0.9 (~1.22 ETH at time of writing, set precisely at listing time). FWA pays a winner 90% of backing if they hand the NFT back, so at this level the choice is perfectly balanced. Draw one and you choose:

- **Keep the Noun.** You just turned down ETH worth exactly what the Noun fetches at floor. You want this.
- **Take the ETH.** Same value, none of the hassle of selling. The Noun goes straight back to the treasury.

Flippers press the ETH button. Believers keep the Noun. And while they wait to be chosen, all 24 earn draw fees for the treasury.

## 📊 The numbers

Everything here is measured from FWA's contracts onchain (six-hour sample on 2026-08-13, extrapolated to daily rates). Verify it, please.

- ~2,900 draws/day at an average price of 0.081 ETH. 98% of every draw fee splits equally across active listings, which works out to **~0.038 ETH per listing per day** at current volume, or ~0.9 ETH/day across our 24
- Draw odds scale with 1/backing. At 1.22 ETH backing, each Noun's expected time in the pool is **~32 days** at current volume, roughly one draw event across our 24 every day or two
- The part worth checking twice: the draw fee is the pool's harmonic mean × 1.025, and draw odds are 1/backing. Those cancel, so **a listing's expected fee income before it is ever drawn ≈ its own backing**, independent of volume and of what everyone else lists
- Per-Noun branches, in expectation:
  - *Winner keeps the Noun:* ~1.22 ETH earned in fees + backing returned (minus 1% protocol cut). Treasury up ~1.2 ETH, one new Nouner who chose a Noun over cash
  - *Winner takes the ETH:* ~1.22 ETH earned in fees, 1.22 ETH of backing paid out. Roughly ETH-neutral, Noun back in the treasury
- Expectation is not a guarantee. A Noun drawn on day 2 earns less than its backing (ask me about Noun 1382). A Noun that sits earns more. That variance is why this is sized at 30 ETH and not 300
- Not modeled, pure upside: $FWA depositor rewards (30% of the protocol's fee-funded buybacks accrue to depositors)
- For calibration: across all of FWA in the sample window, winners kept the NFT in ~1.3% of settlements, because most listings are cheap NFTs backed above their value. Ours are the opposite. Keeps will still be the minority, and that's fine: a keep is a new Nouner who wanted in, a buyback is a round trip that paid us fees

## 🖼 The 24

Hand-picked from the treasury and shaped like a pyramid: the oldest Noun we have at the top, three from the early days, six from the middle years, fourteen from the no-bid era that were minted straight into the treasury. All 24 heads are different, all 24 accessories are different, and Noun 1980 is the only Noun in the entire treasury wearing the Gnars accessory.

![](https://noun.pics/11.png?size=96)

**11**

![](https://noun.pics/26.png?size=96) ![](https://noun.pics/82.png?size=96) ![](https://noun.pics/89.png?size=96)

**26 · 82 · 89**

![](https://noun.pics/279.png?size=96) ![](https://noun.pics/408.png?size=96) ![](https://noun.pics/548.png?size=96) ![](https://noun.pics/559.png?size=96) ![](https://noun.pics/801.png?size=96) ![](https://noun.pics/861.png?size=96)

**279 · 408 · 548 · 559 · 801 · 861**

![](https://noun.pics/1914.png?size=96) ![](https://noun.pics/1917.png?size=96) ![](https://noun.pics/1929.png?size=96) ![](https://noun.pics/1933.png?size=96) ![](https://noun.pics/1942.png?size=96) ![](https://noun.pics/1950.png?size=96) ![](https://noun.pics/1954.png?size=96)

**1914 · 1917 · 1929 · 1933 · 1942 · 1950 · 1954**

![](https://noun.pics/1957.png?size=96) ![](https://noun.pics/1958.png?size=96) ![](https://noun.pics/1969.png?size=96) ![](https://noun.pics/1980.png?size=96) ![](https://noun.pics/1983.png?size=96) ![](https://noun.pics/1988.png?size=96) ![](https://noun.pics/1989.png?size=96)

**1957 · 1958 · 1969 · 1980 · 1983 · 1988 · 1989**

## 🔧 The middleware

The treasury can't act inside FWA's 24h settlement windows, so a small manager contract sits in between. It's the only new code in this proposal and it's deliberately boring:

- Every exit path is hardcoded to the treasury: withdrawn Nouns, returned Nouns, reclaimed backing and earned fees can go nowhere else. The operator manages listings but cannot redirect a single wei
- I'm the operator at launch. The treasury can replace the operator at any time by proposal, and the role can be opened up further later (even permissionless keeper functions) if that's where we want to take it
- It's reusable. If this experiment earns its keep, a future proposal can load more Nouns into the same audited contract without deploying anything new
- Governance stays safe: 24 Nouns in escrow shift quorum by roughly 2 votes, quorum snapshots at proposal creation so no live vote is affected, and the impact only shrinks as Nouns supply grows
- Code public and fork-tested against mainnet state before this goes live

Attached transactions send the 24 Nouns and ~30 ETH from the treasury to the manager. I then list each one at floor ÷ the live buyback rate (90% today), priced at listing time; the contract enforces a 1 ETH minimum backing on me, and every listing tx is public and checkable against the formula.

One Noun, every day, forever. But somebody has to want one. Let's find out who.

⌐◨-◨

---

*Methodology: draw counts and fees from `AcquisitionRequested` events, outcomes from `NFTKept` / `DepositorBidAccepted` events on FWA core `0xB276F62DB0ce8CA2Ca5bc522695bE604521eAc1c`; listing count, total weight and fee parameters read from the same contract; treasury and auction figures from the Nouns token, auction house and treasury. Ask = 24 × 1.22 ETH backing plus a small gas buffer.*
