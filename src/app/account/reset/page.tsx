import type { Metadata } from "next";
import Link from "next/link";
import { ResetRequestForm } from "../forms";

export const metadata: Metadata = { title: "Reset password", robots: { index: false } };

export default function Reset() {
  return (
    <div className="wrap">
      <div className="auth">
        <h1 className="display">Reset password</h1>
        <p className="muted">Enter the email on your account and we&rsquo;ll send you a code.</p>
        <ResetRequestForm />
        <p className="note auth__alt"><Link href="/account/login" className="u">Back to sign in</Link></p>
      </div>
    </div>
  );
}
