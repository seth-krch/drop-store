// Pure waiting-room arithmetic, kept free of I/O so it can be unit tested.

export const ROOM_OPENS_MIN = 15; // waiting room opens this long before a drop
export const BATCH = 40; // shoppers admitted per wave
export const WAVE_S = 20; // seconds between waves
export const PASS_MIN = 10; // how long an admitted shopper may shop

export type DropWindow = { startsAt: Date; endsAt: Date };

export function phase(d: DropWindow, now: Date): "closed" | "room" | "live" | "ended" {
  if (now >= d.endsAt) return "ended";
  if (now >= d.startsAt) return "live";
  if (now.getTime() >= d.startsAt.getTime() - ROOM_OPENS_MIN * 60_000) return "room";
  return "closed";
}

/** Highest queue position allowed in at `now`. The first wave goes in at the start. */
export function admittedThrough(startsAt: Date, now: Date) {
  const elapsed = now.getTime() - startsAt.getTime();
  if (elapsed < 0) return 0;
  return BATCH * (Math.floor(elapsed / (WAVE_S * 1000)) + 1);
}

/** Seconds until `position` is admitted, or 0 if already in. */
export function waitSeconds(position: number, startsAt: Date, now: Date) {
  if (position <= admittedThrough(startsAt, now)) return 0;
  const wave = Math.ceil(position / BATCH) - 1;
  const at = startsAt.getTime() + wave * WAVE_S * 1000;
  return Math.max(0, Math.ceil((at - now.getTime()) / 1000));
}

/** Fisher–Yates with an injectable random source. */
export function shuffle<T>(items: T[], random: () => number = Math.random): T[] {
  const a = items.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** How many more units of a style a customer may buy. */
export function remainingAllowance(limit: number, alreadyOrdered: number, inBag: number) {
  return Math.max(0, limit - alreadyOrdered - inBag);
}
