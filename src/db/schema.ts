import { relations } from "drizzle-orm";
import {
  boolean,
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

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
  failedLogins: integer("failed_logins").notNull().default(0),
  lockedUntil: timestamp("locked_until", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const sessions = pgTable(
  "sessions",
  {
    id: text("id").primaryKey(), // sha256 of the cookie token
    userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    ip: text("ip"),
    userAgent: text("user_agent"),
  },
  (t) => [index("sessions_user_idx").on(t.userId)],
);

export type CodePurpose = "verify" | "reset";

export const emailCodes = pgTable(
  "email_codes",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    purpose: text("purpose").$type<CodePurpose>().notNull(),
    codeHash: text("code_hash").notNull(),
    attempts: integer("attempts").notNull().default(0),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("email_codes_user_idx").on(t.userId, t.purpose)],
);

// Development mailbox: every outgoing email is recorded here when no
// email provider is configured.
export const outbox = pgTable("outbox", {
  id: serial("id").primaryKey(),
  to: text("to").notNull(),
  subject: text("subject").notNull(),
  text: text("text").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const cartItems = pgTable(
  "cart_items",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    variantId: integer("variant_id").notNull().references(() => variants.id, { onDelete: "cascade" }),
    quantity: integer("quantity").notNull().default(1),
    addedAt: timestamp("added_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("cart_user_variant_idx").on(t.userId, t.variantId)],
);

export type Address = { name: string; line1: string; line2?: string; city: string; region: string; postal: string; country: string };

export const orders = pgTable(
  "orders",
  {
    id: serial("id").primaryKey(),
    number: text("number").notNull().unique(),
    userId: integer("user_id").notNull().references(() => users.id),
    status: text("status").$type<"paid" | "cancelled">().notNull().default("paid"),
    subtotalCents: integer("subtotal_cents").notNull(),
    shippingCents: integer("shipping_cents").notNull(),
    totalCents: integer("total_cents").notNull(),
    shippingAddress: jsonb("shipping_address").$type<Address>().notNull(),
    cardLast4: text("card_last4").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("orders_user_idx").on(t.userId)],
);

export const orderItems = pgTable(
  "order_items",
  {
    id: serial("id").primaryKey(),
    orderId: integer("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
    productId: integer("product_id").notNull().references(() => products.id),
    variantId: integer("variant_id").notNull().references(() => variants.id),
    name: text("name").notNull(),
    colorway: text("colorway").notNull(),
    size: text("size").notNull(),
    quantity: integer("quantity").notNull(),
    unitCents: integer("unit_cents").notNull(),
    dropId: integer("drop_id").references(() => drops.id),
  },
  (t) => [index("order_items_order_idx").on(t.orderId), index("order_items_drop_idx").on(t.dropId)],
);

export const queueEntries = pgTable(
  "queue_entries",
  {
    id: serial("id").primaryKey(),
    dropId: integer("drop_id").notNull().references(() => drops.id, { onDelete: "cascade" }),
    userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
    position: integer("position"),
    admittedAt: timestamp("admitted_at", { withTimezone: true }),
    passExpiresAt: timestamp("pass_expires_at", { withTimezone: true }),
    lateJoin: boolean("late_join").notNull().default(false),
  },
  (t) => [uniqueIndex("queue_drop_user_idx").on(t.dropId, t.userId), index("queue_drop_pos_idx").on(t.dropId, t.position)],
);

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

export const ordersRelations = relations(orders, ({ many }) => ({
  items: many(orderItems),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, { fields: [orderItems.orderId], references: [orders.id] }),
  product: one(products, { fields: [orderItems.productId], references: [products.id] }),
}));
