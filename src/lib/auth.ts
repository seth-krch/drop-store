import "server-only";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { and, eq, gt } from "drizzle-orm";
import { db, schema } from "@/db";
import { sha256, token } from "./crypto";
import { safeNext } from "./validation";

export { safeNext };

const COOKIE = "mystic_session";
const TTL_DAYS = 30;

export const cookieSecure = () => process.env.NODE_ENV === "production" && process.env.INSECURE_COOKIES !== "1";

export async function clientInfo() {
  const h = await headers();
  return {
    ip: (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || null,
    userAgent: h.get("user-agent")?.slice(0, 400) ?? null,
  };
}

export async function createSession(userId: number) {
  const raw = token();
  const expiresAt = new Date(Date.now() + TTL_DAYS * 864e5);
  const { ip, userAgent } = await clientInfo();
  await db.insert(schema.sessions).values({ id: sha256(raw), userId, expiresAt, ip, userAgent });
  (await cookies()).set(COOKIE, raw, { httpOnly: true, secure: cookieSecure(), sameSite: "lax", path: "/", expires: expiresAt });
}

export const currentUser = cache(async () => {
  const raw = (await cookies()).get(COOKIE)?.value;
  if (!raw) return null;
  const [row] = await db
    .select({ id: schema.users.id, email: schema.users.email, name: schema.users.name, verified: schema.users.emailVerifiedAt })
    .from(schema.sessions)
    .innerJoin(schema.users, eq(schema.users.id, schema.sessions.userId))
    .where(and(eq(schema.sessions.id, sha256(raw)), gt(schema.sessions.expiresAt, new Date())))
    .limit(1);
  return row && row.verified ? row : null;
});

export async function requireUser(next: string) {
  const user = await currentUser();
  if (!user) redirect(`/account/login?next=${encodeURIComponent(safeNext(next))}`);
  return user;
}

export async function destroySession() {
  const jar = await cookies();
  const raw = jar.get(COOKIE)?.value;
  if (raw) await db.delete(schema.sessions).where(eq(schema.sessions.id, sha256(raw)));
  jar.delete(COOKIE);
}
