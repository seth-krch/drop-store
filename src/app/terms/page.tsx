import type { Metadata } from "next";

export const metadata: Metadata = { title: "Terms of Use" };

export default function Terms() {
  return (
    <div className="wrap">
      <div className="prose">
        <h1 className="display">Terms of Use</h1>
        <p className="muted">Last updated October 2026</p>
        <h2>Orders and limits</h2>
        <p>Drop items are limited per customer. We may cancel orders that exceed a limit, that are placed through more than one account, or that are placed by automated means.</p>
        <h2>Automated access</h2>
        <p>You may not use bots, scripts, scrapers or other automated tools to create accounts, place orders, or access the site in a way that puts an unreasonable load on it. We use automated systems to detect and block this activity.</p>
        <h2>Payments</h2>
        <p>Mystic is a demo store. It does not process real payments, no charges are made, and no orders ship. Checkout is for demonstration only.</p>
        <h2>Changes</h2>
        <p>We may update these terms at any time. Continued use of the site means you accept the current terms.</p>
      </div>
    </div>
  );
}
