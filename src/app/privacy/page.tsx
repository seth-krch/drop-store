import type { Metadata } from "next";

export const metadata: Metadata = { title: "Privacy Policy" };

export default function Privacy() {
  return (
    <div className="wrap">
      <div className="prose">
        <h1 className="display">Privacy Policy</h1>
        <p className="muted">Last updated October 2026</p>
        <h2>What we collect</h2>
        <p>When you create an account we collect your name, email address and password (stored as a secure hash). When you sign up for drop alerts we collect your email address.</p>
        <h2>Security and fraud prevention</h2>
        <p>To protect accounts and keep drops fair, we collect technical information about your device and connection, including your IP address, browser and device characteristics, and how you interact with pages such as sign-up and checkout. We use this only to detect fraud, bots and abuse.</p>
        <h2>Retention</h2>
        <p>Security data is kept for up to 30 days. Account data is kept until you delete your account.</p>
        <h2>Sharing</h2>
        <p>We don’t sell your data. We share it only with service providers that help us run the store, such as our email provider.</p>
        <h2>Demo store</h2>
        <p>Mystic is a demo store. It takes no real payments and ships no orders. Use a test email address and a password you don’t use anywhere else.</p>
        <h2>Contact</h2>
        <p>privacy@mystic.example</p>
      </div>
    </div>
  );
}
