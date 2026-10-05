"use server";

import { redirect } from "next/navigation";
import { and, eq, inArray, ne, sql } from "drizzle-orm";
import { randomInt } from "node:crypto";
import { z } from "zod";
import { db, schema } from "@/db";
import type { Address } from "@/db/schema";
import { currentUser } from "@/lib/auth";
import { shippingFor } from "@/lib/bag";
import { hasPass } from "@/lib/queue";
import { phase } from "@/lib/queue-math";
import type { FormState } from "@/app/account/actions";

const TEST_CARD = "4242424242424242";

const addressSchema = z.object({
  name: z.string().trim().min(2, "Enter the recipient's full name.").max(100),
  line1: z.string().trim().min(3, "Enter a street address.").max(120),
  line2: z.string().trim().max(120).optional(),
  city: z.string().trim().min(2, "Enter a city.").max(80),
  region: z.string().trim().regex(/^[A-Z]{2}$/, "Choose a state."),
  postal: z.string().trim().regex(/^\d{5}(-\d{4})?$/, "Enter a 5-digit ZIP code."),
});

const cardSchema = z.object({
  number: z.string().transform((s) => s.replace(/[\s-]/g, "")).refine((s) => s === TEST_CARD, "Your card was declined. Use the test card shown above."),
  exp: z.string().trim().regex(/^(0[1-9]|1[0-2])\s*\/\s*(\d{2})$/, "Enter the expiry as MM/YY."),
  cvc: z.string().trim().regex(/^\d{3,4}$/, "Enter the 3-digit security code."),
});

class CheckoutError extends Error {}

const str = (form: FormData, key: string) => {
  const v = form.get(key);
  return typeof v === "string" ? v : "";
};

export async function placeOrder(_prev: FormState, form: FormData): Promise<FormState> {
  const user = await currentUser();
  if (!user) redirect("/account/login?next=/checkout");

  const keys = ["name", "line1", "line2", "city", "region", "postal"] as const;
  const values = Object.fromEntries(keys.map((k) => [k, str(form, k)]));
  const fieldErrors: Record<string, string> = {};
  const address = addressSchema.safeParse({ ...values, line2: values.line2 || undefined });
  if (!address.success) for (const i of address.error.issues) fieldErrors[String(i.path[0])] ??= i.message;
  const card = cardSchema.safeParse({ number: str(form, "number"), exp: str(form, "exp"), cvc: str(form, "cvc") });
  if (!card.success) for (const i of card.error.issues) fieldErrors[String(i.path[0])] ??= i.message;
  if (card.success) {
    const [, mm, yy] = card.data.exp.match(/^(\d{2})\s*\/\s*(\d{2})$/)!;
    const now = new Date();
    if (Number(yy) + 2000 < now.getFullYear() || (Number(yy) + 2000 === now.getFullYear() && Number(mm) < now.getMonth() + 1)) {
      fieldErrors.exp = "Your card has expired.";
    }
  }
  if (Object.keys(fieldErrors).length) return { fieldErrors, values };

  const now = new Date();
  let number: string;
  try {
    number = await db.transaction(async (tx) => {
      // One checkout per customer at a time.
      await tx.execute(sql`select id from users where id = ${user.id} for update`);

      const lines = await tx
        .select({ line: schema.cartItems, product: schema.products, drop: schema.drops })
        .from(schema.cartItems)
        .innerJoin(schema.variants, eq(schema.variants.id, schema.cartItems.variantId))
        .innerJoin(schema.products, eq(schema.products.id, schema.variants.productId))
        .leftJoin(schema.drops, eq(schema.drops.id, schema.products.dropId))
        .where(eq(schema.cartItems.userId, user.id));
      if (lines.length === 0) throw new CheckoutError("Your bag is empty.");

      const variants = await tx
        .select()
        .from(schema.variants)
        .where(inArray(schema.variants.id, lines.map((l) => l.line.variantId)))
        .orderBy(schema.variants.id)
        .for("update");
      const byId = new Map(variants.map((v) => [v.id, v]));

      // Drop rules: a live drop needs an active pass, and every drop has a per-style limit.
      const dropLines = lines.filter((l) => l.drop);
      if (dropLines.length) {
        const ordered = await tx
          .select({ productId: schema.orderItems.productId, n: sql<number>`sum(${schema.orderItems.quantity})`.mapWith(Number) })
          .from(schema.orderItems)
          .innerJoin(schema.orders, eq(schema.orders.id, schema.orderItems.orderId))
          .where(and(eq(schema.orders.userId, user.id), ne(schema.orders.status, "cancelled"), inArray(schema.orderItems.productId, dropLines.map((l) => l.product.id))))
          .groupBy(schema.orderItems.productId);
        const had = new Map(ordered.map((o) => [o.productId, o.n]));
        const wanted = new Map<number, number>();
        for (const l of dropLines) {
          const d = l.drop!;
          if (d.startsAt > now) throw new CheckoutError(`${l.product.name} isn't available yet.`);
          if (phase(d, now) === "live" && !(await hasPass(d, user.id, now))) {
            throw new CheckoutError(`Your time to shop Drop ${String(d.number).padStart(2, "0")} has ended. Remove its items or rejoin the line.`);
          }
          wanted.set(l.product.id, (wanted.get(l.product.id) ?? 0) + l.line.quantity);
          if ((had.get(l.product.id) ?? 0) + wanted.get(l.product.id)! > d.perCustomerLimit) {
            throw new CheckoutError(`${l.product.name} is limited to ${d.perCustomerLimit} per customer.`);
          }
        }
      }

      for (const l of lines) {
        const v = byId.get(l.line.variantId)!;
        if (v.stock < l.line.quantity) {
          throw new CheckoutError(v.stock === 0 ? `${l.product.name} in size ${v.size} just sold out.` : `Only ${v.stock} left of ${l.product.name} in size ${v.size}.`);
        }
      }
      for (const l of lines) {
        await tx.update(schema.variants).set({ stock: sql`${schema.variants.stock} - ${l.line.quantity}` }).where(eq(schema.variants.id, l.line.variantId));
      }

      const subtotal = lines.reduce((n, l) => n + l.product.priceCents * l.line.quantity, 0);
      const shipping = shippingFor(subtotal);
      const orderNumber = `M${randomInt(10_000_000, 99_999_999)}`;
      const shippingAddress: Address = { ...address.data!, country: "US" };
      const [order] = await tx
        .insert(schema.orders)
        .values({ number: orderNumber, userId: user.id, subtotalCents: subtotal, shippingCents: shipping, totalCents: subtotal + shipping, shippingAddress, cardLast4: card.data!.number.slice(-4) })
        .returning({ id: schema.orders.id });
      await tx.insert(schema.orderItems).values(
        lines.map((l) => ({
          orderId: order.id,
          productId: l.product.id,
          variantId: l.line.variantId,
          name: l.product.name,
          colorway: l.product.colorway,
          size: byId.get(l.line.variantId)!.size,
          quantity: l.line.quantity,
          unitCents: l.product.priceCents,
          dropId: l.drop?.id ?? null,
        })),
      );
      await tx.delete(schema.cartItems).where(eq(schema.cartItems.userId, user.id));
      return orderNumber;
    });
  } catch (e) {
    if (e instanceof CheckoutError) return { error: e.message, values };
    throw e;
  }
  redirect(`/account/orders/${number}?placed=1`);
}
