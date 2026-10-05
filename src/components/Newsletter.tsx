"use client";

import { useActionState } from "react";
import { subscribe, type NewsState } from "@/app/actions";

export function Newsletter() {
  const [state, action, pending] = useActionState<NewsState, FormData>(subscribe, null);
  return (
    <form action={action}>
      <div className="news">
        <label className="sr" htmlFor="news-email">Email</label>
        <input id="news-email" name="email" type="email" placeholder="Email address" required autoComplete="email" />
        <button type="submit" disabled={pending}>{pending ? "…" : "Sign up"}</button>
      </div>
      {state && <p role="status" style={{ fontSize: 13, marginTop: 8, color: state.ok ? "#9fd8b4" : "#f0a48f" }}>{state.message}</p>}
    </form>
  );
}
