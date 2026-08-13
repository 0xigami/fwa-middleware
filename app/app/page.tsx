"use client";

import { MANAGER, PYRAMID_ROWS, shortAddr } from "@/lib/config";
import { fmtEth, useFwaData, type NounStatus } from "@/lib/useFwaData";
import OperatorStrip from "@/components/OperatorStrip";

function Badge({ status }: { status: NounStatus }) {
  switch (status.kind) {
    case "treasury": return <span className="badge b-idle">In treasury</span>;
    case "manager": return <span className="badge b-warm">Held by manager</span>;
    case "listed": return <span className="badge b-live">Listed {fmtEth(status.backing)}</span>;
    case "settlement": return <span className="badge b-hot">In settlement</span>;
    case "kept": return <span className="badge b-gone">Kept by {shortAddr(status.by)}</span>;
    case "home": return <span className="badge b-home">Home</span>;
  }
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="tile">
      <div className="tile-value">{value}</div>
      <div className="tile-label">{label}</div>
    </div>
  );
}

export default function Page() {
  const data = useFwaData();
  const { stats } = data;
  const preDeploy = !MANAGER;
  const na = "n/a";

  return (
    <main className="main">
      <h1 className="title">Fake World Assets</h1>
      <p className="subtitle">
        24 Nouns from the treasury, listed on <a href="https://fwa.fun" target="_blank" rel="noreferrer">fwa.fun</a> at
        floor divided by 0.9. Every exit path is hardcoded back home. Watch it live.
      </p>

      <div className="pyramid">
        {PYRAMID_ROWS.map((row, i) => (
          <div className="pyramid-row" key={i}>
            {row.map((id) => (
              <div className="noun-card" key={id}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`https://noun.pics/${id}.png?size=96`} alt={`Noun ${id}`} width={96} height={96} />
                <div className="noun-id">Noun {id}</div>
                <Badge status={data.statuses[id] ?? { kind: "treasury" }} />
              </div>
            ))}
          </div>
        ))}
      </div>

      <div className="tiles">
        <Tile label="Fees earned" value={preDeploy ? na : stats.fees ?? na} />
        <Tile label="Draws across the fleet" value={preDeploy ? na : String(stats.draws ?? 0)} />
        <Tile label="Keeps vs buybacks" value={preDeploy ? na : `${stats.keeps ?? 0} vs ${stats.buybacks ?? 0}`} />
        <Tile label="Days live" value={preDeploy || stats.daysLive === undefined ? na : String(stats.daysLive)} />
      </div>

      <OperatorStrip data={data} />

      <section className="feed">
        <h2>What happened onchain</h2>
        {preDeploy && <p className="muted">Nothing yet. The manager contract is not deployed. All 24 Nouns sit in the treasury.</p>}
        {!preDeploy && data.feed.length === 0 && !data.loading && <p className="muted">No activity yet.</p>}
        {data.loading && !preDeploy && <p className="muted">Reading the chain...</p>}
        <ul>
          {data.feed.map((item) => (
            <li key={item.key}>
              <a href={`https://etherscan.io/tx/${item.tx}`} target="_blank" rel="noreferrer" className="feed-link">
                {item.text}
              </a>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
