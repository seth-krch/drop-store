import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getDrop } from "@/lib/store";
import { requireUser } from "@/lib/auth";
import { queueStatus } from "@/lib/queue";
import { ROOM_OPENS_MIN, waitSeconds } from "@/lib/queue-math";
import { dropTime, money } from "@/lib/format";
import { Countdown } from "@/components/Countdown";
import { AutoRefresh } from "@/components/AutoRefresh";
import { join, rejoin } from "./actions";

export const metadata: Metadata = { title: "Waiting room", robots: { index: false } };

function minutes(s: number) {
  if (s < 60) return "less than a minute";
  const m = Math.round(s / 60);
  return `about ${m} minute${m === 1 ? "" : "s"}`;
}

export default async function Queue({ params }: PageProps<"/drops/[slug]/queue">) {
  const { slug } = await params;
  const user = await requireUser(`/drops/${slug}/queue`);
  const drop = await getDrop(slug);
  if (!drop) notFound();
  const now = new Date();
  const status = await queueStatus(drop, user.id, now);
  const label = `Drop ${String(drop.number).padStart(2, "0")} · ${drop.name}`;
  const roomOpens = new Date(drop.startsAt.getTime() - ROOM_OPENS_MIN * 60_000);

  let body: React.ReactNode;
  switch (status.state) {
    case "closed":
      body = (
        <>
          <h1 className="display">Not open yet</h1>
          <p className="muted">The waiting room opens at {dropTime(roomOpens)}, 15 minutes before the drop.</p>
          <Countdown key={roomOpens.toISOString()} to={roomOpens.toISOString()} serverNow={now.getTime()} done="Opening" label="Time until the waiting room opens" />
          <AutoRefresh seconds={Math.min(300, Math.max(5, (roomOpens.getTime() - now.getTime()) / 1000))} />
        </>
      );
      break;
    case "ended":
      body = (
        <>
          <h1 className="display">This drop has ended</h1>
          <p className="muted">Thanks for lining up. Sign up for emails to hear about the next one.</p>
          <Link href="/drops" className="btn">See all drops</Link>
        </>
      );
      break;
    case "not-joined":
      body = (
        <>
          <h1 className="display">{drop.startsAt > now ? "Waiting room" : "Join the line"}</h1>
          <p className="muted">
            {drop.startsAt > now
              ? "Everyone in the waiting room when the drop starts gets a random place in line. Arriving earlier doesn't put you further ahead."
              : "The drop is live. You'll join the back of the line."}
          </p>
          <form action={join}><input type="hidden" name="drop" value={drop.slug} /><button className="btn btn--block">{drop.startsAt > now ? "Enter the waiting room" : "Join the line"}</button></form>
        </>
      );
      break;
    case "room":
      body = (
        <>
          <h1 className="display">You&rsquo;re in</h1>
          <p className="muted">When the drop starts you&rsquo;ll be given a random place in line. Keep this page open; it updates on its own.</p>
          <Countdown key={drop.startsAt.toISOString()} to={drop.startsAt.toISOString()} serverNow={now.getTime()} />
          <AutoRefresh seconds={Math.min(15, Math.max(2, (drop.startsAt.getTime() - now.getTime()) / 1000))} />
        </>
      );
      break;
    case "waiting": {
      const wait = waitSeconds(status.entry.position!, drop.startsAt, now);
      body = (
        <>
          <h1 className="display">You&rsquo;re in line</h1>
          <div className="qpos"><b>{status.ahead.toLocaleString("en-US")}</b><span>{status.ahead === 1 ? "person" : "people"} ahead of you</span></div>
          <p className="muted">Estimated wait: {minutes(wait)}. Don&rsquo;t refresh or you may lose your place.</p>
          <AutoRefresh seconds={Math.min(10, Math.max(2, wait))} />
        </>
      );
      break;
    }
    case "admitted":
      body = (
        <>
          <h1 className="display">It&rsquo;s your turn</h1>
          <p className="muted">You have until {status.passExpiresAt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "America/Chicago" })} CT to check out. Limit {drop.perCustomerLimit} per style.</p>
          <Countdown key={status.passExpiresAt.toISOString()} to={status.passExpiresAt.toISOString()} serverNow={now.getTime()} done="Time's up" label="Time left to check out" />
          <ul className="mini">
            {drop.products.map((p) => {
              const out = p.variants.every((v) => v.stock === 0);
              return (
                <li key={p.id}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`/img/p/${p.slug}/1.svg`} alt="" width={64} height={64} />
                  <span><Link href={`/products/${p.slug}`} className="u"><b>{p.name}</b></Link><small>{p.colorway}{out ? " · Sold out" : ""}</small></span>
                  <span>{money(p.priceCents)}</span>
                </li>
              );
            })}
          </ul>
          <Link href="/bag" className="btn btn--ghost btn--block">Go to bag</Link>
        </>
      );
      break;
    case "expired":
      body = (
        <>
          <h1 className="display">Time&rsquo;s up</h1>
          <p className="muted">Your shopping window for this drop has ended.</p>
          <form action={rejoin}><input type="hidden" name="drop" value={drop.slug} /><button className="btn btn--block">Rejoin the line</button></form>
        </>
      );
      break;
  }

  return (
    <div className="wrap">
      <div className="auth queue">
        <p className="mono" style={{ color: "var(--accent)", margin: 0 }}>{label}</p>
        {body}
        <p className="note auth__alt"><Link href={`/drops/${drop.slug}`} className="u">Drop details</Link> · Opens {dropTime(drop.startsAt)}</p>
      </div>
    </div>
  );
}
