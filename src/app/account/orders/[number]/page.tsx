import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireUser } from "@/lib/auth";
import { money, shortDate } from "@/lib/format";

export const metadata: Metadata = { title: "Order", robots: { index: false } };

export default async function OrderPage({ params, searchParams }: PageProps<"/account/orders/[number]">) {
  const { number } = await params;
  const user = await requireUser(`/account/orders/${number}`);
  const placed = (await searchParams).placed === "1";
  const order = await db.query.orders.findFirst({
    where: and(eq(schema.orders.number, number), eq(schema.orders.userId, user.id)),
    with: { items: { with: { product: { columns: { slug: true } } } } },
  });
  if (!order) notFound();
  const a = order.shippingAddress;
  return (
    <div className="wrap account">
      <nav className="crumbs" aria-label="Breadcrumb"><Link href="/account">Account</Link> / <span>Order #{order.number}</span></nav>
      {placed && <p className="banner" role="status">Thanks, {user.name}. Your order is confirmed.</p>}
      <div className="account__head">
        <div>
          <p className="eyebrow">Placed {shortDate(order.createdAt)}</p>
          <h1 className="display">Order #{order.number}</h1>
        </div>
        <span className="pill pill--done">{order.status === "paid" ? "Processing" : "Cancelled"}</span>
      </div>
      <div className="bag__grid">
        <ul className="lines">
          {order.items.map((i) => (
            <li key={i.id} className="line">
              <Link href={`/products/${i.product.slug}`} className="line__img">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/img/p/${i.product.slug}/1.svg`} alt="" width={160} height={160} />
              </Link>
              <div className="line__info">
                <b>{i.name}</b>
                <span className="muted">{i.colorway}</span>
                <span className="muted">Size {i.size} · Qty {i.quantity}</span>
              </div>
              <b className="line__price">{money(i.unitCents * i.quantity)}</b>
            </li>
          ))}
        </ul>
        <aside className="summary">
          <h2>Summary</h2>
          <dl>
            <div><dt>Subtotal</dt><dd>{money(order.subtotalCents)}</dd></div>
            <div><dt>Shipping</dt><dd>{order.shippingCents === 0 ? "Free" : money(order.shippingCents)}</dd></div>
            <div className="summary__total"><dt>Total</dt><dd>{money(order.totalCents)}</dd></div>
          </dl>
          <h2>Ship to</h2>
          <address className="muted" style={{ fontStyle: "normal", fontSize: 14 }}>
            {a.name}<br />{a.line1}{a.line2 ? <>, {a.line2}</> : null}<br />{a.city}, {a.region} {a.postal}
          </address>
          <p className="note">Paid with card ending {order.cardLast4}</p>
        </aside>
      </div>
    </div>
  );
}
