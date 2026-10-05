// Deterministic catalog for the Mystic store. Pure data so it can be tested
// and reseeded to the exact same state.
import type { Category, Palette } from "./schema";

export type SeedProduct = {
  slug: string;
  sku: string;
  name: string;
  colorway: string;
  category: Category;
  palette: Palette;
  priceCents: number;
  compareAtCents: number | null;
  description: string;
  details: string[];
  releasedAt: Date;
  dropSlug: string | null;
  sizes: { size: string; stock: number }[];
};

export type SeedDrop = {
  slug: string;
  number: number;
  name: string;
  tagline: string;
  description: string;
  startsAt: Date;
  endsAt: Date;
  perCustomerLimit: number;
};

export type SeedPost = {
  slug: string;
  title: string;
  excerpt: string;
  body: string[];
  tone: string;
  publishedAt: Date;
};

// mulberry32: small, fast, deterministic
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const slugify = (s: string) =>
  s.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

const COLORWAYS: { name: string; palette: Palette }[] = [
  { name: "Bone", palette: { base: "#e9e4d8", accent: "#1b1a18", trim: "#b9b1a0" } },
  { name: "Onyx", palette: { base: "#1d1c1f", accent: "#e9e4d8", trim: "#4a474e" } },
  { name: "Astral", palette: { base: "#3b2f8f", accent: "#e8d9a8", trim: "#1c1647" } },
  { name: "Ember", palette: { base: "#b5462a", accent: "#f1e3c8", trim: "#5a1f12" } },
  { name: "Moss", palette: { base: "#4d5b3a", accent: "#e6dfc9", trim: "#2a3320" } },
  { name: "Fog", palette: { base: "#a7aeb4", accent: "#20242a", trim: "#d7dbde" } },
  { name: "Saffron", palette: { base: "#d9a12b", accent: "#2b2216", trim: "#8a6115" } },
  { name: "Tide", palette: { base: "#2f5d6e", accent: "#e7efe9", trim: "#183641" } },
  { name: "Rose Quartz", palette: { base: "#d9a6a3", accent: "#3a2526", trim: "#a87472" } },
  { name: "Obsidian", palette: { base: "#0f0f12", accent: "#9b7cff", trim: "#2a2833" } },
];

type Line = {
  name: string;
  category: Category;
  price: number;
  blurb: string;
  details: string[];
};

const LINES: Line[] = [
  { name: "Oracle Runner", category: "footwear", price: 180, blurb: "A lightweight runner built on a sculpted foam midsole, with a layered mesh upper and our crescent eyestay.", details: ["Engineered mesh and suede upper", "Dual-density foam midsole", "Rubber outsole with star-grid traction", "Fits true to size"] },
  { name: "Halo Low", category: "footwear", price: 150, blurb: "Our everyday court shoe. Full-grain leather, a padded collar and a cupsole that wears in, not out.", details: ["Full-grain leather upper", "Stitched rubber cupsole", "Perforated toe box", "Fits true to size"] },
  { name: "Eclipse High", category: "footwear", price: 200, blurb: "A high-top silhouette with a wraparound ankle strap and tonal overlays that shift in the light.", details: ["Nubuck and leather upper", "Removable ankle strap", "Padded collar and tongue", "Fits a half size large"] },
  { name: "Comet Slide", category: "footwear", price: 70, blurb: "A molded slide with a contoured footbed and an embossed Mystic eye.", details: ["One-piece EVA construction", "Contoured footbed", "Water friendly", "Fits true to size"] },
  { name: "Tarot Hoodie", category: "tops", price: 120, blurb: "Heavyweight fleece hoodie with a chest card print and a double-layer hood.", details: ["480 gsm cotton fleece", "Double-layer hood", "Ribbed cuffs and hem", "Boxy fit"] },
  { name: "Seer Tee", category: "tops", price: 48, blurb: "A 240 gsm tee with a dropped shoulder and the Mystic wordmark across the back.", details: ["240 gsm combed cotton", "Dropped shoulder", "Screen-printed graphics", "Relaxed fit"] },
  { name: "Lunar Longsleeve", category: "tops", price: 64, blurb: "Longsleeve tee with moon-phase sleeve prints and a garment-dyed finish.", details: ["220 gsm cotton jersey", "Garment dyed", "Sleeve prints", "Regular fit"] },
  { name: "Rune Crewneck", category: "tops", price: 110, blurb: "Loopback crewneck with tonal rune embroidery at the chest.", details: ["400 gsm loopback cotton", "Tonal embroidery", "Ribbed collar", "Regular fit"] },
  { name: "Nebula Shell", category: "outerwear", price: 260, blurb: "A packable shell with taped seams, a storm hood and reflective constellation hits.", details: ["3-layer waterproof nylon", "Taped seams", "Packs into chest pocket", "Regular fit"] },
  { name: "Void Puffer", category: "outerwear", price: 320, blurb: "Box-quilted puffer with recycled fill and a high funnel collar.", details: ["Recycled synthetic fill", "Water-resistant shell", "Two-way zip", "Oversized fit"] },
  { name: "Aura Coach Jacket", category: "outerwear", price: 160, blurb: "Snap-front coach jacket with a mesh lining and back print.", details: ["Nylon twill shell", "Mesh lining", "Snap front", "Regular fit"] },
  { name: "Orbit Cargo", category: "bottoms", price: 140, blurb: "Relaxed cargo pants in ripstop with articulated knees and six pockets.", details: ["Cotton ripstop", "Articulated knees", "Adjustable hem", "Relaxed fit"] },
  { name: "Drift Sweatpant", category: "bottoms", price: 98, blurb: "Fleece sweatpant with a straight leg and an embroidered eye at the hip.", details: ["400 gsm cotton fleece", "Straight leg", "Side and back pockets", "Relaxed fit"] },
  { name: "Signal Short", category: "bottoms", price: 68, blurb: "Mesh short with a 7 inch inseam and reflective trim.", details: ["Recycled mesh", "7 inch inseam", "Elastic waist", "Regular fit"] },
  { name: "Sigil Cap", category: "accessories", price: 42, blurb: "Six-panel cap with the Mystic sigil embroidered on the front.", details: ["Cotton twill", "Adjustable strap", "Embroidered sigil", "One size"] },
  { name: "Totem Tote", category: "accessories", price: 38, blurb: "Heavy canvas tote with an inner pocket and printed tarot back.", details: ["16 oz canvas", "Inner zip pocket", "Reinforced handles", "One size"] },
  { name: "Crystal Sock 3-Pack", category: "accessories", price: 28, blurb: "Three pairs of cushioned crew socks with jacquard crystals.", details: ["Cotton blend", "Cushioned sole", "Jacquard pattern", "Fits US 7–12"] },
  { name: "Star Map Beanie", category: "accessories", price: 36, blurb: "Rib-knit beanie with a woven star-map label.", details: ["Merino blend", "Double fold cuff", "Woven label", "One size"] },
];

