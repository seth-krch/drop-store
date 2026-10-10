// Reads Mobil 1 5W-20 search results with a real (headless) Chromium. Plain
// HTTP requests get bot-blocked; a browser gets through at the retailers below.
// AutoZone, O'Reilly, NAPA, Target and Amazon block headless browsers too.
import type { Browser, Page } from "playwright";
import type { Listing, Retailer } from "./prices.ts";

type Scraper = {
  retailer: Retailer;
  url: string;
  ready?: string; // selector that appears once client-side results have rendered
  read: (page: Page) => Promise<Listing[]>;
};

const Q = "mobil 1 5w-20";

export const SCRAPERS: Scraper[] = [
  {
    retailer: "Walmart",
    url: `https://www.walmart.com/search?q=${encodeURIComponent(Q)}`,
    async read(page) {
      const raw = await page.locator("script#__NEXT_DATA__").textContent({ timeout: 10_000 });
      const items = collect(JSON.parse(raw ?? "{}"), (o) => typeof o.name === "string" && "priceInfo" in o);
      return items.map((o) => ({
        retailer: "Walmart",
        name: String(o.name),
        price: Number(o.price),
        url: new URL(String(o.canonicalUrl ?? ""), "https://www.walmart.com").href,
        inStock: (o.availabilityStatusV2 as { value?: string } | undefined)?.value !== "OUT_OF_STOCK",
        seller: o.sellerName && o.sellerName !== "Walmart.com" ? String(o.sellerName) : undefined,
      }));
    },
  },
  {
    retailer: "Home Depot",
    url: `https://www.homedepot.com/s/${encodeURIComponent(Q)}`,
    async read(page) {
      const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
      const products = blocks.flatMap((b) => collect(safeJson(b), (o) => o["@type"] === "Product"));
      return products.map((p) => {
        const offer = (p.offers ?? {}) as { price?: number | string; url?: string; availability?: string };
        return {
          retailer: "Home Depot",
          name: String(p.name),
          price: Number(offer.price),
          url: String(offer.url ?? ""),
          inStock: !/OutOfStock/i.test(offer.availability ?? ""),
        };
      });
    },
  },
  {
    retailer: "Advance Auto Parts",
    url: `https://shop.advanceautoparts.com/web/SearchResults?searchTerm=${encodeURIComponent(Q)}`,
    ready: '[data-testid="price-box"]',
    async read(page) {
      // No structured data on this page: read each result's price box.
      const rows = await page.locator('[data-testid="price-box"]').evaluateAll((boxes) =>
        boxes.map((box) => {
          let card: Element | null = box;
          for (let i = 0; i < 8 && card && !card.querySelector("p[title]"); i++) card = card.parentElement;
          if (!card) return { title: "", link: "", text: "" };
          const title = card.querySelector("p[title]")?.getAttribute("title") ?? "";
          const link = card.querySelector("a[href*='/p/']")?.getAttribute("href") ?? "";
          return { title, link, text: (box as HTMLElement).innerText };
        }),
      );
      return rows.map((r) => {
        const m = r.text.replace(/\s+/g, "").match(/\$(\d+)\.?(\d{2})/);
        return {
          retailer: "Advance Auto Parts",
          name: r.title,
          price: m ? Number(`${m[1]}.${m[2]}`) : NaN,
          url: new URL(r.link || "/", "https://shop.advanceautoparts.com").href,
          inStock: true,
        };
      });
    },
  },
];

export type ScrapeResult = { retailer: Retailer; listings: Listing[]; error?: string };

const ATTEMPTS = 4;

// Each retailer gets a few tries in a fresh browser context: bot checks such as
// Walmart's "Robot or human?" page come and go between visits.
export async function scrapeAll(browser: Browser): Promise<ScrapeResult[]> {
  return Promise.all(
    SCRAPERS.map(async (s): Promise<ScrapeResult> => {
      let error = "";
      for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
        try {
          return { retailer: s.retailer, listings: await scrapeOnce(browser, s) };
        } catch (err) {
          error = (err as Error).message.split("\n")[0];
          await new Promise((r) => setTimeout(r, 2_000 * attempt));
        }
      }
      return { retailer: s.retailer, listings: [], error: `${error} (after ${ATTEMPTS} tries)` };
    }),
  );
}

async function scrapeOnce(browser: Browser, s: Scraper): Promise<Listing[]> {
  const ctx = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36",
    locale: "en-US",
    timezoneId: "America/Chicago",
  });
  try {
    const page = await ctx.newPage();
    const res = await page.goto(s.url, { waitUntil: "domcontentloaded", timeout: 45_000 });
    if (res && res.status() >= 400) throw new Error(`HTTP ${res.status()}`);
    if (/blocked|captcha/i.test(page.url())) throw new Error(`bot check: ${await page.title()}`);
    if (s.ready) await page.waitForSelector(s.ready, { timeout: 20_000 }).catch(() => {});
    else await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
    const listings = (await s.read(page))
      .filter((l) => l.name && Number.isFinite(l.price))
      .map((l) => ({ ...l, url: l.url.split("?")[0] }));
    if (!listings.length) throw new Error(`no results (page title: ${await page.title()})`);
    return listings;
  } finally {
    await ctx.close();
  }
}

type Obj = Record<string, unknown>;

function collect(node: unknown, match: (o: Obj) => boolean, out: Obj[] = []): Obj[] {
  if (Array.isArray(node)) node.forEach((n) => collect(n, match, out));
  else if (node && typeof node === "object") {
    const o = node as Obj;
    if (match(o)) out.push(o);
    else Object.values(o).forEach((v) => collect(v, match, out));
  }
  return out;
}

function safeJson(s: string): unknown {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}
