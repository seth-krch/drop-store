import { NextResponse, type NextRequest } from "next/server";
import { listProducts, SORTS, type SortKey } from "@/lib/store";
import { CATEGORY_LABEL, money } from "@/lib/format";
import type { Category } from "@/db/schema";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const category = sp.get("category");
  const sort = sp.get("sort");
  const limit = Math.min(48, Math.max(1, Number(sp.get("limit") ?? 24) || 24));
  const res = await listProducts({
    category: category && category in CATEGORY_LABEL ? (category as Category) : undefined,
    q: sp.get("q")?.slice(0, 80) || undefined,
    size: sp.get("size")?.slice(0, 8) || undefined,
    sale: sp.get("sale") === "1",
    sort: sort && sort in SORTS ? (sort as SortKey) : "newest",
    page: Number(sp.get("page") ?? 1) || 1,
  });
  return NextResponse.json(
    {
      items: res.items.slice(0, limit).map((p) => ({
        id: p.id,
        slug: p.slug,
        name: p.name,
        colorway: p.colorway,
        category: p.category,
        price: { amount: p.priceCents, compareAt: p.compareAtCents, currency: "USD", formatted: money(p.priceCents) },
        available: p.stock > 0,
        image: `/img/p/${p.slug}/1.svg`,
        url: `/products/${p.slug}`,
      })),
      page: res.page,
      pages: res.pages,
      total: res.total,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
