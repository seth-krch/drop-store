import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getProduct, relatedProducts } from "@/lib/store";
import { CATEGORY_LABEL, SITE, money } from "@/lib/format";
import { Price, ProductCard } from "@/components/ProductCard";
import { SizePicker } from "@/components/SizePicker";

export async function generateMetadata({ params }: PageProps<"/products/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const p = await getProduct(slug);
  if (!p) return {};
  const title = `${p.name} · ${p.colorway}`;
  return {
    title,
    description: p.description,
    alternates: { canonical: `/products/${p.slug}` },
    openGraph: { title, description: p.description, images: [`/img/p/${p.slug}/1.svg`] },
  };
}

export default async function ProductPage({ params }: PageProps<"/products/[slug]">) {
  const { slug } = await params;
  const now = new Date();
  const p = await getProduct(slug, now);
  if (!p) notFound();
  const related = await relatedProducts(p.category, p.id, now);
  const inStock = p.variants.some((v) => v.stock > 0);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: `${p.name} ${p.colorway}`,
    sku: p.sku,
    brand: { "@type": "Brand", name: "Mystic" },
    image: [1, 2, 3].map((v) => `${SITE.url}/img/p/${p.slug}/${v}.svg`),
    description: p.description,
    offers: {
      "@type": "Offer",
      url: `${SITE.url}/products/${p.slug}`,
      priceCurrency: "USD",
      price: (p.priceCents / 100).toFixed(2),
      availability: inStock ? "https://schema.org/InStock" : "https://schema.org/SoldOut",
    },
  };

  return (
    <div className="wrap">
      <nav className="crumbs" aria-label="Breadcrumb">
        <Link href="/">Home</Link> / <Link href={`/shop/${p.category}`}>{CATEGORY_LABEL[p.category]}</Link> / <span>{p.name}</span>
      </nav>
      <div className="pdp">
        <div className="gallery">
          {[1, 2, 3].map((v) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={v} src={`/img/p/${p.slug}/${v}.svg`} alt={v === 1 ? `${p.name} in ${p.colorway}` : ""} width={800} height={800} />
          ))}
        </div>
        <div className="buy">
          <div>
            {p.drop && <p className="mono" style={{ color: "var(--accent)", margin: "0 0 8px" }}>Drop {String(p.drop.number).padStart(2, "0")} · {p.drop.name}</p>}
            <h1>{p.name}</h1>
            <p className="muted" style={{ margin: "4px 0 10px" }}>{p.colorway}</p>
            <Price cents={p.priceCents} compareAt={p.compareAtCents} />
          </div>
          <SizePicker slug={p.slug} sizes={p.variants.map((v) => ({ size: v.size, stock: v.stock }))} />
          <div className="acc">
            <details open><summary>Description</summary><p>{p.description}</p></details>
            <details><summary>Details</summary><ul>{p.details.map((d) => <li key={d}>{d}</li>)}<li>Style: {p.sku}</li></ul></details>
            <details><summary>Shipping &amp; returns</summary><p>Free standard shipping on orders over {money(15000)}. Free returns within 30 days, except drop items, which are final sale.</p></details>
          </div>
        </div>
      </div>
      {related.length > 0 && (
        <section className="sec" style={{ paddingTop: 0 }}>
          <div className="sec__head"><h2 className="display">You may also like</h2></div>
          <div className="grid">{related.map((r) => <ProductCard key={r.id} p={r} now={now} />)}</div>
        </section>
      )}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
    </div>
  );
}