const SIZES: Record<Category, string[]> = {
  footwear: ["7", "7.5", "8", "8.5", "9", "9.5", "10", "10.5", "11", "11.5", "12", "13"],
  tops: ["XS", "S", "M", "L", "XL", "XXL"],
  outerwear: ["XS", "S", "M", "L", "XL", "XXL"],
  bottoms: ["28", "30", "32", "34", "36", "38"],
  accessories: ["OS"],
};

const CAT_CODE: Record<Category, string> = { footwear: "FW", tops: "TP", outerwear: "OW", bottoms: "BT", accessories: "AC" };

export function buildCatalog(now: Date): { drops: SeedDrop[]; products: SeedProduct[]; posts: SeedPost[] } {
  const r = rng(20260505);
  const day = 24 * 3600 * 1000;
  const at = (offsetDays: number, hourCT = 10) => {
    const d = new Date(now.getTime() + offsetDays * day);
    d.setUTCHours(hourCT + 5, 0, 0, 0); // 10:00 Central (CDT) == 15:00 UTC
    return d;
  };

  const drops: SeedDrop[] = [
    { slug: "drop-04-solstice", number: 4, name: "Solstice", tagline: "Longest day, brightest colors.", description: "Saffron and Ember colorways across our core runners and fleece.", startsAt: at(-120), endsAt: at(-119), perCustomerLimit: 2 },
    { slug: "drop-05-equinox", number: 5, name: "Equinox", tagline: "Balanced, in Bone and Onyx.", description: "Two-tone takes on the Halo Low and Tarot Hoodie.", startsAt: at(-62), endsAt: at(-61), perCustomerLimit: 1 },
    { slug: "drop-06-new-moon", number: 6, name: "New Moon", tagline: "Everything in Obsidian.", description: "Blackout colorways with violet glow details.", startsAt: at(-18), endsAt: at(-17), perCustomerLimit: 1 },
    { slug: "drop-07-oracle-pack", number: 7, name: "Oracle Pack", tagline: "See it before it's gone.", description: "The Oracle Runner returns in Astral, with a matching hoodie, cap and tee. Limited to one pair per customer.", startsAt: at(3), endsAt: at(4), perCustomerLimit: 1 },
  ];

  const products: SeedProduct[] = [];
  let skuN = 1000;
  LINES.forEach((line, li) => {
    // 3–4 colorways per line, picked deterministically
    const count = line.category === "accessories" ? 2 + Math.floor(r() * 2) : 3 + Math.floor(r() * 2);
    const start = Math.floor(r() * COLORWAYS.length);
    for (let k = 0; k < count; k++) {
      const cw = COLORWAYS[(start + k * 3) % COLORWAYS.length];
      const name = line.name;
      const slug = slugify(`${name} ${cw.name}`);
      const releasedDaysAgo = Math.floor(r() * 300) + 5;
      const onSale = r() < 0.12;
      const price = line.price * 100;
      products.push({
        slug,
        sku: `MY-${CAT_CODE[line.category]}-${skuN++}`,
        name,
        colorway: cw.name,
        category: line.category,
        palette: cw.palette,
        priceCents: onSale ? Math.round((price * 0.7) / 100) * 100 : price,
        compareAtCents: onSale ? price : null,
        description: line.blurb,
        details: line.details,
        releasedAt: at(-releasedDaysAgo),
        dropSlug: null,
        sizes: SIZES[line.category].map((size) => {
          const roll = r();
          return { size, stock: roll < 0.18 ? 0 : roll < 0.32 ? 1 + Math.floor(r() * 3) : 4 + Math.floor(r() * 40) };
        }),
      });
    }
    void li;
  });

  // Attach drop products: past drops are sold out, the upcoming drop has stock held back.
  const assign = (slug: string, picks: [string, string][], sold: boolean, release: Date) => {
    for (const [lineName, cwName] of picks) {
      const line = LINES.find((l) => l.name === lineName)!;
      const cw = COLORWAYS.find((c) => c.name === cwName)!;
      const pslug = slugify(`${lineName} ${cwName} ${slug.split("-").slice(2).join(" ")}`);
      products.push({
        slug: pslug,
        sku: `MY-${CAT_CODE[line.category]}-${skuN++}`,
        name: lineName,
        colorway: `${cwName} · ${slug.split("-").slice(2).map((w) => w[0].toUpperCase() + w.slice(1)).join(" ")}`,
        category: line.category,
        palette: cw.palette,
        priceCents: line.price * 100 + (line.category === "footwear" ? 2000 : 0),
        compareAtCents: null,
        description: line.blurb,
        details: line.details,
        releasedAt: release,
        dropSlug: slug,
        sizes: SIZES[line.category].map((size) => ({ size, stock: sold ? 0 : 6 + Math.floor(r() * 18) })),
      });
    }
  };
  assign("drop-04-solstice", [["Oracle Runner", "Saffron"], ["Tarot Hoodie", "Ember"], ["Seer Tee", "Saffron"]], true, drops[0].startsAt);
  assign("drop-05-equinox", [["Halo Low", "Bone"], ["Halo Low", "Onyx"], ["Tarot Hoodie", "Bone"]], true, drops[1].startsAt);
  assign("drop-06-new-moon", [["Eclipse High", "Obsidian"], ["Void Puffer", "Obsidian"], ["Sigil Cap", "Obsidian"]], true, drops[2].startsAt);
  assign("drop-07-oracle-pack", [["Oracle Runner", "Astral"], ["Tarot Hoodie", "Astral"], ["Seer Tee", "Astral"], ["Sigil Cap", "Astral"]], false, drops[3].startsAt);

  const posts: SeedPost[] = [
    { slug: "inside-the-oracle-runner", title: "Inside the Oracle Runner", excerpt: "Three years, eleven samples and one very stubborn midsole.", tone: "#3b2f8f", publishedAt: at(-6), body: ["The Oracle Runner started as a sketch on the back of a receipt: a runner that looked fast standing still.", "The midsole went through eleven samples before the foam felt right. Too soft and it looked tired after a week. Too firm and nobody wanted to walk in it.", "Drop 07 brings it back in Astral, a deep violet with a pale gold eyestay. One pair per customer."] },
    { slug: "how-our-drops-work", title: "How our drops work", excerpt: "Times, limits and what happens when you join the line.", tone: "#1d1c1f", publishedAt: at(-30), body: ["Every drop opens at 10:00 Central. A few minutes before, the waiting room opens and everyone in it is placed in a random order.", "Most drops are limited to one item per style per customer, and orders that break the limit are cancelled.", "Sold out means sold out. We don't restock drop colorways."] },
    { slug: "fleece-weights-explained", title: "Fleece weights, explained", excerpt: "What 400 and 480 gsm actually feel like.", tone: "#4d5b3a", publishedAt: at(-55), body: ["GSM is grams per square meter: how heavy a fabric is for its size.", "Our Rune Crewneck is 400 gsm, warm enough for fall without the bulk. The Tarot Hoodie is 480 gsm and holds its shape for years.", "Both are cotton, both are pre-shrunk, and both will soften with every wash."] },
    { slug: "the-new-moon-recap", title: "New Moon, recap", excerpt: "Drop 06 sold through in under four minutes.", tone: "#0f0f12", publishedAt: at(-16), body: ["Drop 06 went fully Obsidian: the Eclipse High, the Void Puffer and a blackout Sigil Cap.", "Everything sold through in under four minutes. Thank you to everyone who waited in line.", "Drop 07 is next. Watch this space."] },
  ];

  return { drops, products, posts };
}
