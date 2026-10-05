import { describe, expect, it } from "vitest";
import { buildCatalog } from "../src/db/catalog";

const now = new Date("2026-10-05T12:00:00Z");

describe("catalog seed", () => {
  const c = buildCatalog(now);

  it("is deterministic", () => {
    expect(JSON.stringify(buildCatalog(now))).toBe(JSON.stringify(c));
  });

  it("has unique product slugs and SKUs", () => {
    expect(new Set(c.products.map((p) => p.slug)).size).toBe(c.products.length);
    expect(new Set(c.products.map((p) => p.sku)).size).toBe(c.products.length);
  });

  it("has exactly one upcoming drop, and it has stock held for it", () => {
    const upcoming = c.drops.filter((d) => d.startsAt > now);
    expect(upcoming).toHaveLength(1);
    const items = c.products.filter((p) => p.dropSlug === upcoming[0].slug);
    expect(items.length).toBeGreaterThan(0);
    expect(items.every((p) => p.sizes.every((s) => s.stock > 0))).toBe(true);
  });

  it("sells out past drops", () => {
    const past = new Set(c.drops.filter((d) => d.endsAt <= now).map((d) => d.slug));
    const items = c.products.filter((p) => p.dropSlug && past.has(p.dropSlug));
    expect(items.length).toBeGreaterThan(0);
    expect(items.every((p) => p.sizes.every((s) => s.stock === 0))).toBe(true);
  });

  it("only discounts with a higher compare-at price", () => {
    for (const p of c.products) if (p.compareAtCents !== null) expect(p.compareAtCents).toBeGreaterThan(p.priceCents);
  });
});
