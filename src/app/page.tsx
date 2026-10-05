import Link from "next/link";
import { Countdown } from "@/components/Countdown";
import { ProductCard } from "@/components/ProductCard";
import { CATEGORIES, listPosts, listProducts, nextDrop } from "@/lib/store";
import { dropTime, shortDate } from "@/lib/format";
import { db, schema } from "@/db";
import { eq } from "drizzle-orm";
import type { Category } from "@/db/schema";

async function tileProduct(category: Category) {
  const [p] = await db.select({ slug: schema.products.slug }).from(schema.products).where(eq(schema.products.category, category)).limit(1);
  return p?.slug;
}

export default async function Home() {
  const now = new Date();
  const [drop, fresh, posts, tiles] = await Promise.all([
    nextDrop(now),
    listProducts({ sort: "newest" }, now),
    listPosts(),
    Promise.all(CATEGORIES.map(async (c) => ({ ...c, slug2: await tileProduct(c.slug) }))),
  ]);
  const hero = drop?.products.find((p) => p.category === "footwear") ?? drop?.products[0];
  const live = drop && drop.startsAt <= now;

  return (
    <>
      {drop && hero && (
        <section className="hero">
          <div className="hero__copy">
            <div>
              <p className="mono">Drop {String(drop.number).padStart(2, "0")} · {live ? "Live now" : dropTime(drop.startsAt)}</p>
              <h1 className="display" style={{ marginTop: 14 }}>{drop.name}</h1>
            </div>
            <p>{drop.description}</p>
            <div style={{ display: "grid", gap: 18 }}>
              {!live && <Countdown to={drop.startsAt.toISOString()} serverNow={now.getTime()} />}
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <Link className="btn" href={`/drops/${drop.slug}`}>{live ? "Shop the drop" : "View the drop"}</Link>
                <Link className="btn btn--ghost" href="/journal/how-our-drops-work">How drops work</Link>
              </div>
            </div>
          </div>
          <div className="hero__art">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/img/p/${hero.slug}/1.svg`} alt={`${hero.name} in ${hero.colorway}`} width={800} height={800} />
            <span className="hero__tag">{hero.name} · {hero.colorway}</span>
          </div>
        </section>
      )}

      <section className="sec wrap">
        <div className="sec__head">
          <h2 className="display">New arrivals</h2>
          <Link className="link" href="/shop?sort=newest">Shop all</Link>
        </div>
        <div className="grid">
          {fresh.items.slice(0, 8).map((p) => <ProductCard key={p.id} p={p} now={now} />)}
        </div>
      </section>

      <section className="sec wrap" style={{ paddingTop: 0 }}>
        <div className="sec__head"><h2 className="display">Shop by category</h2></div>
        <div className="tiles">
          {tiles.map((t) => (
            <Link key={t.slug} href={`/shop/${t.slug}`} className="tile">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {t.slug2 && <img src={`/img/p/${t.slug2}/3.svg`} alt="" width={800} height={800} loading="lazy" />}
              <span>{t.label}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="sec wrap" style={{ paddingTop: 0 }}>
        <div className="sec__head">
          <h2 className="display">Journal</h2>
          <Link className="link" href="/journal">All stories</Link>
        </div>
        <div className="posts">
          {posts.slice(0, 2).map((p) => (
            <Link key={p.slug} href={`/journal/${p.slug}`} className="post-card">
              <div className="cover" style={{ background: p.tone }}><span className="display" style={{ fontSize: 40 }}>✦</span></div>
              <span className="mono muted">{shortDate(p.publishedAt)}</span>
              <h3>{p.title}</h3>
              <p className="muted" style={{ margin: 0 }}>{p.excerpt}</p>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
