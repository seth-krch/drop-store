import type { Metadata } from "next";

export const metadata: Metadata = { title: "About" };

export default function About() {
  return (
    <div className="wrap">
      <div className="prose">
        <h1 className="display">About Mystic</h1>
        <p>Mystic makes footwear and apparel in small, numbered drops. Each drop is designed around one idea and made in a single run.</p>
        <p>We keep runs small on purpose. When something sells out, it stays sold out, and the next drop is something new.</p>
        <h2>Contact</h2>
        <p>Questions about an order: support@mystic.example<br />Press and wholesale: hello@mystic.example</p>
      </div>
    </div>
  );
}
