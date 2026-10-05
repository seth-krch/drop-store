import "server-only";
import { and, eq, inArray, ne, sum } from "drizzle-orm";
import { db, schema } from "@/db";

export const FREE_SHIPPING_CENTS = 15000;
export const SHIPPING_CENTS = 800;
export const MAX_PER_LINE = 5;

export const shippingFor = (subtotal: number) => (subtotal === 0 || subtotal >= FREE_SHIPPING_CENTS ? 0 : SHIPPING_CENTS);

export async function bagCount(userId: number) {
  const [row] = await db.select({ n: sum(schema.cartItems.quantity).mapWith(Number) }).from(schema.cartItems).where(eq(schema.cartItems.userId, userId));
  return row?.n ?? 0;
}

export async function getBag(userId: number) {
  const rows = await db
    .select({
      id: schema.cartItems.id,
      quantity: schema.cartItems.quantity,
      variantId: schema.variants.id,
      size: schema.variants.size,
      stock: schema.variants.stock,
      productId: schema.products.id,
      slug: schema.products.slug,
      name: schema.products.name,
      colorway: schema.products.colorway,
      category: schema.products.category,
      priceCents: schema.products.priceCents,
      drop: schema.drops,
    })
    .from(schema.cartItems)
    .innerJoin(schema.variants, eq(schema.variants.id, schema.cartItems.variantId))
    .innerJoin(schema.products, eq(schema.products.id, schema.variants.productId))
    .leftJoin(schema.drops, eq(schema.drops.id, schema.products.dropId))
    .where(eq(schema.cartItems.userId, userId))
    .orderBy(schema.cartItems.addedAt);
  const subtotal = rows.reduce((n, r) => n + r.priceCents * r.quantity, 0);
  const shipping = shippingFor(subtotal);
  return { items: rows, subtotal, shipping, total: subtotal + shipping, count: rows.reduce((n, r) => n + r.quantity, 0) };
}

export type Bag = Awaited<ReturnType<typeof getBag>>;

/** Units of each product this customer already has on non-cancelled orders. */
export async function orderedCounts(userId: number, productIds: number[]) {
  if (productIds.length === 0) return new Map<number, number>();
  const rows = await db
    .select({ productId: schema.orderItems.productId, n: sum(schema.orderItems.quantity).mapWith(Number) })
    .from(schema.orderItems)
    .innerJoin(schema.orders, eq(schema.orders.id, schema.orderItems.orderId))
    .where(and(eq(schema.orders.userId, userId), ne(schema.orders.status, "cancelled"), inArray(schema.orderItems.productId, productIds)))
    .groupBy(schema.orderItems.productId);
  return new Map(rows.map((r) => [r.productId, r.n]));
}
