"use server";

import { refresh } from "next/cache";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import { currentUser } from "@/lib/auth";
import { MAX_PER_LINE, orderedCounts } from "@/lib/bag";
import { hasPass } from "@/lib/queue";
import { remainingAllowance } from "@/lib/queue-math";

export type AddState = { ok?: boolean; error?: string; needsLogin?: boolean; queue?: string } | null;

const id = z.coerce.number().int().positive();

export async function addToBag(_prev: AddState, form: FormData): Promise<AddState> {
  const user = await currentUser();
  if (!user) return { needsLogin: true };
  const variantId = id.safeParse(form.get("variantId"));
  if (!variantId.success) return { error: "Choose a size first." };

  const now = new Date();
  const [row] = await db
    .select({ variant: schema.variants, product: schema.products, drop: schema.drops })
    .from(schema.variants)
    .innerJoin(schema.products, eq(schema.products.id, schema.variants.productId))
    .leftJoin(schema.drops, eq(schema.drops.id, schema.products.dropId))
    .where(eq(schema.variants.id, variantId.data))
    .limit(1);
  if (!row || (row.drop && row.drop.startsAt > now)) return { error: "This item isn't available." };
  const { variant, product, drop } = row;
  if (variant.stock <= 0) return { error: `Sold out in ${variant.size}.` };

  if (drop) {
    if (!(await hasPass(drop, user.id, now))) return { error: "Join the line to shop this drop.", queue: `/drops/${drop.slug}/queue` };
    const [inBag] = await db
      .select({ n: sql<number>`coalesce(sum(${schema.cartItems.quantity}), 0)`.mapWith(Number) })
      .from(schema.cartItems)
      .innerJoin(schema.variants, eq(schema.variants.id, schema.cartItems.variantId))
      .where(and(eq(schema.cartItems.userId, user.id), eq(schema.variants.productId, product.id)));
    const ordered = (await orderedCounts(user.id, [product.id])).get(product.id) ?? 0;
    if (remainingAllowance(drop.perCustomerLimit, ordered, inBag.n) === 0) {
      return { error: `Limit ${drop.perCustomerLimit} per customer for this style.` };
    }
  }

  const [line] = await db
    .select()
    .from(schema.cartItems)
    .where(and(eq(schema.cartItems.userId, user.id), eq(schema.cartItems.variantId, variant.id)))
    .limit(1);
  const cap = Math.min(variant.stock, MAX_PER_LINE);
  if (line && line.quantity >= cap) return { error: line.quantity >= variant.stock ? "You have all available stock in your bag." : `Limit ${MAX_PER_LINE} per size.` };

  await db
    .insert(schema.cartItems)
    .values({ userId: user.id, variantId: variant.id, quantity: 1 })
    .onConflictDoUpdate({ target: [schema.cartItems.userId, schema.cartItems.variantId], set: { quantity: sql`${schema.cartItems.quantity} + 1` } });
  refresh();
  return { ok: true };
}

export async function setQuantity(form: FormData) {
  const user = await currentUser();
  if (!user) return;
  const lineId = id.safeParse(form.get("line"));
  const qty = z.coerce.number().int().min(0).max(MAX_PER_LINE).safeParse(form.get("quantity"));
  if (!lineId.success || !qty.success) return;

  const [line] = await db
    .select({ id: schema.cartItems.id, quantity: schema.cartItems.quantity, stock: schema.variants.stock, productId: schema.variants.productId, drop: schema.drops })
    .from(schema.cartItems)
    .innerJoin(schema.variants, eq(schema.variants.id, schema.cartItems.variantId))
    .innerJoin(schema.products, eq(schema.products.id, schema.variants.productId))
    .leftJoin(schema.drops, eq(schema.drops.id, schema.products.dropId))
    .where(and(eq(schema.cartItems.id, lineId.data), eq(schema.cartItems.userId, user.id)))
    .limit(1);
  if (!line) return;

  if (qty.data === 0) {
    await db.delete(schema.cartItems).where(eq(schema.cartItems.id, line.id));
  } else {
    let max = Math.min(line.stock, MAX_PER_LINE);
    if (line.drop) {
      const ordered = (await orderedCounts(user.id, [line.productId])).get(line.productId) ?? 0;
      max = Math.min(max, Math.max(1, line.drop.perCustomerLimit - ordered));
    }
    await db.update(schema.cartItems).set({ quantity: Math.min(qty.data, max) }).where(eq(schema.cartItems.id, line.id));
  }
  refresh();
}
