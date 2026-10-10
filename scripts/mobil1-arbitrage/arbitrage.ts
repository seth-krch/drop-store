// Landed-cost and resale-spread math for Mobil 1 5W-20 delivered to Kansas.
// Pure functions: the CLI (cli.mts) handles files, flags, network and output.
import { z } from "zod";

// Kansas taxes delivery charges on taxable goods, so shipping is part of the
// tax base. The state rate is 6.5%; local add-ons bring most ZIPs to 7.5–10%.
export const KS_STATE_RATE = 0.065;
export const KS_DEFAULT_COMBINED_RATE = 0.0875;

const shipping = z.discriminatedUnion("type", [
  z.object({ type: z.literal("free") }),
  z.object({ type: z.literal("flat"), amount: z.number().nonnegative() }),
  z.object({ type: z.literal("perUnit"), amount: z.number().nonnegative() }),
  z.object({
    type: z.literal("freeOver"),
    threshold: z.number().nonnegative(),
    otherwise: z.number().nonnegative(),
  }),
  // Buy-online-pickup-in-store at a Kansas location: the cost is the drive.
  z.object({ type: z.literal("pickup"), roundTripMiles: z.number().nonnegative() }),
]);

export const offerSchema = z.object({
  retailer: z.string(),
  product: z.string(),
  quartsPerUnit: z.number().positive(),
  price: z.number().positive(),
  shipping,
  taxed: z.boolean().default(true),
  url: z.string().url().optional(),
  asOf: z.string().optional(),
});

export const resaleSchema = z.object({
  channel: z.string(),
  quartsPerUnit: z.number().positive(),
  price: z.number().positive(),
  feePct: z.number().min(0).max(1).default(0),
  feeFixed: z.number().nonnegative().default(0),
  // Postage to send one unit out of Kansas (0 for local cash sales).
  outboundShipping: z.number().nonnegative().default(0),
});

export const configSchema = z.object({
  offers: z.array(offerSchema).min(1),
  resale: z.array(resaleSchema).default([]),
});

export type Offer = z.infer<typeof offerSchema>;
export type Resale = z.infer<typeof resaleSchema>;
export type Config = z.infer<typeof configSchema>;

export type Options = {
  quarts: number; // how much oil the order must cover
  taxRate: number; // combined Kansas rate for the delivery ZIP
  costPerMile: number; // for pickup offers
};

export type Quote = {
  offer: Offer;
  units: number;
  quarts: number;
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
  perQuart: number;
};

export type Spread = {
  resale: Resale;
  buy: Quote;
  netPerQuart: number;
  profitPerQuart: number;
  profitPerUnit: number;
  marginPct: number;
};

const cents = (n: number) => Math.round(n * 100) / 100;

export function shippingCost(offer: Offer, units: number, subtotal: number, costPerMile: number): number {
  const s = offer.shipping;
  switch (s.type) {
    case "free":
      return 0;
    case "flat":
      return s.amount;
    case "perUnit":
      return s.amount * units;
    case "freeOver":
      return subtotal >= s.threshold ? 0 : s.otherwise;
    case "pickup":
      return s.roundTripMiles * costPerMile;
  }
}

export function quote(offer: Offer, opts: Options): Quote {
  const units = Math.ceil(opts.quarts / offer.quartsPerUnit);
  const subtotal = cents(units * offer.price);
  const ship = cents(shippingCost(offer, units, subtotal, opts.costPerMile));
  // Driving to the store isn't a delivery charge, so it isn't taxed.
  const taxBase = offer.shipping.type === "pickup" ? subtotal : subtotal + ship;
  const tax = offer.taxed ? cents(taxBase * opts.taxRate) : 0;
  const total = cents(subtotal + ship + tax);
  const quarts = units * offer.quartsPerUnit;
  return { offer, units, quarts, subtotal, shipping: ship, tax, total, perQuart: total / quarts };
}

export function rankOffers(offers: Offer[], opts: Options): Quote[] {
  return offers.map((o) => quote(o, opts)).sort((a, b) => a.perQuart - b.perQuart);
}

// What a resale channel pays per quart after fees and outbound postage.
export function netPerQuart(r: Resale): number {
  const net = r.price * (1 - r.feePct) - r.feeFixed - r.outboundShipping;
  return net / r.quartsPerUnit;
}

// Pairs every resale channel with the cheapest landed buy, best first.
export function spreads(resale: Resale[], ranked: Quote[]): Spread[] {
  const buy = ranked[0];
  if (!buy) return [];
  return resale
    .map((r) => {
      const net = netPerQuart(r);
      const profit = net - buy.perQuart;
      return {
        resale: r,
        buy,
        netPerQuart: net,
        profitPerQuart: profit,
        profitPerUnit: profit * r.quartsPerUnit,
        marginPct: profit / buy.perQuart,
      };
    })
    .sort((a, b) => b.profitPerQuart - a.profitPerQuart);
}

// Best-effort price from a product page's schema.org JSON-LD. Most big
// retailers block scripted requests, so callers must handle null.
export function priceFromJsonLd(html: string): number | null {
  const blocks = html.matchAll(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi);
  for (const [, body] of blocks) {
    let data: unknown;
    try {
      data = JSON.parse(body);
    } catch {
      continue;
    }
    const price = findPrice(data);
    if (price !== null) return price;
  }
  return null;
}

function findPrice(node: unknown): number | null {
  if (Array.isArray(node)) {
    for (const n of node) {
      const p = findPrice(n);
      if (p !== null) return p;
    }
    return null;
  }
  if (!node || typeof node !== "object") return null;
  const o = node as Record<string, unknown>;
  for (const key of ["price", "lowPrice"]) {
    const v = Number(o[key]);
    if (o[key] !== undefined && Number.isFinite(v) && v > 0) return v;
  }
  for (const key of ["offers", "@graph"]) {
    const p = findPrice(o[key]);
    if (p !== null) return p;
  }
  return null;
}
