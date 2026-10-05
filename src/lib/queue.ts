import "server-only";
import { randomInt } from "node:crypto";
import { and, eq, isNull, lte, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { PASS_MIN, admittedThrough, phase, shuffle } from "./queue-math";

type Drop = typeof schema.drops.$inferSelect;
type Entry = typeof schema.queueEntries.$inferSelect;

const cryptoRandom = () => randomInt(0, 2 ** 32) / 2 ** 32;

/**
 * Once a drop starts, everyone who waited in the room gets a random place in
 * line; anyone arriving later goes to the back in arrival order.
 */
async function assignPositions(drop: Drop, now: Date) {
  if (now < drop.startsAt) return;
  await db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(7001, ${drop.id})`);
    const unplaced = await tx
      .select({ id: schema.queueEntries.id, lateJoin: schema.queueEntries.lateJoin, joinedAt: schema.queueEntries.joinedAt })
      .from(schema.queueEntries)
      .where(and(eq(schema.queueEntries.dropId, drop.id), isNull(schema.queueEntries.position)));
    if (unplaced.length === 0) return;
    const [{ max }] = await tx
      .select({ max: sql<number>`coalesce(max(${schema.queueEntries.position}), 0)`.mapWith(Number) })
      .from(schema.queueEntries)
      .where(eq(schema.queueEntries.dropId, drop.id));
    const early = shuffle(unplaced.filter((e) => !e.lateJoin), cryptoRandom);
    const late = unplaced.filter((e) => e.lateJoin).sort((a, b) => a.joinedAt.getTime() - b.joinedAt.getTime() || a.id - b.id);
    let pos = max;
    for (const e of [...early, ...late]) {
      await tx.update(schema.queueEntries).set({ position: ++pos }).where(eq(schema.queueEntries.id, e.id));
    }
  });
}

export async function getEntry(dropId: number, userId: number) {
  const [e] = await db
    .select()
    .from(schema.queueEntries)
    .where(and(eq(schema.queueEntries.dropId, dropId), eq(schema.queueEntries.userId, userId)))
    .limit(1);
  return e ?? null;
}

export type QueueStatus =
  | { state: "closed" | "ended" | "not-joined" }
  | { state: "room"; entry: Entry }
  | { state: "waiting"; entry: Entry; ahead: number }
  | { state: "admitted"; entry: Entry; passExpiresAt: Date }
  | { state: "expired"; entry: Entry };

/** Where a shopper stands for a drop, admitting them if their wave has come. */
export async function queueStatus(drop: Drop, userId: number, now = new Date()): Promise<QueueStatus> {
  const p = phase(drop, now);
  if (p === "closed" || p === "ended") return { state: p };
  let entry = await getEntry(drop.id, userId);
  if (!entry) return { state: "not-joined" };
  if (p === "room") return { state: "room", entry };

  if (entry.position == null) {
    await assignPositions(drop, now);
    entry = (await getEntry(drop.id, userId))!;
  }
  if (entry.passExpiresAt) {
    return entry.passExpiresAt > now ? { state: "admitted", entry, passExpiresAt: entry.passExpiresAt } : { state: "expired", entry };
  }
  const through = admittedThrough(drop.startsAt, now);
  if (entry.position! <= through) {
    const passExpiresAt = new Date(now.getTime() + PASS_MIN * 60_000);
    const [updated] = await db
      .update(schema.queueEntries)
      .set({ admittedAt: now, passExpiresAt })
      .where(and(eq(schema.queueEntries.id, entry.id), isNull(schema.queueEntries.passExpiresAt)))
      .returning();
    const e = updated ?? (await getEntry(drop.id, userId))!;
    return { state: "admitted", entry: e, passExpiresAt: e.passExpiresAt! };
  }
  return { state: "waiting", entry, ahead: entry.position! - through - 1 };
}

export async function joinQueue(drop: Drop, userId: number, now = new Date()) {
  const p = phase(drop, now);
  if (p !== "room" && p !== "live") return false;
  await db
    .insert(schema.queueEntries)
    .values({ dropId: drop.id, userId, joinedAt: now, lateJoin: p === "live" })
    .onConflictDoNothing();
  return true;
}

/** Sends a shopper whose pass ran out to the back of the line. */
export async function rejoinQueue(drop: Drop, userId: number, now = new Date()) {
  if (phase(drop, now) !== "live") return;
  await db
    .update(schema.queueEntries)
    .set({ position: null, lateJoin: true, joinedAt: now, admittedAt: null, passExpiresAt: null })
    .where(and(eq(schema.queueEntries.dropId, drop.id), eq(schema.queueEntries.userId, userId), lte(schema.queueEntries.passExpiresAt, now)));
}

/** True when the shopper may buy items from this drop right now. */
export async function hasPass(drop: Drop, userId: number, now = new Date()) {
  if (phase(drop, now) !== "live") return phase(drop, now) === "ended";
  const e = await getEntry(drop.id, userId);
  return !!e?.passExpiresAt && e.passExpiresAt > now;
}
