import Link from "next/link";
import { ProductCard } from "./ProductCard";
import { CATEGORIES, SORTS, listProducts, sizesFor, type ListFilters, type SortKey } from "@/lib/store";
import type { Category } from "@/db/schema";

type Search = Record<string, string | string[] | undefined>;

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export function parseFilters(sp: Search, category?: Category): ListFilters {
  const sort = one(sp.sort);
  const page = Number(one(sp.page) ?? 1);
  return {
    category,
    q: one(sp.q)?.slice(0, 80) || undefined,
    size: one(sp.size)?.slice(0, 8) || undefined,
    sale: one(sp.sale) === "1",
    sort: sort && sort in SORTS ? (sort as SortKey) : "newest",
    page: Number.isFinite(page) && page > 0 ? Math.floor(page) : 1,
  };
}

function href(base: string, f: ListFilters, patch: Partial<ListFilters>) {
  const next = { ...f, ...patch };
  const qs = new URLSearchParams();
  if (next.q) qs.set("q", next.q);
  if (next.size) qs.set("size", next.size);
  if (next.sale) qs.set("sale", "1");
  if (next.sort && next.sort !== "newest") qs.set("sort", next.sort);
  if (next.page && next.page > 1) qs.set("page", String(next.page));
  const s = qs.toString();
  return s ? `${base}?${s}` : base;
}

export async function ShopView({ title, base, filters }: { title: string; base: string; filters: ListFilters }) {
  const now = new Date();
  const [res, sizes] = await Promise.all([listProducts(filters, now), sizesFor(filters.category)]);

  return (
    <div className="wrap">
      <nav className="crumbs" aria-label="Breadcrumb">
        <Link href="/">Home</Link> / <Link href="/shop">Shop</Link>
        {filters.category && <> / <span>{title}</span></>}
      </nav>
      <div className="shop__title">
        <h1 className="display">{title}</h1>
        <form className="sort" action={base}>
          {filters.q && <input type="hidden" name="q" value={filters.q} />}
          {filters.size && <input type="hidden" name="size" value={filters.size} />}
          {filters.sale && <input type="hidden" name="sale" value="1" />}
          <span className="muted">{res.total} {res.total === 1 ? "item" : "items"}</span>
          <label htmlFor="sort">Sort</label>
          <select id="sort" name="sort" defaultValue={filters.sort}>
            {Object.entries(SORTS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <button className="btn btn--ghost" style={{ height: 38, padding: "0 14px" }} type="submit">Apply</button>
        </form>
      </div>
      <div className="shop">
        <aside className="filters" aria-label="Filters">
          <div>
            <h3>Category</h3>
            <ul>
              <li><Link href={href("/shop", filters, { category: undefined, page: 1, size: undefined })} aria-current={!filters.category}>All</Link></li>
              {CATEGORIES.map((c) => (
                <li key={c.slug}><Link href={href(`/shop/${c.slug}`, filters, { page: 1, size: undefined })} aria-current={filters.category === c.slug}>{c.label}</Link></li>
              ))}
            </ul>
          </div>
          <div>
            <h3>Size</h3>
            <div className="sizes">
              {sizes.map((s) => (
                <Link key={s} href={href(base, filters, { size: filters.size === s ? undefined : s, page: 1 })} aria-current={filters.size === s}>{s}</Link>
              ))}
            </div>
          </div>
          <div>
            <h3>Offers</h3>
            <ul><li><Link href={href(base, filters, { sale: !filters.sale, page: 1 })} aria-current={!!filters.sale}>On sale</Link></li></ul>
          </div>
        </aside>
        <section aria-label="Products">
          {res.items.length === 0 ? (
            <p className="empty">Nothing matches those filters. <Link className="link" href="/shop">Clear filters</Link></p>
          ) : (
            <div className="grid">{res.items.map((p) => <ProductCard key={p.id} p={p} now={now} />)}</div>
          )}
          {res.pages > 1 && (
            <nav className="pager" aria-label="Pagination">
              {Array.from({ length: res.pages }, (_, i) => i + 1).map((n) =>
                n === res.page ? <span key={n} aria-current="page">{n}</span> : <Link key={n} href={href(base, filters, { page: n })}>{n}</Link>,
              )}
            </nav>
          )}
        </section>
      </div>
    </div>
  );
}
