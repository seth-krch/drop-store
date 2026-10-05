import "server-only";
import { and, desc, eq, isNull } from "drizzle-orm";
import { db, schema } from "@/db";
import type { CodePurpose } from "@/db/schema";
import { safeEqual, sha256, sixDigits } from "./crypto";
import { sendMail } from "./mail";

const TTL_MIN = 15;
export const MAX_ATTEMPTS = 5;

export async function issueCode(user: { id: number; email: string; name: string }, purpose: CodePurpose) {
  const code = sixDigits();
  await db.transaction(async (tx) => {
    // A new code replaces any earlier unused one.
    await tx
      .update(schema.emailCodes)
      .set({ consumedAt: new Date() })
      .where(and(eq(schema.emailCodes.userId, user.id), eq(schema.emailCodes.purpose, purpose), isNull(schema.emailCodes.consumedAt)));
    await tx.insert(schema.emailCodes).values({
      userId: user.id,
      purpose,
      codeHash: sha256(`${user.id}:${code}`),
      expiresAt: new Date(Date.now() + TTL_MIN * 60_000),
    });
  });
  const subject = purpose === "verify" ? `${code} is your Mystic verification code` : `${code} is your Mystic password reset code`;
  await sendMail(
    user.email,
    subject,
    `Hi ${user.name},\n\nYour code is ${code}. It expires in ${TTL_MIN} minutes.\n\nIf you didn't request this, you can ignore this email.\n\nMystic`,
  );
}

export type CodeResult = "ok" | "invalid" | "expired" | "locked";

export async function checkCode(userId: number, purpose: CodePurpose, input: string): Promise<CodeResult> {
  const [row] = await db
    .select()
    .from(schema.emailCodes)
    .where(and(eq(schema.emailCodes.userId, userId), eq(schema.emailCodes.purpose, purpose), isNull(schema.emailCodes.consumedAt)))
    .orderBy(desc(schema.emailCodes.createdAt))
    .limit(1);
  if (!row) return "expired";
  if (row.expiresAt < new Date()) return "expired";
  if (row.attempts >= MAX_ATTEMPTS) return "locked";
  const ok = /^\d{6}$/.test(input) && safeEqual(row.codeHash, sha256(`${userId}:${input}`));
  if (!ok) {
    await db.update(schema.emailCodes).set({ attempts: row.attempts + 1 }).where(eq(schema.emailCodes.id, row.id));
    return row.attempts + 1 >= MAX_ATTEMPTS ? "locked" : "invalid";
  }
  await db.update(schema.emailCodes).set({ consumedAt: new Date() }).where(eq(schema.emailCodes.id, row.id));
  return "ok";
}
