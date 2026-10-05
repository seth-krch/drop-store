"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { currentUser } from "@/lib/auth";
import { joinQueue, rejoinQueue } from "@/lib/queue";

async function load(form: FormData) {
  const slug = form.get("drop");
  if (typeof slug !== "string") return null;
  const drop = await db.query.drops.findFirst({ where: eq(schema.drops.slug, slug) });
  return drop ?? null;
}

export async function join(form: FormData) {
  const drop = await load(form);
  if (!drop) redirect("/drops");
  const user = await currentUser();
  if (!user) redirect(`/account/login?next=/drops/${drop.slug}/queue`);
  await joinQueue(drop, user.id);
  redirect(`/drops/${drop.slug}/queue`);
}

export async function rejoin(form: FormData) {
  const drop = await load(form);
  if (!drop) redirect("/drops");
  const user = await currentUser();
  if (!user) redirect(`/account/login?next=/drops/${drop.slug}/queue`);
  await rejoinQueue(drop, user.id);
  redirect(`/drops/${drop.slug}/queue`);
}
