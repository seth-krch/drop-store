import type { Metadata } from "next";
import { ShopView, parseFilters } from "@/components/ShopView";

export const metadata: Metadata = { title: "Search", robots: { index: false } };

export default async function SearchPage({ searchParams }: PageProps<"/search">) {
  const filters = parseFilters(await searchParams);
  return <ShopView title={filters.q ? `“${filters.q}”` : "Search"} base="/search" filters={filters} />;
}
