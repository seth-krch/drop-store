// Ranks Mobil 1 5W-20 offers by landed cost per quart in Kansas (price +
// shipping + Kansas sales tax, which also applies to shipping), then checks
// whether reselling through any channel clears a profit.
//   npm run oil:arbitrage -- [--file offers.json] [--quarts 5] [--tax-rate 0.0875]
//                            [--cost-per-mile 0.70] [--zip 67202] [--refresh] [--json]
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import {
  configSchema,
  KS_DEFAULT_COMBINED_RATE,
  priceFromJsonLd,
  rankOffers,
  spreads,
  type Offer,
} from "./arbitrage.ts";

const { values: args } = parseArgs({
  options: {
    file: { type: "string", default: fileURLToPath(new URL("./offers.json", import.meta.url)) },
    quarts: { type: "string", default: "5" },
    "tax-rate": { type: "string", default: String(KS_DEFAULT_COMBINED_RATE) },
    "cost-per-mile": { type: "string", default: "0.70" },
    zip: { type: "string", default: "Kansas" },
    refresh: { type: "boolean", default: false },
    json: { type: "boolean", default: false },
  },
});

const opts = {
  quarts: Number(args.quarts),
  taxRate: Number(args["tax-rate"]),
  costPerMile: Number(args["cost-per-mile"]),
};
if (![opts.quarts, opts.taxRate, opts.costPerMile].every((n) => Number.isFinite(n) && n >= 0) || opts.quarts === 0) {
  console.error("--quarts, --tax-rate and --cost-per-mile must be non-negative numbers (quarts > 0)");
  process.exit(1);
}
if (opts.taxRate > 1) opts.taxRate /= 100; // accept 8.75 as well as 0.0875

const config = configSchema.parse(JSON.parse(await readFile(args.file, "utf8")));

if (args.refresh) {
  await Promise.all(config.offers.map(refresh));
}

const ranked = rankOffers(config.offers, opts);
const deals = spreads(config.resale, ranked);

if (args.json) {
  console.log(JSON.stringify({ options: opts, zip: args.zip, ranked, spreads: deals }, null, 2));
  process.exit(0);
}

const $ = (n: number) => `$${n.toFixed(2)}`;
const pct = (n: number) => `${(n * 100).toFixed(1)}%`;

console.log(
  `\nMobil 1 5W-20, ${opts.quarts} qt delivered to ${args.zip} ` +
    `(tax ${(opts.taxRate * 100).toFixed(2)}% incl. shipping, pickup at ${$(opts.costPerMile)}/mi)\n`,
);
console.table(
  ranked.map((q) => ({
    retailer: q.offer.retailer,
    units: `${q.units} × ${q.offer.quartsPerUnit} qt`,
    subtotal: $(q.subtotal),
    shipping: $(q.shipping),
    tax: $(q.tax),
    landed: $(q.total),
    "per qt": $(q.perQuart),
    "as of": q.offer.asOf ?? "",
  })),
);

const best = ranked[0];
const worst = ranked[ranked.length - 1];
console.log(`Cheapest landed: ${best.offer.retailer} at ${$(best.perQuart)}/qt (${$(best.total)} total).`);
if (ranked.length > 1) {
  const gap = (worst.perQuart - best.perQuart) * opts.quarts;
  console.log(`Spread across retailers: ${$(gap)} on ${opts.quarts} qt vs ${worst.offer.retailer}.`);
}

if (deals.length) {
  console.log(`\nResale check (buy at ${best.offer.retailer}):`);
  console.table(
    deals.map((d) => ({
      channel: d.resale.channel,
      "sell price": $(d.resale.price),
      "net per qt": $(d.netPerQuart),
      "profit per qt": $(d.profitPerQuart),
      "profit per unit": $(d.profitPerUnit),
      margin: pct(d.marginPct),
      verdict: d.profitPerQuart > 0 ? "PROFIT" : "no",
    })),
  );
  const winners = deals.filter((d) => d.profitPerQuart > 0);
  console.log(
    winners.length
      ? `Arbitrage found: ${winners.map((d) => d.resale.channel).join(", ")}.`
      : "No resale channel beats the cheapest landed cost after fees and postage.",
  );
}

async function refresh(offer: Offer) {
  if (!offer.url) return;
  try {
    const res = await fetch(offer.url, {
      headers: { "user-agent": "Mozilla/5.0", accept: "text/html" },
      signal: AbortSignal.timeout(15_000),
    });
    const price = res.ok ? priceFromJsonLd(await res.text()) : null;
    if (price === null) throw new Error(res.ok ? "no price in page" : `HTTP ${res.status}`);
    offer.price = price;
    offer.asOf = new Date().toISOString().slice(0, 10);
  } catch (err) {
    console.error(`refresh ${offer.retailer}: ${(err as Error).message}; keeping ${offer.price}`);
  }
}
