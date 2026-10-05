import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser, safeNext } from "@/lib/auth";
import { LoginForm } from "../forms";

export const metadata: Metadata = { title: "Sign in", robots: { index: false } };

export default async function Login({ searchParams }: PageProps<"/account/login">) {
  const next = safeNext((await searchParams).next);
  if (await currentUser()) redirect(next);
  return (
    <div className="wrap">
      <div className="auth">
        <h1 className="display">Sign in</h1>
        <LoginForm next={next} />
        <p className="note auth__alt">New to Mystic? <Link href={`/account/signup?next=${encodeURIComponent(next)}`} className="u">Create an account</Link></p>
      </div>
    </div>
  );
}
