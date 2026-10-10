import { describe, expect, it } from "vitest";
import {
  offerSchema,
  priceFromJsonLd,
  quote,
  rankOffers,
  resaleSchema,
  spreads,
} from "../scripts/mobil1-arbitrage/arbitrage";

const opts = { quarts: 5, taxRate: 0.0875, costPerMile: 0.7 };
const jug = (price: number, shipping: object, extra: object = {}) =>
  offerSchema.parse({ retailer: "r", product: "p", quartsPerUnit: 5, price, shipping, ...extra });

describe("mobil1 arbitrage", () => {
  it("taxes shipping as Kansas does", () => {
    const q = quote(jug(30, { type: "flat", amount: 10 }), opts);
    expect(q.tax).toBe(3.5);
    expect(q.total).toBe(43.5);
    expect(q.perQuart).toBeCloseTo(8.7);
  });

  it("applies free-shipping thresholds to the subtotal", () => {
    const s = { type: "freeOver", threshold: 35, otherwise: 6.99 };
    expect(quote(jug(31.97, s), opts).shipping).toBe(6.99);
    expect(quote(jug(31.97, s), { ...opts, quarts: 10 }).shipping).toBe(0);
  });

  it("charges pickup mileage without taxing it", () => {
    const q = quote(jug(30, { type: "pickup", roundTripMiles: 10 }), opts);
    expect(q.shipping).toBe(7);
    expect(q.tax).toBe(2.63);
  });

  it("rounds up to whole units and skips tax when untaxed", () => {
    const quarts = offerSchema.parse({
      retailer: "q", product: "p", quartsPerUnit: 1, price: 9, shipping: { type: "free" }, taxed: false,
    });
    const q = quote(quarts, { ...opts, quarts: 4.5 });
    expect(q.units).toBe(5);
    expect(q.total).toBe(45);
  });

  it("ranks by landed cost per quart and finds profitable resale", () => {
    const ranked = rankOffers([jug(40, { type: "free" }), jug(30, { type: "free" })], opts);
    expect(ranked[0].offer.price).toBe(30);
    const [best, loser] = spreads(
      [
        resaleSchema.parse({ channel: "local", quartsPerUnit: 5, price: 40 }),
        resaleSchema.parse({ channel: "ebay", quartsPerUnit: 5, price: 40, feePct: 0.15, outboundShipping: 16 }),
      ],
      ranked,
    );
    expect(best.resale.channel).toBe("local");
    expect(best.profitPerUnit).toBeCloseTo(40 - 32.63);
    expect(loser.profitPerQuart).toBeLessThan(0);
  });

  it("reads prices from JSON-LD", () => {
    const html = `<script type="application/ld+json">{"@type":"Product","offers":{"@type":"Offer","price":"31.97"}}</script>`;
    expect(priceFromJsonLd(html)).toBe(31.97);
    expect(priceFromJsonLd("<html></html>")).toBeNull();
  });
});
