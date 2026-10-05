import type { MetadataRoute } from "next";
import { CATEGORIES, sitemapEntries } from "@/lib/store";
import { SITE } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { ps, ds, js } = await sitemapEntries();
  const u = (p: string) => `${SITE.url}${p}`;
  return [
    { url: u("/"), changeFrequency: "daily", priority: 1 },
    { url: u("/shop"), changeFrequency: "daily", priority: 0.9 },
    ...CATEGORIES.map((c) => ({ url: u(`/shop/${c.slug}`), changeFrequency: "daily" as const, priority: 0.8 })),
    { url: u("/drops"), changeFrequency: "daily", priority: 0.8 },
    ...ds.map((d) => ({ url: u(`/drops/${d.slug}`), lastModified: d.startsAt, priority: 0.7 })),
    ...ps.map((p) => ({ url: u(`/products/${p.slug}`), lastModified: p.releasedAt, priority: 0.6 })),
    { url: u("/journal"), changeFrequency: "weekly", priority: 0.5 },
    ...js.map((j) => ({ url: u(`/journal/${j.slug}`), lastModified: j.publishedAt, priority: 0.4 })),
    ...["/help", "/about", "/terms", "/privacy"].map((p) => ({ url: u(p), priority: 0.3 })),
  ];
}
