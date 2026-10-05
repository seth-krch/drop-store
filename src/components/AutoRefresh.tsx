"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Re-renders the current page from the server every few seconds. */
export function AutoRefresh({ seconds }: { seconds: number }) {
  const router = useRouter();
  useEffect(() => {
    // Spread refreshes out so a full room doesn't poll in lockstep.
    const jitter = Math.random() * 0.4 + 0.8;
    const id = setTimeout(() => router.refresh(), seconds * 1000 * jitter);
    return () => clearTimeout(id);
  });
  return null;
}
