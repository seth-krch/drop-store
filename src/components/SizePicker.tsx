"use client";

import { useState } from "react";
import Link from "next/link";

type Size = { size: string; stock: number };

export function SizePicker({ sizes, slug }: { sizes: Size[]; slug: string }) {
  const oneSize = sizes.length === 1;
  const [sel, setSel] = useState<string | null>(oneSize ? sizes[0].size : null);
  const [tried, setTried] = useState(false);
  const chosen = sizes.find((s) => s.size === sel);
  const allOut = sizes.every((s) => s.stock === 0);

  return (
    <div style={{ display: "grid", gap: 14 }}>
      {!oneSize && (
        <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
          <legend style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Select size{sel ? `: ${sel}` : ""}</legend>
          <div className="size-grid">
            {sizes.map((s) => (
              <button key={s.size} type="button" disabled={s.stock === 0} aria-pressed={sel === s.size} onClick={() => { setSel(s.size); setTried(false); }}>
                {s.size}
              </button>
            ))}
          </div>
        </fieldset>
      )}
      {chosen && chosen.stock > 0 && chosen.stock <= 3 && <p className="note note--warn">Only {chosen.stock} left in {chosen.size}</p>}
      {allOut ? (
        <button className="btn btn--block" disabled>Sold out</button>
      ) : (
        <button
          className="btn btn--block"
          type="button"
          onClick={() => setTried(true)}
          aria-describedby="buy-note"
        >
          Add to bag
        </button>
      )}
      <p id="buy-note" className="note" role="status">
        {tried && !sel ? "Choose a size first." : tried ? <>Sign in to add items to your bag. <Link href={`/account/login?next=/products/${slug}`} style={{ textDecoration: "underline" }}>Sign in</Link></> : "Free shipping over $150. Free returns within 30 days."}
      </p>
    </div>
  );
}
