import "server-only";
import { cookies } from "next/headers";
import type { CodePurpose } from "@/db/schema";
import { cookieSecure, safeNext } from "./auth";
import { sign, unsign } from "./crypto";

// Carries an in-progress email-code flow (verification or password reset)
// between pages without signing anyone in.
const PENDING = "mystic_pending";
const TTL = 30 * 60;

export async function setPending(purpose: CodePurpose, subject: string, next: string) {
  (await cookies()).set(PENDING, sign(`${purpose}|${subject}|${next}`, TTL), {
    httpOnly: true, secure: cookieSecure(), sameSite: "lax", path: "/account", maxAge: TTL,
  });
}

export async function readPending() {
  const raw = unsign((await cookies()).get(PENDING)?.value);
  if (!raw) return null;
  const [purpose, subject, next] = raw.split("|");
  if (purpose !== "verify" && purpose !== "reset") return null;
  return { purpose: purpose as CodePurpose, subject, next: safeNext(next) };
}

export async function clearPending() {
  (await cookies()).delete({ name: PENDING, path: "/account" });
}
