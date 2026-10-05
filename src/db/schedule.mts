// Moves a drop's start time for local testing.
//   npm run drop:schedule -- <slug-or-number> <minutes-from-now> [--reset]
// --reset also clears the drop's queue and restocks its products.
import { drizzle } from "drizzle-orm/postgres-js";
import { eq, inArray } from "drizzle-orm";
import postgres from "postgres";
import * as schema from "./schema.ts";

const [which, minsArg, flag] = process.argv.slice(2);
const mins = Number(minsArg);
if (!which || Number.isNaN(mins)) {
  console.error("usage: npm run drop:schedule -- <slug-or-number> <minutes-from-now> [--reset]");
  process.exit(1);
}

const sql = postgres(process.env.DATABASE_URL!, { max: 1 });
const db = drizzle(sql, { schema });

const all = await db.select().from(schema.drops);
const drop = all.find((d) => d.slug === which || String(d.number) === which || d.slug.includes(which));
if (!drop) {
  console.error(`no drop matches "${which}". drops: ${all.map((d) => d.slug).join(", ")}`);
  process.exit(1);
}

const startsAt = new Date(Date.now() + mins * 60_000);
const endsAt = new Date(startsAt.getTime() + 60 * 60_000);
await db.transaction(async (tx) => {
  await tx.update(schema.drops).set({ startsAt, endsAt }).where(eq(schema.drops.id, drop.id));
  await tx.update(schema.products).set({ releasedAt: startsAt }).where(eq(schema.products.dropId, drop.id));
  if (flag === "--reset") {
    await tx.delete(schema.queueEntries).where(eq(schema.queueEntries.dropId, drop.id));
    const ids = (await tx.select({ id: schema.products.id }).from(schema.products).where(eq(schema.products.dropId, drop.id))).map((p) => p.id);
    if (ids.length) await tx.update(schema.variants).set({ stock: 12 }).where(inArray(schema.variants.productId, ids));
  }
});
console.log(`${drop.slug} now starts ${startsAt.toISOString()} (${mins} min from now)${flag === "--reset" ? ", queue cleared and restocked" : ""}`);
await sql.end();
