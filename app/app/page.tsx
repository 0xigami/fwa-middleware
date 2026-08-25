"use client";

import { ALL_IDS, MANAGER } from "@/lib/config";
import { useFwaData } from "@/lib/useFwaData";
import { OperatorProvider } from "@/components/OperatorProvider";
import OperatorStrip from "@/components/OperatorStrip";
import NounCard from "@/components/NounCard";

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
    <OperatorProvider data={data}>
      <main className="main">
        <h1 className="title">Fake World Assets</h1>

        <div className="tiles">
          <Tile label="Fees earned" value={preDeploy ? na : stats.fees ?? na} />
          <Tile label="Draws across the fleet" value={preDeploy ? na : String(stats.draws ?? 0)} />
          <Tile label="Keeps vs buybacks" value={preDeploy ? na : `${stats.keeps ?? 0} vs ${stats.buybacks ?? 0}`} />
          <Tile label="Days live" value={preDeploy || stats.daysLive === undefined ? na : String(stats.daysLive)} />
        </div>

        <OperatorStrip />

        <div className="noun-grid">
          {ALL_IDS.map((id) => (
            <NounCard
              key={id}
              id={id}
              status={data.statuses[id] ?? { kind: "treasury" }}
              listingId={data.listingIdByToken[id]}
            />
          ))}
        </div>

        <section className="feed">
          <h2>What happened onchain</h2>
          {preDeploy ? (
            <p className="muted">Nothing yet. The manager contract is not in config. All 24 Nouns sit in the treasury.</p>
          ) : null}
          {!preDeploy && data.feed.length === 0 && !data.loading ? <p className="muted">No activity yet.</p> : null}
          {data.loading && !preDeploy ? <p className="muted">Reading the chain...</p> : null}
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
    </OperatorProvider>
  );
}
