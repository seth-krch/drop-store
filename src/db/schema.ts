import { relations } from "drizzle-orm";
import {
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";

export type Category = "footwear" | "tops" | "outerwear" | "bottoms" | "accessories";

export type Palette = { base: string; accent: string; trim: string };

export const drops = pgTable("drops", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  number: integer("number").notNull(),
  name: text("name").notNull(),
  tagline: text("tagline").notNull(),
  description: text("description").notNull(),
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
  endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
  perCustomerLimit: integer("per_customer_limit").notNull().default(1),
});

export const products = pgTable(
  "products",
  {
    id: serial("id").primaryKey(),
    slug: text("slug").notNull(),
    sku: text("sku").notNull(),
    name: text("name").notNull(),
    colorway: text("colorway").notNull(),
    category: text("category").$type<Category>().notNull(),
    palette: jsonb("palette").$type<Palette>().notNull(),
    priceCents: integer("price_cents").notNull(),
    compareAtCents: integer("compare_at_cents"),
    description: text("description").notNull(),
    details: jsonb("details").$type<string[]>().notNull(),
    releasedAt: timestamp("released_at", { withTimezone: true }).notNull(),
    dropId: integer("drop_id").references(() => drops.id),
  },
  (t) => [
    uniqueIndex("products_slug_idx").on(t.slug),
    uniqueIndex("products_sku_idx").on(t.sku),
    index("products_category_idx").on(t.category),
  ],
);

export const variants = pgTable(
  "variants",
  {
    id: serial("id").primaryKey(),
    productId: integer("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    size: text("size").notNull(),
    position: integer("position").notNull(),
    stock: integer("stock").notNull(),
  },
  (t) => [uniqueIndex("variants_product_size_idx").on(t.productId, t.size)],
);

export const posts = pgTable("posts", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  excerpt: text("excerpt").notNull(),
  body: jsonb("body").$type<string[]>().notNull(),
  tone: text("tone").notNull(),
  publishedAt: timestamp("published_at", { withTimezone: true }).notNull(),
});

export const subscribers = pgTable("subscribers", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const productsRelations = relations(products, ({ many, one }) => ({
  variants: many(variants),
  drop: one(drops, { fields: [products.dropId], references: [drops.id] }),
}));

export const variantsRelations = relations(variants, ({ one }) => ({
  product: one(products, { fields: [variants.productId], references: [products.id] }),
}));

export const dropsRelations = relations(drops, ({ many }) => ({
  products: many(products),
}));
