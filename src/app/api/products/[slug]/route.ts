import { NextResponse } from "next/server";
import { getProduct } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: RouteContext<"/api/products/[slug]">) {
  const { slug } = await ctx.params;
  const p = await getProduct(slug);
  if (!p) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json(
    {
      id: p.id,
      slug: p.slug,
      sku: p.sku,
      name: p.name,
      colorway: p.colorway,
      category: p.category,
      description: p.description,
      price: { amount: p.priceCents, compareAt: p.compareAtCents, currency: "USD" },
      variants: p.variants.map((v) => ({ size: v.size, available: v.stock > 0 })),
      drop: p.drop ? { slug: p.drop.slug, number: p.drop.number, name: p.drop.name } : null,
      images: [1, 2, 3].map((v) => `/img/p/${p.slug}/${v}.svg`),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
