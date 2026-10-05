import "server-only";
import { db, schema } from "@/db";

const FROM = process.env.MAIL_FROM ?? "Mystic <no-reply@mystic.example>";

/**
 * Sends an email through Resend when RESEND_API_KEY is set. Otherwise the
 * message is stored in the development outbox and logged.
 */
export async function sendMail(to: string, subject: string, text: string) {
  const key = process.env.RESEND_API_KEY;
  if (key) {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: FROM, to: [to], subject, text }),
    });
    if (!res.ok) throw new Error(`email send failed: ${res.status}`);
    return;
  }
  await db.insert(schema.outbox).values({ to, subject, text });
  console.log(`[mail] to=${to} subject=${JSON.stringify(subject)}`);
}
