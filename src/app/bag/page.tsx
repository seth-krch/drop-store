import type { Metadata } from "next";
import Link from "next/link";
import { currentUser } from "@/lib/auth";
import { FREE_SHIPPING_CENTS, MAX_PER_LINE, getBag } from "@/lib/bag";
import { money } from "@/lib/format";
import { setQuantity } from "./actions";

export const metadata: Metadata = { title: "Bag", robots: { index: false } };

export default async function BagPage() {
  const user = await currentUser();
  const bag = user ? await getBag(user.id) : null;

  if (!bag || bag.items.length === 0) {
    return (
      <div className="wrap">
        <div className="auth" style={{ textAlign: "center" }}>
          <h1 className="display">Your bag</h1>
          <p className="muted">Your bag is empty.</p>
          <Link className="btn" href="/shop">Shop new arrivals</Link>
          {!user && <p className="note">Have an account? <Link href="/account/login?next=/bag" className="u">Sign in</Link> to see your bag.</p>}
        </div>
      </div>
    );
  }

  const toFree = FREE_SHIPPING_CENTS - bag.subtotal;
  return (
    <div className="wrap bag">
      <h1 className="display">Your bag <span className="muted">({bag.count})</span></h1>
      <div className="bag__grid">
        <ul className="lines">
          {bag.items.map((i) => {
            const max = Math.min(i.stock, MAX_PER_LINE, i.drop ? i.drop.perCustomerLimit : MAX_PER_LINE);
            return (
              <li key={i.id} className="line">
                <Link href={`/products/${i.slug}`} className="line__img">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`/img/p/${i.slug}/1.svg`} alt="" width={160} height={160} />
                </Link>
                <div className="line__info">
                  <Link href={`/products/${i.slug}`}><b>{i.name}</b></Link>
                  <span className="muted">{i.colorway}</span>
                  <span className="muted">Size {i.size}</span>
                  {i.drop && <span className="mono line__drop">Drop {String(i.drop.number).padStart(2, "0")} · Final sale</span>}
                  {i.stock === 0 ? <span className="note note--warn">Sold out. Remove this item to check out.</span> : i.quantity > i.stock ? <span className="note note--warn">Only {i.stock} left.</span> : null}
                  <div className="line__acts">
                    <form action={setQuantity} className="qty">
                      <input type="hidden" name="line" value={i.id} />
                      <label className="sr" htmlFor={`q${i.id}`}>Quantity</label>
                      <select id={`q${i.id}`} name="quantity" defaultValue={i.quantity}>
                        {Array.from({ length: Math.max(max, i.quantity, 1) }, (_, n) => <option key={n + 1} value={n + 1}>{n + 1}</option>)}
                      </select>
                      <button className="linkish">Update</button>
                    </form>
                    <form action={setQuantity}>
                      <input type="hidden" name="line" value={i.id} />
                      <input type="hidden" name="quantity" value="0" />
                      <button className="linkish">Remove</button>
                    </form>
                  </div>
                </div>
                <b className="line__price">{money(i.priceCents * i.quantity)}</b>
              </li>
            );
          })}
        </ul>
        <aside className="summary">
          <h2>Summary</h2>
          <dl>
            <div><dt>Subtotal</dt><dd>{money(bag.subtotal)}</dd></div>
            <div><dt>Shipping</dt><dd>{bag.shipping === 0 ? "Free" : money(bag.shipping)}</dd></div>
            <div className="summary__total"><dt>Total</dt><dd>{money(bag.total)}</dd></div>
          </dl>
          {toFree > 0 && <p className="note">Add {money(toFree)} more for free shipping.</p>}
          <Link href="/checkout" className="btn btn--block">Checkout</Link>
        </aside>
      </div>
    </div>
  );
}
