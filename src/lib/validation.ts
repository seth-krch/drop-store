// Pure validation rules for account forms, shared by server actions and tests.
import { z } from "zod";

const COMMON = new Set([
  "password", "password1", "password123", "1234567890", "12345678910", "qwertyuiop", "iloveyou12", "letmein123",
  "football12", "baseball12", "welcome123", "admin12345", "monkey1234", "dragon1234", "sunshine12", "princess12",
]);

export const emailSchema = z.string().trim().toLowerCase().email("Enter a valid email address.").max(254);

export function passwordProblem(password: string, email: string): string | null {
  if (password.length < 10) return "Use at least 10 characters.";
  if (password.length > 128) return "Use 128 characters or fewer.";
  if (COMMON.has(password.toLowerCase())) return "That password is too common.";
  if (email && password.toLowerCase().includes(email.split("@")[0].toLowerCase()) && email.split("@")[0].length >= 4)
    return "Don't include your email in your password.";
  if (/^(.)\1+$/.test(password)) return "That password is too easy to guess.";
  return null;
}

export const signupSchema = z.object({
  name: z.string().trim().min(1, "Enter your name.").max(80, "Use 80 characters or fewer."),
  email: emailSchema,
  password: z.string(),
  terms: z.literal("on", { message: "Agree to the terms to continue." }),
});

/** Only same-site relative paths are allowed as post-login destinations. */
export function safeNext(next: unknown, fallback = "/account") {
  return typeof next === "string" && /^\/(?![/\\])[\w\-./?=&%]*$/.test(next) ? next : fallback;
}
