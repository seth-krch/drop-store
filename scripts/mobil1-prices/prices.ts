// Turns scraped retailer listings into Mobil 1 5W-20 offers, then ranks them
// by landed cost per quart delivered to Kansas. No I/O: see scrapers.ts / cli.mts.

// Kansas taxes delivery charges on taxable goods, so shipping is in the tax
// base. State rate 6.5%; local add-ons put most ZIPs between 7.5% and 10%.
export const KS_DEFAULT_TAX_RATE = 0.0875;

export type Listing = {
  retailer: Retailer;
  name: string;
  price: number;
  url: string;
  inStock: boolean;
  seller?: string; // set when a marketplace seller, not the retailer, ships it
};

export type Retailer = "Walmart" | "Home Depot" | "Advance Auto Parts";

// Standard ship-to-home rules for non-members. Store pickup is free at all three.
export const SHIPPING: Record<Retailer, { freeOver: number; otherwise: number }> = {
  Walmart: { freeOver: 35, otherwise: 6.99 },
  "Home Depot": { freeOver: 45, otherwise: 8.99 },
  "Advance Auto Parts": { freeOver: 35, otherwise: 8.99 },
};

export const LINES = [
  "Advanced Full Synthetic",
  "High Mileage",
  "Extended Performance",
  "Extended Performance High Mileage",
  "Advanced Clean",
  "Truck & SUV",
] as const;
export type Line = (typeof LINES)[number];

export type Offer = Listing & { line: Line; quarts: number };

// Mobil part numbers for listings whose titles get the size wrong (Home Depot
// lists 5 qt jugs as "120 oz.").
const PARTS: Record<string, { line: Line; quarts: number }> = {
  "120763": { line: "Advanced Full Synthetic", quarts: 5 },
  "103008": { line: "Advanced Full Synthetic", quarts: 1 },
  "120768": { line: "High Mileage", quarts: 5 },
  "120455": { line: "High Mileage", quarts: 1 },
};

export function lineOf(name: string): Line {
  const ep = /extended performance|\bEP\b/i.test(name);
  const hm = /high mileage/i.test(name);
  if (ep && hm) return "Extended Performance High Mileage";
  if (ep) return "Extended Performance";
  if (hm) return "High Mileage";
  if (/advanced clean/i.test(name)) return "Advanced Clean";
  if (/truck/i.test(name)) return "Truck & SUV";
  return "Advanced Full Synthetic";
}

// Quarts in one listing, including multi-packs. Null when the size can't be read.
export function quartsOf(name: string): number | null {
  let each: number | null = null;
  const qt = name.match(/(\d+(?:\.\d+)?)\s*-?\s*(?:qt|quart)s?\b/i);
  const oz = name.match(/(\d+(?:\.\d+)?)\s*(?:fl\.?\s*)?oz\b/i);
  if (qt) each = Number(qt[1]);
  else if (/\bquart\b/i.test(name)) each = 1;
  else if (oz) each = Number(oz[1]) / 32;
  if (each === null) return null;
  const pack = name.match(/pack of (\d+)|(\d+)\s*-?\s*pack|case\s*\/\s*(\d+)|(\d+)\s*-?\s*count/i);
  const n = pack ? Number(pack[1] ?? pack[2] ?? pack[3] ?? pack[4]) : 1;
  return each * n;
}

// Keeps Mobil 1 5W-20 motor oil and works out its line and size.
export function toOffer(l: Listing): Offer | null {
  const n = l.name;
  const part = Object.keys(PARTS).find((p) => n.includes(p));
  // "Mobil Full Synthetic" and "Mobil Super" are cheaper, different oils.
  if (!/\bmobil\s*1\b/i.test(n) && !part) return null;
  if (/super|delvac|filter|\bESP\b|racing/i.test(n)) return null;
  if (!/5\s*W\s*-?\s*20/i.test(n)) return null;
  const pack = n.match(/pack of (\d+)|(\d+)\s*-?\s*pack|case\s*\/\s*(\d+)/i);
  const packN = pack ? Number(pack[1] ?? pack[2] ?? pack[3]) : 1;
  const quarts = part ? PARTS[part].quarts * packN : quartsOf(n);
  if (!quarts || !(l.price > 0)) return null;
  return { ...l, line: part ? PARTS[part].line : lineOf(n), quarts };
}

export type Options = { quarts: number; taxRate: number; pickup: boolean };

export type Quote = {
  offer: Offer;
  units: number;
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
  perQuart: number;
  pickupTotal: number; // same order picked up in store: no shipping
};

const cents = (n: number) => Math.round(n * 100) / 100;

// Cost to get at least `quarts` of oil from this listing into a Kansas driveway.
export function quote(offer: Offer, opts: Options): Quote {
  const units = Math.ceil(opts.quarts / offer.quarts - 1e-9);
  const subtotal = cents(units * offer.price);
  const rule = SHIPPING[offer.retailer];
  const shipping = opts.pickup || subtotal >= rule.freeOver ? 0 : rule.otherwise;
  const tax = cents((subtotal + shipping) * opts.taxRate);
  const total = cents(subtotal + shipping + tax);
  const pickupTotal = cents(subtotal + cents(subtotal * opts.taxRate));
  return { offer, units, subtotal, shipping, tax, total, perQuart: total / (units * offer.quarts), pickupTotal };
}

export function rank(offers: Offer[], opts: Options): Quote[] {
  return offers.map((o) => quote(o, opts)).sort((a, b) => a.total - b.total || a.perQuart - b.perQuart);
}

// Same product listed twice on one page (sponsored + organic) shows up once.
export function dedupe(offers: Offer[]): Offer[] {
  const seen = new Map<string, Offer>();
  for (const o of offers) {
    const key = `${o.retailer}|${o.url.split("?")[0]}`;
    if (!seen.has(key)) seen.set(key, o);
  }
  return [...seen.values()];
}

export function cheapestPerLine(ranked: Quote[]): Quote[] {
  const best = new Map<Line, Quote>();
  for (const q of ranked) if (!best.has(q.offer.line)) best.set(q.offer.line, q);
  return [...best.values()];
}
