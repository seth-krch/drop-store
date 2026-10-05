export const SITE = {
  name: "Mystic",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://shop.krch.dev",
  email: "support@mystic.example",
};

export function money(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: cents % 100 ? 2 : 0 }).format(cents / 100);
}

export function shortDate(d: Date) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "America/Chicago" }).format(d);
}

export function dropTime(d: Date) {
  return new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "America/Chicago", timeZoneName: "short" }).format(d);
}

export const CATEGORY_LABEL: Record<string, string> = {
  footwear: "Footwear",
  tops: "Tops",
  outerwear: "Outerwear",
  bottoms: "Bottoms",
  accessories: "Accessories",
};

export function maskEmail(email: string) {
  const [local, domain] = email.split("@");
  return `${local.slice(0, 2)}${"•".repeat(Math.max(1, Math.min(6, local.length - 2)))}@${domain}`;
}
