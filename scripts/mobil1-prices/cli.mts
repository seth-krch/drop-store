// Scrapes today's Mobil 1 5W-20 prices and lists the cheapest ways to get it
// to Kansas: price + shipping + Kansas sales tax (which also applies to shipping).
//   npm run oil:prices -- [--quarts 5] [--tax-rate 8.75] [--pickup] [--line "high mileage"]
//                         [--top 10] [--out <dir>] [--all-sellers] [--json]
// With --out, writes <dir>/latest.md and appends every offer to <dir>/history.jsonl,
// which is also used to show the change since the previous run.
import { appendFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { chromium } from "playwright";
import {
  cheapestPerLine,
  dedupe,
  KS_DEFAULT_TAX_RATE,
  rank,
  toOffer,
  type Quote,
} from "./prices.ts";
import { scrapeAll } from "./scrapers.ts";

const { values: args } = parseArgs({
  options: {
    quarts: { type: "string", default: "5" },
    "tax-rate": { type: "string", default: String(KS_DEFAULT_TAX_RATE) },
    pickup: { type: "boolean", default: false },
    line: { type: "string" },
    top: { type: "string", default: "10" },
    out: { type: "string" },
    "all-sellers": { type: "boolean", default: false },
    json: { type: "boolean", default: false },
  },
});

let taxRate = Number(args["tax-rate"]);
if (taxRate > 1) taxRate /= 100; // accept 8.75 as well as 0.0875
const opts = { quarts: Number(args.quarts), taxRate, pickup: args.pickup };
const top = Number(args.top);
if (!(opts.quarts > 0) || !(taxRate >= 0) || !(top > 0)) {
  console.error("--quarts and --top must be positive numbers, --tax-rate non-negative");
  process.exit(1);
}

const browser = await chromium.launch();
const results = await scrapeAll(browser).finally(() => browser.close());

const offers = dedupe(
  results
    .flatMap((r) => r.listings)
    .map(toOffer)
    .filter((o) => o !== null)
    .filter((o) => o.inStock)
    .filter((o) => args["all-sellers"] || !o.seller)
    .filter((o) => !args.line || o.line.toLowerCase().includes(args.line.toLowerCase())),
);
const ranked = rank(offers, opts);
const date = new Date().toLocaleDateString("en-CA", { timeZone: "America/Chicago" });

const previous = args.out ? await lastRun(join(args.out, "history.jsonl"), date) : new Map<string, number>();

if (args.json) {
  console.log(JSON.stringify({ date, options: opts, scraped: summary(), ranked }, null, 2));
} else {
  console.log(report());
}

if (args.out) {
  await mkdir(args.out, { recursive: true });
  await writeFile(join(args.out, "latest.md"), report() + "\n");
  const rows = ranked.map((q) =>
    JSON.stringify({
      date,
      retailer: q.offer.retailer,
      name: q.offer.name,
      line: q.offer.line,
      quarts: q.offer.quarts,
      price: q.offer.price,
      url: q.offer.url,
    }),
  );
  if (rows.length) await appendFile(join(args.out, "history.jsonl"), rows.join("\n") + "\n");
}

if (!ranked.length) process.exitCode = 1;

function summary() {
  return results.map((r) => ({ retailer: r.retailer, listings: r.listings.length, error: r.error }));
}

function report(): string {
  const $ = (n: number) => `$${n.toFixed(2)}`;
  const how = opts.pickup ? "store pickup in Kansas" : "shipped to Kansas";
  const taxNote = opts.pickup ? "sales tax" : "sales tax incl. shipping";
  const lines: string[] = [
    `# Mobil 1 5W-20: cheapest today (${date})`,
    "",
    `${opts.quarts} qt, ${how}, ${(opts.taxRate * 100).toFixed(2)}% ${taxNote}.`,
    "",
  ];
  if (!ranked.length) {
    lines.push("No offers could be read today.");
  } else {
    const best = ranked[0];
    lines.push(
      `**Best: ${best.offer.retailer}: ${best.offer.name}: ${$(best.total)} ${opts.pickup ? "at pickup" : "delivered"} ` +
        `(${best.units} × ${$(best.offer.price)}, ${$(best.perQuart)}/qt)**`,
      `${best.offer.url}`,
      "",
      "| # | Retailer | Product | Line | Buy | Price | Ship | Tax | Total | Per qt | Pickup total | vs last run |",
      "|---|---|---|---|---|---|---|---|---|---|---|---|",
      ...ranked.slice(0, top).map((q, i) => row(q, i + 1)),
      "",
      "## Cheapest per product line",
      "",
      "| Line | Retailer | Total | Per qt |",
      "|---|---|---|---|",
      ...cheapestPerLine(ranked).map(
        (q) => `| ${q.offer.line} | [${q.offer.retailer}](${q.offer.url}) | ${$(q.total)} | ${$(q.perQuart)} |`,
      ),
    );
  }
  const failed = results.filter((r) => r.error);
  if (failed.length) {
    lines.push("", "Could not read: " + failed.map((r) => `${r.retailer} (${r.error})`).join("; ") + ".");
  }
  return lines.join("\n");

  function row(q: Quote, n: number) {
    const before = previous.get(key(q));
    const change =
      before === undefined ? "new" : before === q.offer.price ? "same" : `${q.offer.price > before ? "+" : "−"}${$(Math.abs(q.offer.price - before))}`;
    const size = `${q.units} × ${q.offer.quarts} qt`;
    return `| ${n} | ${q.offer.retailer} | [${q.offer.name}](${q.offer.url}) | ${q.offer.line} | ${size} | ${$(q.offer.price)} | ${$(q.shipping)} | ${$(q.tax)} | **${$(q.total)}** | ${$(q.perQuart)} | ${$(q.pickupTotal)} | ${change} |`;
  }
}

function key(q: { offer: { retailer: string; url: string } } | { retailer: string; url: string }) {
  const o = "offer" in q ? q.offer : q;
  return `${o.retailer}|${o.url.split("?")[0]}`;
}

// Prices from the most recent earlier day in the history file.
async function lastRun(file: string, today: string): Promise<Map<string, number>> {
  const text = await readFile(file, "utf8").catch(() => "");
  const rows = text
    .split("\n")
    .filter(Boolean)
    .map((l) => JSON.parse(l) as { date: string; retailer: string; url: string; price: number })
    .filter((r) => r.date < today);
  const last = rows.reduce((d, r) => (r.date > d ? r.date : d), "");
  return new Map(rows.filter((r) => r.date === last).map((r) => [key(r), r.price]));
}
