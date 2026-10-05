import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { renderProduct } from "@/lib/art";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: RouteContext<"/img/p/[slug]/[view]">) {
  const { slug, view } = await ctx.params;
  const m = /^([123])\.svg$/.exec(view);
  if (!m) return new Response("Not found", { status: 404 });
  const [p] = await db
    .select({ name: schema.products.name, palette: schema.products.palette })
    .from(schema.products)
    .where(eq(schema.products.slug, slug))
    .limit(1);
  if (!p) return new Response("Not found", { status: 404 });
  return new Response(renderProduct(p.name, p.palette, Number(m[1])), {
    headers: { "Content-Type": "image/svg+xml", "Cache-Control": "public, max-age=86400" },
  });
}
