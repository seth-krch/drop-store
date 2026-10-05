import type { Metadata } from "next";
import { ShopView, parseFilters } from "@/components/ShopView";

export const metadata: Metadata = { title: "Shop all", description: "Footwear, apparel and accessories from Mystic." };

export default async function Shop({ searchParams }: PageProps<"/shop">) {
  const filters = parseFilters(await searchParams);
  return <ShopView title={filters.sale ? "Sale" : "Shop all"} base="/shop" filters={filters} />;
}
