import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getDrop } from "@/lib/store";
import { dropTime, money } from "@/lib/format";
import { Countdown } from "@/components/Countdown";
import { phase } from "@/lib/queue-math";

export async function generateMetadata({ params }: PageProps<"/drops/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const d = await getDrop(slug);
  return d ? { title: `Drop ${String(d.number).padStart(2, "0")}: ${d.name}`, description: d.description } : {};
}

export default async function DropPage({ params }: PageProps<"/drops/[slug]">) {
  const { slug } = await params;
  const now = new Date();
  const d = await getDrop(slug);
  if (!d) notFound();
  const state = d.startsAt > now ? "upcoming" : d.endsAt > now ? "live" : "ended";
  const roomOpen = phase(d, now) === "room";

  return (
    <div className="wrap">
      <nav className="crumbs" aria-label="Breadcrumb"><Link href="/drops">Drops</Link> / <span>{d.name}</span></nav>
      <section className="drop-hero" style={{ alignItems: "start" }}>
        <div style={{ display: "grid", gap: 18 }}>
          <p className="mono" style={{ margin: 0 }}>Drop {String(d.number).padStart(2, "0")} · {dropTime(d.startsAt)}</p>
          <h1 className="display" style={{ fontSize: "clamp(44px, 6vw, 96px)" }}>{d.name}</h1>
          <p style={{ margin: 0, fontSize: 17, maxWidth: "46ch" }}>{d.description}</p>
          {state === "upcoming" && <Countdown to={d.startsAt.toISOString()} serverNow={now.getTime()} />}
          {state === "live" && <span className="pill pill--live">Live now</span>}
          {state === "ended" && <span className="pill pill--done">This drop has ended</span>}
          {state !== "ended" && (
            <div style={{ display: "grid", gap: 8, maxWidth: 360 }}>
              <Link className="btn" href={`/drops/${d.slug}/queue`}>{state === "live" ? "Join the line" : roomOpen ? "Enter the waiting room" : "Get ready"}</Link>
              <p className="note">The waiting room opens 15 minutes before the drop. You need a Mystic account to buy.</p>
            </div>
          )}
        </div>
        <div style={{ background: "var(--surface)", padding: 22, display: "grid", gap: 14 }}>
          <h2 style={{ fontSize: 18 }}>Drop rules</h2>
          <ul className="rules">
            <li>Opens at 10:00 Central. Waiting room opens 15 minutes early.</li>
            <li>Limit {d.perCustomerLimit} per style per customer.</li>
            <li>One account per person. Duplicate accounts are cancelled.</li>
            <li>Drop items are final sale.</li>
          </ul>
        </div>
      </section>
      <section className="sec" style={{ paddingTop: 10 }}>
        <div className="sec__head"><h2 className="display">In this drop</h2></div>
        <div className="grid">
          {d.products.map((p) => {
            const soldOut = p.variants.every((v) => v.stock === 0);
            const body = (
              <>
                <div className="card__img">
                  {state === "ended" || soldOut ? <span className="badge badge--dark">Sold out</span> : <span className="badge">Drop {String(d.number).padStart(2, "0")}</span>}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`/img/p/${p.slug}/1.svg`} alt={`${p.name} in ${p.colorway}`} width={800} height={800} loading="lazy" />
                </div>
                <div className="card__meta"><div><b>{p.name}</b><div className="card__cw">{p.colorway}</div></div><b>{money(p.priceCents)}</b></div>
              </>
            );
            return state === "upcoming" ? <div key={p.id} className="card">{body}</div> : <Link key={p.id} href={`/products/${p.slug}`} className="card">{body}</Link>;
          })}
        </div>
      </section>
    </div>
  );
}
