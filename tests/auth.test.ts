import { describe, expect, it } from "vitest";
import { hashPassword, sign, unsign, verifyPassword } from "../src/lib/crypto";
import { passwordProblem, safeNext, signupSchema } from "../src/lib/validation";

describe("passwords", () => {
  it("verifies the right password and rejects others", async () => {
    const h = await hashPassword("correct horse battery");
    expect(h.startsWith("scrypt$")).toBe(true);
    expect(await verifyPassword("correct horse battery", h)).toBe(true);
    expect(await verifyPassword("correct horse batterY", h)).toBe(false);
  });

  it("rejects weak passwords", () => {
    expect(passwordProblem("short", "a@b.co")).toMatch(/10/);
    expect(passwordProblem("password123", "a@b.co")).toMatch(/common/);
    expect(passwordProblem("aaaaaaaaaaaa", "a@b.co")).toBeTruthy();
    expect(passwordProblem("jordan-runs-fast", "jordan@example.com")).toMatch(/email/);
    expect(passwordProblem("violet hour 77", "jordan@example.com")).toBeNull();
  });

  it("requires the terms box", () => {
    expect(signupSchema.safeParse({ name: "J", email: "j@example.com", password: "x" }).success).toBe(false);
    expect(signupSchema.safeParse({ name: "J", email: "J@Example.com ", password: "x", terms: "on" }).data?.email).toBe("j@example.com");
  });
});

describe("signed values", () => {
  it("round-trips and rejects tampering", () => {
    const s = sign("verify|42|/account", 60);
    expect(unsign(s)).toBe("verify|42|/account");
    expect(unsign(s.replace("42", "43"))).toBeNull();
    expect(unsign(undefined)).toBeNull();
  });

  it("expires", () => {
    expect(unsign(sign("x", -1))).toBeNull();
  });
});

describe("post-login redirects", () => {
  it("allows only same-site paths", () => {
    expect(safeNext("/drops/drop-07-oracle-pack/queue")).toBe("/drops/drop-07-oracle-pack/queue");
    expect(safeNext("//evil.example")).toBe("/account");
    expect(safeNext("/\\evil.example")).toBe("/account");
    expect(safeNext("https://evil.example")).toBe("/account");
    expect(safeNext(undefined)).toBe("/account");
  });
});
