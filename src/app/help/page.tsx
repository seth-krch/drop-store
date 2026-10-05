import type { Metadata } from "next";

export const metadata: Metadata = { title: "Help & FAQ" };

const QA: [string, string, string?][] = [
  ["When do drops open?", "Every drop opens at 10:00 Central. The waiting room opens 15 minutes before, and everyone inside is placed in line in a random order when the drop starts."],
  ["Is there a purchase limit?", "Most drops are limited to one item per style per customer. Orders over the limit, or from duplicate accounts, are cancelled and refunded."],
  ["How long does shipping take?", "Standard shipping takes 3–6 business days in the US and is free on orders over $150. Express shipping takes 1–2 business days.", "shipping"],
  ["What is your return policy?", "Unworn items can be returned within 30 days for a full refund. Drop items are final sale.", "returns"],
  ["How do your shoes fit?", "Most of our footwear fits true to size. The Eclipse High runs a half size large, so we recommend sizing down. Apparel sizes are listed on each product page.", "sizing"],
  ["Do you restock sold out items?", "Core colorways restock throughout the year. Drop colorways never restock."],
  ["Why was my order cancelled?", "Orders are cancelled if they break a drop limit, come from duplicate accounts, or fail our fraud checks. If you think we made a mistake, email us."],
];

export default function Help() {
  return (
    <div className="wrap">
      <div className="prose">
        <h1 className="display">Help</h1>
        <div className="faq">
          {QA.map(([q, a, id]) => (
            <details key={q} id={id}>
              <summary>{q}</summary>
              <p>{a}</p>
            </details>
          ))}
        </div>
        <h2>Still need help?</h2>
        <p>Email support@mystic.example and we’ll reply within one business day.</p>
      </div>
    </div>
  );
}
