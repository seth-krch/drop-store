import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { readPending } from "@/lib/pending";
import { maskEmail } from "@/lib/format";
import { ResetConfirmForm } from "../../forms";

export const metadata: Metadata = { title: "Reset password", robots: { index: false } };

export default async function ResetConfirm() {
  const pending = await readPending();
  if (!pending || pending.purpose !== "reset") redirect("/account/reset");
  return (
    <div className="wrap">
      <div className="auth">
        <h1 className="display">Enter your code</h1>
        <p className="muted">If an account exists for <strong>{maskEmail(pending.subject)}</strong>, we sent it a 6-digit code.</p>
        <ResetConfirmForm />
      </div>
    </div>
  );
}
