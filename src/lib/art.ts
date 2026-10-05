// Procedural product renders. Each product gets studio-style flat
// illustrations in its own palette, served from /img/p/<slug>/<view>.svg.
import type { Palette } from "@/db/schema";

const mix = (a: string, b: string, t: number) => {
  const p = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const A = p(a), B = p(b);
  return "#" + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, "0")).join("");
};

const eye = (cx: number, cy: number, s: number, c: string) =>
  `<g transform="translate(${cx} ${cy}) scale(${s})" fill="none" stroke="${c}" stroke-width="5"><path d="M-30 0C-15-18 15-18 30 0C15 18-15 18-30 0Z"/><circle r="7" fill="${c}"/></g>`;

function sneaker(p: Palette, kind: "runner" | "low" | "high") {
  const collar = kind === "high" ? "C330 300 360 230 420 220 L520 220 C560 240 590 300 620 360" : "C340 360 380 330 440 320 L520 320 C560 330 600 360 640 400";
  return `
  <ellipse cx="410" cy="625" rx="300" ry="22" fill="#000" opacity=".12"/>
  <path d="M120 560 C110 600 150 618 210 618 L650 618 C705 618 720 595 706 560 Z" fill="${p.trim}"/>
  <path d="M118 560 L708 560 L704 584 L122 584 Z" fill="${mix(p.trim, "#ffffff", .55)}"/>
  <path d="M150 560 C130 480 170 410 250 395 ${collar} C680 450 712 510 708 560 Z" fill="${p.base}"/>
  <path d="M150 560 C135 500 160 455 210 440 C250 470 270 520 268 560 Z" fill="${mix(p.base, p.accent, .25)}"/>
  <path d="M600 560 C590 470 620 420 ${kind === "high" ? "640 360" : "660 420"} C690 450 712 510 708 560 Z" fill="${mix(p.base, p.trim, .35)}"/>
  <path d="M300 520 C360 430 470 400 560 430" fill="none" stroke="${p.accent}" stroke-width="16" stroke-linecap="round"/>
  ${[0, 1, 2, 3, 4].map((i) => `<line x1="${400 + i * 28}" y1="${kind === "high" ? 300 + i * 22 : 345 + i * 8}" x2="${420 + i * 28}" y2="${kind === "high" ? 330 + i * 22 : 372 + i * 8}" stroke="${p.accent}" stroke-width="7" stroke-linecap="round"/>`).join("")}
  ${eye(470, 500, 1.1, p.accent)}
  ${kind === "runner" ? `<path d="M170 584 Q400 560 700 584" fill="none" stroke="${p.accent}" stroke-width="4" stroke-dasharray="10 10"/>` : ""}`;
}

function slide(p: Palette) {
  return `<ellipse cx="410" cy="600" rx="290" ry="20" fill="#000" opacity=".12"/>
  <path d="M130 560 C120 595 160 600 220 600 L640 600 C700 600 712 585 700 560 Z" fill="${p.trim}"/>
  <path d="M140 555 C200 535 620 535 696 555 L700 562 L130 562 Z" fill="${mix(p.trim, "#fff", .4)}"/>
  <path d="M300 556 C300 430 560 420 600 556 Z" fill="${p.base}"/>${eye(450, 500, 1.2, p.accent)}`;
}

function top(p: Palette, kind: "hoodie" | "tee" | "long" | "crew") {
  const long = kind !== "tee";
  const sleeves = long
    ? `<path d="M250 260 L140 520 L195 545 L285 360 Z" fill="${mix(p.base, p.trim, .2)}"/><path d="M550 260 L660 520 L605 545 L515 360 Z" fill="${mix(p.base, p.trim, .2)}"/>
       <rect x="135" y="510" width="62" height="34" rx="8" transform="rotate(24 166 527)" fill="${p.trim}"/><rect x="603" y="510" width="62" height="34" rx="8" transform="rotate(-24 634 527)" fill="${p.trim}"/>`
    : `<path d="M250 260 L160 360 L220 410 L285 350 Z" fill="${mix(p.base, p.trim, .2)}"/><path d="M550 260 L640 360 L580 410 L515 350 Z" fill="${mix(p.base, p.trim, .2)}"/>`;
  const hood = kind === "hoodie" ? `<path d="M320 230 C320 140 480 140 480 230 C455 270 345 270 320 230 Z" fill="${mix(p.base, p.trim, .35)}"/><line x1="380" y1="270" x2="375" y2="350" stroke="${p.accent}" stroke-width="6"/><line x1="420" y1="270" x2="425" y2="350" stroke="${p.accent}" stroke-width="6"/>` : `<path d="M340 238 Q400 280 460 238" fill="none" stroke="${p.trim}" stroke-width="14"/>`;
  const pocket = kind === "hoodie" ? `<path d="M300 470 L500 470 L530 560 L270 560 Z" fill="${mix(p.base, p.trim, .15)}"/>` : "";
  return `<path d="M250 250 L340 228 Q400 260 460 228 L550 250 L560 630 L240 630 Z" fill="${p.base}"/>${sleeves}${hood}${pocket}
  <rect x="240" y="605" width="320" height="28" fill="${p.trim}"/>${eye(400, kind === "hoodie" ? 400 : 380, 1.4, p.accent)}`;
}

