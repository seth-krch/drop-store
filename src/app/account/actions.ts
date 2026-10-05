"use server";

import { redirect } from "next/navigation";
import { and, desc, eq, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { burnPasswordCheck, hashPassword, verifyPassword } from "@/lib/crypto";
import { createSession, destroySession, safeNext } from "@/lib/auth";
import { clearPending, readPending, setPending } from "@/lib/pending";
import { checkCode, issueCode, type CodeResult } from "@/lib/codes";
import { emailSchema, passwordProblem, signupSchema } from "@/lib/validation";

export type FormState = {
  error?: string;
  notice?: string;
  fieldErrors?: Record<string, string>;
  values?: Record<string, string>;
} | null;

const MAX_FAILED = 5;
const LOCK_MIN = 15;
const RESEND_GAP_S = 60;

const str = (form: FormData, key: string) => {
  const v = form.get(key);
  return typeof v === "string" ? v : "";
};

const CODE_MESSAGES: Record<Exclude<CodeResult, "ok">, string> = {
  invalid: "That code isn't right. Check the email and try again.",
  expired: "That code has expired. Request a new one.",
  locked: "Too many incorrect codes. Request a new one.",
};

// ---------------------------------------------------------------- signup

export async function signup(_prev: FormState, form: FormData): Promise<FormState> {
  const values = { name: str(form, "name"), email: str(form, "email") };
  const parsed = signupSchema.safeParse({ ...values, password: str(form, "password"), terms: form.get("terms") ?? undefined });
  const fieldErrors: Record<string, string> = {};
  if (!parsed.success) for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] ??= issue.message;
  const pwProblem = passwordProblem(str(form, "password"), values.email);
  if (pwProblem) fieldErrors.password = pwProblem;
  if (!parsed.success || pwProblem) return { fieldErrors, values };

  const { name, email, password } = parsed.data;
  const next = safeNext(str(form, "next"));
  const [existing] = await db.select().from(schema.users).where(eq(schema.users.email, email)).limit(1);
  if (existing?.emailVerifiedAt) {
    return { fieldErrors: { email: "An account with this email already exists. Sign in instead." }, values };
  }

  const passwordHash = await hashPassword(password);
  const [user] = existing
    ? await db.update(schema.users).set({ name, passwordHash }).where(eq(schema.users.id, existing.id)).returning()
    : await db.insert(schema.users).values({ name, email, passwordHash }).returning();

  if (form.get("news") === "on") await db.insert(schema.subscribers).values({ email }).onConflictDoNothing();
  await issueCode(user, "verify");
  await setPending("verify", String(user.id), next);
  redirect("/account/verify");
}

// ---------------------------------------------------------------- verify / reset codes

async function pendingUser() {
  const p = await readPending();
  if (!p) return null;
  const [user] =
    p.purpose === "verify"
      ? await db.select().from(schema.users).where(eq(schema.users.id, Number(p.subject))).limit(1)
      : await db.select().from(schema.users).where(eq(schema.users.email, p.subject)).limit(1);
  return { pending: p, user: user ?? null };
}

export async function verify(_prev: FormState, form: FormData): Promise<FormState> {
  const ctx = await pendingUser();
  if (!ctx?.user || ctx.pending.purpose !== "verify") redirect("/account/login");
  const code = str(form, "code").replace(/\s/g, "");
  const result = await checkCode(ctx.user.id, "verify", code);
  if (result !== "ok") return { error: CODE_MESSAGES[result] };

  await db.update(schema.users).set({ emailVerifiedAt: new Date(), failedLogins: 0, lockedUntil: null }).where(eq(schema.users.id, ctx.user.id));
  await clearPending();
  await createSession(ctx.user.id);
  redirect(ctx.pending.next);
}

