import { describe, expect, it } from "vitest";
import { BATCH, ROOM_OPENS_MIN, WAVE_S, admittedThrough, phase, remainingAllowance, shuffle, waitSeconds } from "../src/lib/queue-math";

const startsAt = new Date("2026-10-08T15:00:00Z");
const endsAt = new Date("2026-10-08T16:00:00Z");
const at = (s: number) => new Date(startsAt.getTime() + s * 1000);

describe("drop phases", () => {
  it("opens the waiting room before the start", () => {
    expect(phase({ startsAt, endsAt }, at(-ROOM_OPENS_MIN * 60 - 1))).toBe("closed");
    expect(phase({ startsAt, endsAt }, at(-ROOM_OPENS_MIN * 60))).toBe("room");
    expect(phase({ startsAt, endsAt }, at(0))).toBe("live");
    expect(phase({ startsAt, endsAt }, endsAt)).toBe("ended");
  });
});

describe("admission", () => {
  it("admits nobody before the start and one wave at the start", () => {
    expect(admittedThrough(startsAt, at(-1))).toBe(0);
    expect(admittedThrough(startsAt, at(0))).toBe(BATCH);
    expect(admittedThrough(startsAt, at(WAVE_S - 1))).toBe(BATCH);
    expect(admittedThrough(startsAt, at(WAVE_S))).toBe(2 * BATCH);
  });

  it("estimates the wait until a position's wave", () => {
    expect(waitSeconds(1, startsAt, at(0))).toBe(0);
    expect(waitSeconds(BATCH + 1, startsAt, at(0))).toBe(WAVE_S);
    expect(waitSeconds(BATCH * 3, startsAt, at(5))).toBe(2 * WAVE_S - 5);
  });
});

describe("shuffle", () => {
  it("is a permutation and does not mutate its input", () => {
    const xs = Array.from({ length: 50 }, (_, i) => i);
    const out = shuffle(xs);
    expect(out).toHaveLength(50);
    expect([...out].sort((a, b) => a - b)).toEqual(xs);
    expect(xs[0]).toBe(0);
  });
});

describe("purchase limits", () => {
  it("counts past orders and the bag against the limit", () => {
    expect(remainingAllowance(1, 0, 0)).toBe(1);
    expect(remainingAllowance(1, 1, 0)).toBe(0);
    expect(remainingAllowance(2, 1, 1)).toBe(0);
    expect(remainingAllowance(1, 3, 0)).toBe(0);
  });
});