function jacket(p: Palette, kind: "shell" | "puffer" | "coach") {
  const quilts = kind === "puffer" ? [0, 1, 2, 3, 4, 5].map((i) => `<line x1="245" x2="555" y1="${300 + i * 55}" y2="${300 + i * 55}" stroke="${p.trim}" stroke-width="5" opacity=".6"/>`).join("") : "";
  return `<path d="M245 240 L345 215 L455 215 L555 240 L570 640 L230 640 Z" fill="${p.base}"/>
  <path d="M245 245 L130 560 L195 585 L285 360 Z" fill="${mix(p.base, p.trim, .2)}"/><path d="M555 245 L670 560 L605 585 L515 360 Z" fill="${mix(p.base, p.trim, .2)}"/>
  ${quilts}<path d="M345 215 L400 300 L455 215 L455 180 L345 180 Z" fill="${mix(p.base, p.trim, .4)}"/>
  <line x1="400" y1="300" x2="400" y2="640" stroke="${p.accent}" stroke-width="7"/>
  ${kind === "shell" ? `<path d="M270 330 L345 330" stroke="${p.accent}" stroke-width="5"/><text x="300" y="460" font-family="sans-serif" font-size="22" fill="${p.accent}" letter-spacing="4">✦ ✧ ✦</text>` : ""}
  ${kind === "coach" ? eye(480, 300, .8, p.accent) : ""}`;
}

function bottoms(p: Palette, kind: "cargo" | "sweat" | "short") {
  const len = kind === "short" ? 430 : 650;
  return `<path d="M270 200 L530 200 L560 ${len} L430 ${len} L400 330 L370 ${len} L240 ${len} Z" fill="${p.base}"/>
  <rect x="270" y="200" width="260" height="34" fill="${p.trim}"/>
  ${kind === "cargo" ? `<rect x="252" y="400" width="70" height="90" rx="8" fill="${mix(p.base, p.trim, .3)}"/><rect x="478" y="400" width="70" height="90" rx="8" fill="${mix(p.base, p.trim, .3)}"/>` : ""}
  ${kind === "short" ? `<path d="M240 ${len - 14} L370 ${len - 14} M430 ${len - 14} L560 ${len - 14}" stroke="${p.accent}" stroke-width="8"/>` : `<rect x="240" y="${len - 26}" width="130" height="26" fill="${p.trim}"/><rect x="430" y="${len - 26}" width="130" height="26" fill="${p.trim}"/>`}
  ${eye(320, 290, .7, p.accent)}`;
}

function accessory(p: Palette, kind: "cap" | "tote" | "sock" | "beanie") {
  switch (kind) {
    case "cap":
      return `<ellipse cx="400" cy="560" rx="250" ry="18" fill="#000" opacity=".1"/><path d="M220 470 C220 300 580 300 580 470 Z" fill="${p.base}"/><path d="M420 470 C520 470 650 490 660 520 C600 535 470 520 400 500 Z" fill="${p.trim}"/><circle cx="400" cy="322" r="12" fill="${p.trim}"/>${eye(360, 410, 1.1, p.accent)}`;
    case "tote":
      return `<path d="M330 260 C330 170 470 170 470 260" fill="none" stroke="${p.trim}" stroke-width="18"/><rect x="250" y="260" width="300" height="360" rx="6" fill="${p.base}"/>${eye(400, 440, 1.6, p.accent)}`;
    case "sock":
      return [0, 1, 2].map((i) => `<g transform="translate(${(i - 1) * 140} ${i * 10})"><path d="M360 200 L440 200 L440 470 C440 520 470 540 510 545 C540 550 545 600 500 605 L400 605 C360 605 360 560 360 520 Z" fill="${i === 1 ? p.base : mix(p.base, "#ffffff", .25 * i)}"/><rect x="360" y="200" width="80" height="40" fill="${p.trim}"/><circle cx="400" cy="330" r="10" fill="${p.accent}"/></g>`).join("");
    case "beanie":
      return `<path d="M260 520 C250 300 550 300 540 520 Z" fill="${p.base}"/>${[0, 1, 2, 3, 4, 5, 6, 7].map((i) => `<line x1="${285 + i * 33}" y1="360" x2="${285 + i * 33}" y2="440" stroke="${p.trim}" stroke-width="4" opacity=".5"/>`).join("")}<rect x="250" y="450" width="300" height="90" rx="10" fill="${p.trim}"/><rect x="370" y="475" width="60" height="40" fill="${p.accent}"/>`;
  }
}

export function renderProduct(name: string, palette: Palette, view: number) {
  const n = name.toLowerCase();
  const body =
    n.includes("runner") ? sneaker(palette, "runner")
    : n.includes("halo") ? sneaker(palette, "low")
    : n.includes("high") ? sneaker(palette, "high")
    : n.includes("slide") ? slide(palette)
    : n.includes("hoodie") ? top(palette, "hoodie")
    : n.includes("tee") ? top(palette, "tee")
    : n.includes("longsleeve") ? top(palette, "long")
    : n.includes("crewneck") ? top(palette, "crew")
    : n.includes("shell") ? jacket(palette, "shell")
    : n.includes("puffer") ? jacket(palette, "puffer")
    : n.includes("coach") ? jacket(palette, "coach")
    : n.includes("cargo") ? bottoms(palette, "cargo")
    : n.includes("sweatpant") ? bottoms(palette, "sweat")
    : n.includes("short") ? bottoms(palette, "short")
    : n.includes("cap") ? accessory(palette, "cap")
    : n.includes("tote") ? accessory(palette, "tote")
    : n.includes("sock") ? accessory(palette, "sock")
    : accessory(palette, "beanie");

  const bg = mix(palette.base, "#f3f1ec", 0.86);
  const transform =
    view === 2 ? "translate(800 0) scale(-1 1) translate(40 30) rotate(-6 400 400)"
    : view === 3 ? "translate(-420 -380) scale(2)"
    : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800" width="800" height="800"><rect width="800" height="800" fill="${bg}"/><g transform="${transform}">${body}</g></svg>`;
}