export async function resendCode(): Promise<FormState> {
  const ctx = await pendingUser();
  if (!ctx) redirect("/account/login");
  const sent = { notice: "We sent a new code. It can take a minute to arrive." };
  if (!ctx.user) return sent; // reset for an unknown email: say the same thing
  const [last] = await db
    .select({ createdAt: schema.emailCodes.createdAt })
    .from(schema.emailCodes)
    .where(and(eq(schema.emailCodes.userId, ctx.user.id), eq(schema.emailCodes.purpose, ctx.pending.purpose)))
    .orderBy(desc(schema.emailCodes.createdAt))
    .limit(1);
  if (last && Date.now() - last.createdAt.getTime() < RESEND_GAP_S * 1000) {
    return { error: "Please wait a minute before requesting another code." };
  }
  await issueCode(ctx.user, ctx.pending.purpose);
  return sent;
}

// ---------------------------------------------------------------- login

export async function login(_prev: FormState, form: FormData): Promise<FormState> {
  const values = { email: str(form, "email") };
  const password = str(form, "password");
  const next = safeNext(str(form, "next"));
  const email = emailSchema.safeParse(values.email);
  if (!email.success || !password) return { error: "Enter your email and password.", values };

  const generic: FormState = { error: "Incorrect email or password.", values };
  const [user] = await db.select().from(schema.users).where(eq(schema.users.email, email.data)).limit(1);
  if (!user) {
    await burnPasswordCheck(password);
    return generic;
  }
  if (user.lockedUntil && user.lockedUntil > new Date()) {
    await burnPasswordCheck(password);
    return { error: "Too many sign-in attempts. Try again later or reset your password.", values };
  }
  if (!(await verifyPassword(password, user.passwordHash))) {
    const failed = user.failedLogins + 1;
    await db
      .update(schema.users)
      .set(
        failed >= MAX_FAILED
          ? { failedLogins: 0, lockedUntil: new Date(Date.now() + LOCK_MIN * 60_000) }
          : { failedLogins: sql`${schema.users.failedLogins} + 1` },
      )
      .where(eq(schema.users.id, user.id));
    return generic;
  }

  await db.update(schema.users).set({ failedLogins: 0, lockedUntil: null }).where(eq(schema.users.id, user.id));
  if (!user.emailVerifiedAt) {
    await issueCode(user, "verify");
    await setPending("verify", String(user.id), next);
    redirect("/account/verify");
  }
  await createSession(user.id);
  redirect(next);
}

export async function logout() {
  await destroySession();
  redirect("/");
}

// ---------------------------------------------------------------- password reset

export async function requestReset(_prev: FormState, form: FormData): Promise<FormState> {
  const values = { email: str(form, "email") };
  const email = emailSchema.safeParse(values.email);
  if (!email.success) return { fieldErrors: { email: "Enter a valid email address." }, values };
  const [user] = await db.select().from(schema.users).where(eq(schema.users.email, email.data)).limit(1);
  if (user) await issueCode(user, "reset");
  await setPending("reset", email.data, "/account");
  redirect("/account/reset/confirm");
}

export async function confirmReset(_prev: FormState, form: FormData): Promise<FormState> {
  const ctx = await pendingUser();
  if (!ctx || ctx.pending.purpose !== "reset") redirect("/account/reset");
  const code = str(form, "code").replace(/\s/g, "");
  const password = str(form, "password");
  const problem = passwordProblem(password, ctx.pending.subject);
  if (problem) return { fieldErrors: { password: problem }, values: { code } };
  if (!ctx.user) return { error: CODE_MESSAGES.invalid };

  const result = await checkCode(ctx.user.id, "reset", code);
  if (result !== "ok") return { error: CODE_MESSAGES[result] };

  const passwordHash = await hashPassword(password);
  await db.transaction(async (tx) => {
    await tx
      .update(schema.users)
      .set({ passwordHash, failedLogins: 0, lockedUntil: null, emailVerifiedAt: ctx.user!.emailVerifiedAt ?? new Date() })
      .where(eq(schema.users.id, ctx.user!.id));
    await tx.delete(schema.sessions).where(eq(schema.sessions.userId, ctx.user!.id));
  });
  await clearPending();
  await createSession(ctx.user.id);
  redirect("/account");
}
