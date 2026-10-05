"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Hit = { slug: string; name: string; colorway: string; price: string };

export function SearchBox() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [open, setOpen] = useState(false);
  const [sel, setSel] = useState(-1);
  const box = useRef<HTMLDivElement>(null);
  const shown = q.trim().length < 2 ? [] : hits;

  useEffect(() => {
    if (q.trim().length < 2) return;
    const ctl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/products?q=${encodeURIComponent(q.trim())}&limit=6`, { signal: ctl.signal });
        if (!res.ok) return;
        const data = await res.json();
        setHits(data.items.map((p: { slug: string; name: string; colorway: string; price: { formatted: string } }) => ({ slug: p.slug, name: p.name, colorway: p.colorway, price: p.price.formatted })));
        setSel(-1);
      } catch {}
    }, 160);
    return () => { clearTimeout(t); ctl.abort(); };
  }, [q]);

  useEffect(() => {
    const close = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  return (
    <div className="search" ref={box}>
      <form
        action="/search"
        role="search"
        onSubmit={(e) => {
          if (sel >= 0 && shown[sel]) { e.preventDefault(); router.push(`/products/${shown[sel].slug}`); setOpen(false); }
        }}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true"><g fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" /></g></svg>
        <label className="sr" htmlFor="site-search">Search</label>
        <input
          id="site-search"
          name="q"
          type="search"
          placeholder="Search"
          autoComplete="off"
          value={q}
          onChange={(e) => { setQ(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") { e.preventDefault(); setSel((s) => Math.min(s + 1, shown.length - 1)); }
            if (e.key === "ArrowUp") { e.preventDefault(); setSel((s) => Math.max(s - 1, -1)); }
            if (e.key === "Escape") setOpen(false);
          }}
          role="combobox"
          aria-expanded={open && shown.length > 0}
          aria-controls="search-suggest"
        />
      </form>
      {open && shown.length > 0 && (
        <div className="suggest" id="search-suggest" role="listbox">
          {shown.map((h, i) => (
            <a key={h.slug} href={`/products/${h.slug}`} role="option" aria-selected={i === sel}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/img/p/${h.slug}/1.svg`} alt="" width={48} height={48} />
              <span>{h.name}<small>{h.colorway}</small></span>
              <span>{h.price}</span>
            </a>
          ))}
          <a className="all" href={`/search?q=${encodeURIComponent(q)}`}>See all results</a>
        </div>
      )}
    </div>
  );
}
