import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Bag", robots: { index: false } };

export default function Bag() {
  return (
    <div className="wrap">
      <div className="auth" style={{ textAlign: "center" }}>
        <h1 className="display">Your bag</h1>
        <p className="muted">Your bag is empty.</p>
        <Link className="btn" href="/shop">Shop new arrivals</Link>
      </div>
    </div>
  );
}
