import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getBag } from "@/lib/bag";
import { money } from "@/lib/format";
import { CheckoutForm } from "./CheckoutForm";

export const metadata: Metadata = { title: "Checkout", robots: { index: false } };

export default async function Checkout() {
  const user = await requireUser("/checkout");
  const bag = await getBag(user.id);
  if (bag.items.length === 0) redirect("/bag");
  return (
    <div className="wrap bag">
      <nav className="crumbs" aria-label="Breadcrumb"><Link href="/bag">Bag</Link> / <span>Checkout</span></nav>
      <h1 className="display">Checkout</h1>
      <div className="bag__grid">
        <CheckoutForm email={user.email} name={user.name} />
        <aside className="summary">
          <h2>Order summary</h2>
          <ul className="mini">
            {bag.items.map((i) => (
              <li key={i.id}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/img/p/${i.slug}/1.svg`} alt="" width={64} height={64} />
                <span><b>{i.name}</b><small>{i.colorway} · {i.size}{i.quantity > 1 ? ` · ×${i.quantity}` : ""}</small></span>
                <span>{money(i.priceCents * i.quantity)}</span>
              </li>
            ))}
          </ul>
          <dl>
            <div><dt>Subtotal</dt><dd>{money(bag.subtotal)}</dd></div>
            <div><dt>Shipping</dt><dd>{bag.shipping === 0 ? "Free" : money(bag.shipping)}</dd></div>
            <div className="summary__total"><dt>Total</dt><dd>{money(bag.total)}</dd></div>
          </dl>
        </aside>
      </div>
    </div>
  );
}
