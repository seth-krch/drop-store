import type { Metadata } from "next";
import Link from "next/link";
import { listDrops } from "@/lib/store";
import { dropTime, shortDate } from "@/lib/format";
import { Countdown } from "@/components/Countdown";

export const metadata: Metadata = { title: "Drops", description: "Upcoming and past Mystic drops." };

export default async function Drops() {
  const now = new Date();
  const drops = await listDrops();
  const upcoming = drops.filter((d) => d.endsAt > now).reverse();
  const past = drops.filter((d) => d.endsAt <= now);
  return (
    <div className="wrap">
      <div className="shop__title" style={{ marginTop: 28 }}>
        <h1 className="display">Drops</h1>
        <p className="muted" style={{ margin: 0 }}>Every drop opens at 10:00 Central.</p>
      </div>
      {upcoming.map((d) => {
        const hero = d.products.find((p) => p.category === "footwear") ?? d.products[0];
        return (
          <section key={d.slug} className="drop-hero">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {hero && <img src={`/img/p/${hero.slug}/1.svg`} alt={`${hero.name} in ${hero.colorway}`} width={800} height={800} style={{ background: "var(--surface)" }} />}
            <div style={{ display: "grid", gap: 18 }}>
              <p className="mono" style={{ margin: 0 }}>Drop {String(d.number).padStart(2, "0")} · {dropTime(d.startsAt)}</p>
              <h2 className="display" style={{ fontSize: "clamp(44px, 6vw, 96px)" }}>{d.name}</h2>
              <p style={{ margin: 0, fontSize: 17, maxWidth: "46ch" }}>{d.description}</p>
              {d.startsAt > now ? <Countdown to={d.startsAt.toISOString()} serverNow={now.getTime()} /> : <span className="pill pill--live">Live now</span>}
              <div><Link className="btn" href={`/drops/${d.slug}`}>View drop</Link></div>
            </div>
          </section>
        );
      })}
      <section className="sec" style={{ paddingTop: 20 }}>
        <div className="sec__head"><h2 className="display">Past drops</h2></div>
        <div className="drop-list">
          {past.map((d) => {
            const hero = d.products.find((p) => p.category === "footwear") ?? d.products[0];
            return (
              <Link key={d.slug} href={`/drops/${d.slug}`} className="drop-row">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {hero && <img src={`/img/p/${hero.slug}/1.svg`} alt="" width={120} height={120} loading="lazy" />}
                <div>
                  <p className="mono muted" style={{ margin: 0 }}>Drop {String(d.number).padStart(2, "0")} · {shortDate(d.startsAt)}</p>
                  <h3>{d.name}</h3>
                  <p className="muted" style={{ margin: "4px 0 0" }}>{d.tagline}</p>
                </div>
                <span className="pill pill--done">Sold out</span>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
