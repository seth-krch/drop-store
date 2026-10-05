import "server-only";
import { createHash, createHmac, randomBytes, randomInt, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt) as (pw: string, salt: Buffer, len: number, opts: { N: number; r: number; p: number; maxmem: number }) => Promise<Buffer>;

const N = 1 << 15, R = 8, P = 1, KEYLEN = 32;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scryptAsync(password.normalize("NFKC"), salt, KEYLEN, { N, r: R, p: P, maxmem: 128 * N * R * 2 });
  return `scrypt$${N}$${R}$${P}$${salt.toString("base64url")}$${key.toString("base64url")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [alg, n, r, p, salt, key] = stored.split("$");
  if (alg !== "scrypt") return false;
  const expected = Buffer.from(key, "base64url");
  const actual = await scryptAsync(password.normalize("NFKC"), Buffer.from(salt, "base64url"), expected.length, {
    N: Number(n), r: Number(r), p: Number(p), maxmem: 128 * Number(n) * Number(r) * 2,
  });
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

// A hash of a real password so failed lookups take as long as real checks.
let dummy: string | null = null;
export async function burnPasswordCheck(password: string) {
  dummy ??= await hashPassword("not-a-real-password-placeholder");
  await verifyPassword(password, dummy);
}

export const token = (bytes = 32) => randomBytes(bytes).toString("base64url");
export const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");
export const sixDigits = () => String(randomInt(0, 1_000_000)).padStart(6, "0");

export function safeEqual(a: string, b: string) {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

function secret() {
  const s = process.env.AUTH_SECRET;
  if (s && s.length >= 32) return s;
  if (process.env.NODE_ENV === "production" && !process.env.ALLOW_DEV_SECRET) throw new Error("AUTH_SECRET must be set (32+ chars)");
  return "dev-only-secret-change-me-dev-only-secret";
}

/** Signs a small value so it can round-trip through a cookie untampered. */
export function sign(value: string, ttlSeconds: number) {
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  const body = `${value}.${exp}`;
  return `${body}.${createHmac("sha256", secret()).update(body).digest("base64url")}`;
}

export function unsign(signed: string | undefined): string | null {
  if (!signed) return null;
  const i = signed.lastIndexOf(".");
  if (i < 0) return null;
  const body = signed.slice(0, i);
  const mac = createHmac("sha256", secret()).update(body).digest("base64url");
  if (!safeEqual(mac, signed.slice(i + 1))) return null;
  const j = body.lastIndexOf(".");
  if (Number(body.slice(j + 1)) < Date.now() / 1000) return null;
  return body.slice(0, j);
}
