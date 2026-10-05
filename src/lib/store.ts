import "server-only";
import { and, asc, desc, eq, gt, ilike, inArray, isNull, lte, or, sql, type SQL } from "drizzle-orm";
import { db, schema } from "@/db";
import type { Category } from "@/db/schema";

const { products, variants, drops, posts } = schema;

export const CATEGORIES: { slug: Category; label: string }[] = [
  { slug: "footwear", label: "Footwear" },
  { slug: "tops", label: "Tops" },
  { slug: "outerwear", label: "Outerwear" },
  { slug: "bottoms", label: "Bottoms" },
  { slug: "accessories", label: "Accessories" },
];

export const SORTS = {
  newest: { label: "Newest", order: [desc(products.releasedAt), asc(products.id)] },
  "price-asc": { label: "Price: low to high", order: [asc(products.priceCents), asc(products.id)] },
  "price-desc": { label: "Price: high to low", order: [desc(products.priceCents), asc(products.id)] },
  name: { label: "Name", order: [asc(products.name), asc(products.colorway)] },
} as const;
export type SortKey = keyof typeof SORTS;

export const PAGE_SIZE = 24;

export type ListFilters = {
  category?: Category;
  q?: string;
  size?: string;
  sale?: boolean;
  sort?: SortKey;
  page?: number;
};

// Products in a drop that hasn't started yet stay out of the catalog.
const visible = (now: Date) =>
  or(isNull(products.dropId), inArray(products.dropId, db.select({ id: drops.id }).from(drops).where(lte(drops.startsAt, now))));

function where(f: ListFilters, now: Date) {
  const parts: (SQL | undefined)[] = [visible(now)];
  if (f.category) parts.push(eq(products.category, f.category));
  if (f.sale) parts.push(sql`${products.compareAtCents} is not null`);
  if (f.q) {
    const like = `%${f.q.replace(/[%_]/g, "")}%`;
    parts.push(or(ilike(products.name, like), ilike(products.colorway, like), ilike(products.category, like), ilike(products.sku, like)));
  }
  if (f.size) {
    parts.push(
      inArray(
        products.id,
        db.select({ id: variants.productId }).from(variants).where(and(eq(variants.size, f.size), gt(variants.stock, 0))),
      ),
    );
  }
  return and(...parts);
}

// Qualified by hand: inside a single-table select Drizzle drops the table prefix,
// which would make "id" resolve to variants.id inside the subquery.
const stockExpr = sql<number>`coalesce((select sum(v.stock) from variants v where v.product_id = "products"."id"), 0)`.mapWith(Number);

const cardFields = {
  id: products.id,
  slug: products.slug,
  name: products.name,
  colorway: products.colorway,
  category: products.category,
  palette: products.palette,
  priceCents: products.priceCents,
  compareAtCents: products.compareAtCents,
  releasedAt: products.releasedAt,
  stock: stockExpr,
};

export type ProductCard = Awaited<ReturnType<typeof listProducts>>["items"][number];

export async function listProducts(f: ListFilters, now = new Date()) {
  const page = Math.max(1, Math.min(f.page ?? 1, 500));
  const w = where(f, now);
  const [items, [{ total }]] = await Promise.all([
    db
      .select(cardFields)
      .from(products)
      .where(w)
      .orderBy(...SORTS[f.sort ?? "newest"].order)
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),
    db.select({ total: sql<number>`count(*)`.mapWith(Number) }).from(products).where(w),
  ]);
  return { items, total, page, pages: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}

export async function getProduct(slug: string, now = new Date()) {
  const p = await db.query.products.findFirst({
    where: eq(products.slug, slug),
    with: { variants: { orderBy: asc(variants.position) }, drop: true },
  });
  if (!p) return null;
  if (p.drop && p.drop.startsAt > now) return null;
  return p;
}

export async function relatedProducts(category: Category, excludeId: number, now = new Date()) {
  return db
    .select(cardFields)
    .from(products)
    .where(and(eq(products.category, category), sql`${products.id} <> ${excludeId}`, visible(now)))
    .orderBy(desc(products.releasedAt))
    .limit(4);
}

export async function sizesFor(category?: Category) {
  const rows = await db
    .selectDistinct({ size: variants.size, position: variants.position })
    .from(variants)
    .innerJoin(products, eq(products.id, variants.productId))
    .where(category ? eq(products.category, category) : undefined)
    .orderBy(asc(variants.position));
  return [...new Set(rows.map((r) => r.size))];
}

export async function listDrops() {
  const rows = await db.query.drops.findMany({ orderBy: desc(drops.startsAt), with: { products: true } });
  return rows;
}

export async function getDrop(slug: string) {
  return db.query.drops.findFirst({
    where: eq(drops.slug, slug),
    with: { products: { with: { variants: true } } },
  });
}

export async function nextDrop(now = new Date()) {
  return db.query.drops.findFirst({
    where: gt(drops.endsAt, now),
    orderBy: asc(drops.startsAt),
    with: { products: true },
  });
}

export async function listPosts() {
  return db.select().from(posts).orderBy(desc(posts.publishedAt));
}

export async function getPost(slug: string) {
  return db.query.posts.findFirst({ where: eq(posts.slug, slug) });
}

export async function sitemapEntries(now = new Date()) {
  const [ps, ds, js] = await Promise.all([
    db.select({ slug: products.slug, releasedAt: products.releasedAt }).from(products).where(visible(now)),
    db.select({ slug: drops.slug, startsAt: drops.startsAt }).from(drops).where(lte(drops.startsAt, new Date(now.getTime() + 30 * 864e5))),
    db.select({ slug: posts.slug, publishedAt: posts.publishedAt }).from(posts),
  ]);
  return { ps, ds, js };
}
