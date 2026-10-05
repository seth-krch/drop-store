import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ShopView, parseFilters } from "@/components/ShopView";
import { CATEGORIES } from "@/lib/store";

export async function generateMetadata({ params }: PageProps<"/shop/[category]">): Promise<Metadata> {
  const { category } = await params;
  const c = CATEGORIES.find((x) => x.slug === category);
  return c ? { title: c.label, description: `Shop Mystic ${c.label.toLowerCase()}.` } : {};
}

export default async function CategoryPage({ params, searchParams }: PageProps<"/shop/[category]">) {
  const { category } = await params;
  const c = CATEGORIES.find((x) => x.slug === category);
  if (!c) notFound();
  return <ShopView title={c.label} base={`/shop/${c.slug}`} filters={parseFilters(await searchParams, c.slug)} />;
}
