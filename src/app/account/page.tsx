import type { Metadata } from "next";
import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireUser } from "@/lib/auth";
import { money, shortDate } from "@/lib/format";
import { logout } from "./actions";

export const metadata: Metadata = { title: "Account", robots: { index: false } };

export default async function Account() {
  const user = await requireUser("/account");
  const orders = await db.query.orders.findMany({
    where: eq(schema.orders.userId, user.id),
    orderBy: desc(schema.orders.createdAt),
    with: { items: true },
  });
  return (
    <div className="wrap account">
      <div className="account__head">
        <div>
          <p className="eyebrow">Account</p>
          <h1 className="display">Hi, {user.name}</h1>
          <p className="muted">{user.email}</p>
        </div>
        <form action={logout}><button className="btn btn--ghost">Sign out</button></form>
      </div>

      <section>
        <h2 className="section-title">Orders</h2>
        {orders.length === 0 ? (
          <div className="empty">
            <p>You haven&rsquo;t placed any orders yet.</p>
            <Link href="/shop" className="btn">Start shopping</Link>
          </div>
        ) : (
          <ul className="orders">
            {orders.map((o) => (
              <li key={o.id}>
                <Link href={`/account/orders/${o.number}`} className="order-row">
                  <span><strong>#{o.number}</strong><small>{shortDate(o.createdAt)}</small></span>
                  <span>{o.items.reduce((n, i) => n + i.quantity, 0)} item{o.items.reduce((n, i) => n + i.quantity, 0) === 1 ? "" : "s"}</span>
                  <span className="pill pill--done">{o.status === "paid" ? "Processing" : "Cancelled"}</span>
                  <span>{money(o.totalCents)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
