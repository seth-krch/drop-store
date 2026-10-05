import Link from "next/link";
import type { ProductCard as Card } from "@/lib/store";
import { money } from "@/lib/format";

export function Price({ cents, compareAt }: { cents: number; compareAt: number | null }) {
  return compareAt ? (
    <span className="price"><s>{money(compareAt)}</s><b className="sale">{money(cents)}</b></span>
  ) : (
    <span className="price"><b>{money(cents)}</b></span>
  );
}

export function ProductCard({ p, now }: { p: Card; now: Date }) {
  const isNew = now.getTime() - new Date(p.releasedAt).getTime() < 21 * 864e5;
  const badge =
    p.stock === 0 ? <span className="badge badge--dark">Sold out</span>
    : p.compareAtCents ? <span className="badge badge--sale">Sale</span>
    : isNew ? <span className="badge">New</span>
    : p.stock < 12 ? <span className="badge">Low stock</span>
    : null;
  return (
    <Link href={`/products/${p.slug}`} className="card" data-sku={p.id}>
      <div className="card__img">
        {badge}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`/img/p/${p.slug}/1.svg`} alt={`${p.name} in ${p.colorway}`} width={800} height={800} loading="lazy" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`/img/p/${p.slug}/2.svg`} alt="" width={800} height={800} loading="lazy" aria-hidden="true" />
      </div>
      <div className="card__meta">
        <div><b>{p.name}</b><div className="card__cw">{p.colorway}</div></div>
        <Price cents={p.priceCents} compareAt={p.compareAtCents} />
      </div>
    </Link>
  );
}
