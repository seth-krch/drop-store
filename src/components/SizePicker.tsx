"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { addToBag, type AddState } from "@/app/bag/actions";

type Size = { id: number; size: string; stock: number };

export function SizePicker({ sizes, slug }: { sizes: Size[]; slug: string }) {
  const oneSize = sizes.length === 1;
  const [sel, setSel] = useState<number | null>(oneSize ? sizes[0].id : null);
  const [tried, setTried] = useState(false);
  const [state, action, pending] = useActionState<AddState, FormData>(addToBag, null);
  const chosen = sizes.find((s) => s.id === sel);
  const allOut = sizes.every((s) => s.stock === 0);

  let note: React.ReactNode = "Free shipping over $150. Free returns within 30 days.";
  if (tried && !sel) note = "Choose a size first.";
  else if (state?.needsLogin) note = <>Sign in to add items to your bag. <Link href={`/account/login?next=/products/${slug}`} className="u">Sign in</Link></>;
  else if (state?.queue) note = <>{state.error} <Link href={state.queue} className="u">Go to the line</Link></>;
  else if (state?.error) note = state.error;
  else if (state?.ok) note = <>Added to your bag. <Link href="/bag" className="u">View bag</Link></>;

  return (
    <form
      action={action}
      onSubmit={(e) => {
        setTried(true);
        if (!sel) e.preventDefault();
      }}
      style={{ display: "grid", gap: 14 }}
    >
      <input type="hidden" name="variantId" value={sel ?? ""} />
      {!oneSize && (
        <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
          <legend style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Select size{chosen ? `: ${chosen.size}` : ""}</legend>
          <div className="size-grid">
            {sizes.map((s) => (
              <button key={s.id} type="button" disabled={s.stock === 0} aria-pressed={sel === s.id} onClick={() => { setSel(s.id); setTried(false); }}>
                {s.size}
              </button>
            ))}
          </div>
        </fieldset>
      )}
      {chosen && chosen.stock > 0 && chosen.stock <= 3 && <p className="note note--warn">Only {chosen.stock} left in {chosen.size}</p>}
      {allOut ? (
        <button className="btn btn--block" type="button" disabled>Sold out</button>
      ) : (
        <button className="btn btn--block" type="submit" disabled={pending} aria-describedby="buy-note">
          {pending ? "Adding…" : "Add to bag"}
        </button>
      )}
      <p id="buy-note" className={state?.error && !state.queue ? "note note--warn" : "note"} role="status">{note}</p>
    </form>
  );
}
