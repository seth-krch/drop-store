import { describe, expect, it } from "vitest";
import {
  cheapestPerLine,
  dedupe,
  lineOf,
  quartsOf,
  quote,
  rank,
  toOffer,
  type Listing,
} from "../scripts/mobil1-prices/prices";

const opts = { quarts: 5, taxRate: 0.0875, pickup: false };
const listing = (name: string, price: number, extra: Partial<Listing> = {}): Listing => ({
  retailer: "Walmart",
  name,
  price,
  url: `https://example.com/${encodeURIComponent(name)}`,
  inStock: true,
  ...extra,
});
const offer = (name: string, price: number, extra: Partial<Listing> = {}) => toOffer(listing(name, price, extra))!;

describe("mobil1 prices", () => {
  it("keeps only Mobil 1 5W-20", () => {
    expect(offer("Mobil 1 Advanced Full Synthetic Motor Oil 5W-20, 5 Quart", 31.97)).not.toBeNull();
    expect(toOffer(listing("Mobil 1 Advanced Full Synthetic Motor Oil 5W-30, 5 Quart", 31.97))).toBeNull();
    expect(toOffer(listing("Mobil Full Synthetic Motor Oil 5W-20, 5 Quart", 27.88))).toBeNull();
    expect(toOffer(listing("Mobil Super 5W-20, 5 Quart", 24))).toBeNull();
    expect(toOffer(listing("Pennzoil Platinum 5W-20, 5 Qt.", 35.98))).toBeNull();
    // Home Depot drops the "1" but the part number identifies it.
    expect(offer("Mobil 32 oz. 5W20 Synthetic Motor Oil 103008", 9.98).quarts).toBe(1);
  });

  it("reads sizes and packs", () => {
    expect(quartsOf("Mobil 1 5W-20, 5 Quart")).toBe(5);
    expect(quartsOf("Mobil 1 5W-20, 5 Quarts")).toBe(5);
    expect(quartsOf("Mobil 1 5W-20, 5 Quart (Pack of 3)")).toBe(15);
    expect(quartsOf("Mobil 1 5W-20, 1 qt (6 Pack)")).toBe(6);
    expect(quartsOf("Mobil 1 32 oz. 5W-20")).toBe(1);
    expect(quartsOf("Mobil 1 5W-20 Motor Oil, Extends Engine Life, 12 Quart")).toBe(12);
    expect(quartsOf("Mobil 1 5W-20")).toBeNull();
    // Home Depot calls the 5 qt jug "120 oz."; the part number wins.
    expect(offer("Mobil 1 120 oz. 5W-20 High Mileage Motor Oil 120768", 31.98).quarts).toBe(5);
  });

  it("classifies product lines", () => {
    expect(lineOf("Mobil 1 Extended Performance High Mileage 5W-20")).toBe("Extended Performance High Mileage");
    expect(lineOf("Mobil 1 Extended Performance 5W-20")).toBe("Extended Performance");
    expect(lineOf("Mobil 1 High Mileage 5W-20")).toBe("High Mileage");
    expect(lineOf("Mobil 1 Advanced Clean 5W-20")).toBe("Advanced Clean");
    expect(lineOf("Mobil 1 Truck & SUV 5W-20")).toBe("Truck & SUV");
    expect(lineOf("Mobil 1 Advanced Full Synthetic 5W-20")).toBe("Advanced Full Synthetic");
  });

  it("adds shipping below the free threshold and taxes it (Kansas)", () => {
    const q = quote(offer("Mobil 1 5W-20, 5 Quart", 31.97), opts);
    expect(q.shipping).toBe(6.99);
    expect(q.tax).toBe(3.41);
    expect(q.total).toBe(42.37);
    expect(q.pickupTotal).toBe(34.77);
    expect(quote(offer("Mobil 1 5W-20, 5 Quart", 35.97), opts).shipping).toBe(0);
    expect(quote(offer("Mobil 1 5W-20, 5 Quart", 31.97), { ...opts, pickup: true }).shipping).toBe(0);
  });

  it("buys enough whole units to cover the quarts asked for", () => {
    const q = quote(offer("Mobil 1 5W-20, 1 Quart", 9.98), { ...opts, quarts: 4.5 });
    expect(q.units).toBe(5);
    expect(q.subtotal).toBe(49.9);
  });

  it("ranks by total, dedupes and picks one per line", () => {
    const hm = offer("Mobil 1 High Mileage 5W-20, 5 Quart", 31.97);
    const afs = offer("Mobil 1 Advanced Full Synthetic 5W-20, 5 Quart", 35.97);
    const afs2 = offer("Mobil 1 Advanced Full Synthetic 5W-20, 5 Quart", 44.99, { retailer: "Advance Auto Parts" });
    const ranked = rank(dedupe([afs2, hm, afs, hm]), opts);
    expect(ranked.map((q) => q.offer.price)).toEqual([35.97, 31.97, 44.99]);
    expect(cheapestPerLine(ranked).map((q) => q.offer.line)).toEqual(["Advanced Full Synthetic", "High Mileage"]);
  });
});
