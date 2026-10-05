"use client";

import { useEffect, useState } from "react";

const parts = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  return { d: Math.floor(s / 86400), h: Math.floor((s % 86400) / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 };
};

export function Countdown({ to, serverNow, done = "Live now", label = "Time until drop" }: { to: string; serverNow: number; done?: string; label?: string }) {
  const target = new Date(to).getTime();
  // Start from the server's clock so the first paint matches the HTML.
  const [left, setLeft] = useState(target - serverNow);
  useEffect(() => {
    const id = setInterval(() => setLeft(target - Date.now()), 1000);
    return () => clearInterval(id);
  }, [target]);
  const p = parts(left);
  if (left <= 0) return <span className="pill pill--live">{done}</span>;
  return (
    <div className="count" role="timer" aria-label={label}>
      {([["d", "Days"], ["h", "Hrs"], ["m", "Min"], ["s", "Sec"]] as const).map(([k, l]) => (
        <div key={k}><b>{String(p[k]).padStart(2, "0")}</b><span>{l}</span></div>
      ))}
    </div>
  );
}
