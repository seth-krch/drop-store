import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Sign in", robots: { index: false } };

export default function Login() {
  return (
    <div className="wrap">
      <div className="auth">
        <h1 className="display">Sign in</h1>
        <p className="note" role="status">Accounts are temporarily unavailable while we prepare for Drop 07. Check back soon.</p>
        <div className="field"><label htmlFor="email">Email</label><input id="email" type="email" autoComplete="email" disabled /></div>
        <div className="field"><label htmlFor="password">Password</label><input id="password" type="password" autoComplete="current-password" disabled /></div>
        <button className="btn btn--block" disabled>Sign in</button>
        <p className="note">New to Mystic? <Link href="/shop" style={{ textDecoration: "underline" }}>Keep shopping</Link></p>
      </div>
    </div>
  );
}
