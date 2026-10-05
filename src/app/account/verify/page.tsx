import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { readPending } from "@/lib/pending";
import { maskEmail } from "@/lib/format";
import { VerifyForm } from "../forms";

export const metadata: Metadata = { title: "Verify your email", robots: { index: false } };

export default async function Verify() {
  const pending = await readPending();
  if (!pending || pending.purpose !== "verify") redirect("/account/login");
  const [user] = await db.select({ email: schema.users.email }).from(schema.users).where(eq(schema.users.id, Number(pending.subject))).limit(1);
  if (!user) redirect("/account/signup");
  return (
    <div className="wrap">
      <div className="auth">
        <h1 className="display">Check your email</h1>
        <p className="muted">We sent a 6-digit code to <strong>{maskEmail(user.email)}</strong>. It expires in 15 minutes.</p>
        <VerifyForm />
      </div>
    </div>
  );
}
