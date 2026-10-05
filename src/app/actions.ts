"use server";

import { z } from "zod";
import { db, schema } from "@/db";

export type NewsState = { ok: boolean; message: string } | null;

export async function subscribe(_prev: NewsState, form: FormData): Promise<NewsState> {
  const parsed = z.string().trim().toLowerCase().email().max(254).safeParse(form.get("email"));
  if (!parsed.success) return { ok: false, message: "Enter a valid email address." };
  await db.insert(schema.subscribers).values({ email: parsed.data }).onConflictDoNothing();
  return { ok: true, message: "You're on the list. We'll email you before every drop." };
}
