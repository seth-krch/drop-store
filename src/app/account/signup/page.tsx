import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser, safeNext } from "@/lib/auth";
import { SignupForm } from "../forms";

export const metadata: Metadata = { title: "Create account", robots: { index: false } };

export default async function Signup({ searchParams }: PageProps<"/account/signup">) {
  const next = safeNext((await searchParams).next);
  if (await currentUser()) redirect(next);
  return (
    <div className="wrap">
      <div className="auth">
        <h1 className="display">Create account</h1>
        <p className="muted">You need an account to buy from a drop. We&rsquo;ll send a code to confirm your email.</p>
        <SignupForm next={next} />
        <p className="note auth__alt">Already have an account? <Link href={`/account/login?next=${encodeURIComponent(next)}`} className="u">Sign in</Link></p>
      </div>
    </div>
  );
}
