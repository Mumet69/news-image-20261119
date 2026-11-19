// The World in One Day — Thursday, 19 November 2026.
// A one-image newspaper front page summing up the day's world news.
// Drawn from scratch with Node's standard library only: a pixel buffer,
// a hand-written 5x7 bitmap font, and a small PNG encoder (zlib + CRC32).
// No network, no randomness, no timestamps: every run writes identical bytes.
import * as fs from "node:fs";
import * as path from "node:path";
import { deflateSync } from "node:zlib";

const W = 1024;
const H = 1024;

// ---- palette: newsprint cream, ink black, flag red/blue, gold ----
const PAPER: RGB = [247, 242, 230];
const INK: RGB = [20, 20, 20];
const INK_SOFT: RGB = [70, 66, 58];
const RED: RGB = [176, 30, 36];
const BLUE: RGB = [29, 78, 137];
const GOLD: RGB = [198, 148, 44];
const TEAL: RGB = [18, 110, 105];
const GREEN: RGB = [46, 110, 58];
const SKY: RGB = [126, 178, 214];
const SAND: RGB = [232, 222, 196];
const WHITE: RGB = [255, 255, 255];
const CARD: RGB = [255, 252, 244];
const LINE: RGB = [180, 172, 150];

type RGB = [number, number, number];

// ---- pixel buffer ----
const px = new Uint8Array(W * H * 3);
function paint(c: RGB): void {
  for (let i = 0; i < W * H; i++) {
    px[i * 3] = c[0];
    px[i * 3 + 1] = c[1];
    px[i * 3 + 2] = c[2];
  }
}
function set(x: number, y: number, c: RGB): void {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const i = (y * W + x) * 3;
  px[i] = c[0];
  px[i + 1] = c[1];
  px[i + 2] = c[2];
}
function rect(x: number, y: number, w: number, h: number, c: RGB): void {
  for (let yy = y; yy < y + h; yy++) {
    for (let xx = x; xx < x + w; xx++) set(xx, yy, c);
  }
}
function frame(x: number, y: number, w: number, h: number, c: RGB, t = 2): void {
  rect(x, y, w, t, c);
  rect(x, y + h - t, w, t, c);
  rect(x, y, t, h, c);
  rect(x + w - t, y, t, h, c);
}
function hline(x: number, y: number, w: number, c: RGB, t = 2): void {
  rect(x, y, w, t, c);
}
function disc(cx: number, cy: number, r: number, c: RGB): void {
  for (let y = -r; y <= r; y++) {
    for (let x = -r; x <= r; x++) {
      if (x * x + y * y <= r * r) set(cx + x, cy + y, c);
    }
  }
}
function ring(cx: number, cy: number, r: number, c: RGB, t = 3): void {
  for (let y = -r; y <= r; y++) {
    for (let x = -r; x <= r; x++) {
      const d = Math.sqrt(x * x + y * y);
      if (d <= r && d >= r - t) set(cx + x, cy + y, c);
    }
  }
}
// Right triangle pointing right, used as a small arrow / play mark.
function triRight(x: number, y: number, s: number, c: RGB): void {
  for (let row = 0; row < s; row++) {
    const w = row + 1;
    for (let col = 0; col < w; col++) set(x + col, y + row, c);
    for (let col = 0; col < w; col++) set(x + col, y + 2 * s - 2 - row, c);
  }
}

// ---- 5x7 bitmap font (uppercase; lowercase maps to uppercase) ----
const FONT: Record<string, string[]> = {
  A: ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
  B: ["11110", "10001", "10001", "11110", "10001", "10001", "11110"],
  C: ["01110", "10001", "10000", "10000", "10000", "10001", "01110"],
  D: ["11110", "10001", "10001", "10001", "10001", "10001", "11110"],
  E: ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
  F: ["11111", "10000", "10000", "11110", "10000", "10000", "10000"],
  G: ["01110", "10001", "10000", "10111", "10001", "10001", "01111"],
  H: ["10001", "10001", "10001", "11111", "10001", "10001", "10001"],
  I: ["01110", "00100", "00100", "00100", "00100", "00100", "01110"],
  J: ["00111", "00010", "00010", "00010", "00010", "10010", "01100"],
  K: ["10001", "10010", "10100", "11000", "10100", "10010", "10001"],
  L: ["10000", "10000", "10000", "10000", "10000", "10000", "11111"],
  M: ["10001", "11011", "10101", "10101", "10001", "10001", "10001"],
  N: ["10001", "11001", "10101", "10011", "10001", "10001", "10001"],
  O: ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
  P: ["11110", "10001", "10001", "11110", "10000", "10000", "10000"],
  Q: ["01110", "10001", "10001", "10001", "10101", "10010", "01101"],
  R: ["11110", "10001", "10001", "11110", "10100", "10010", "10001"],
  S: ["01111", "10000", "10000", "01110", "00001", "00001", "11110"],
  T: ["11111", "00100", "00100", "00100", "00100", "00100", "00100"],
  U: ["10001", "10001", "10001", "10001", "10001", "10001", "01110"],
  V: ["10001", "10001", "10001", "10001", "10001", "01010", "00100"],
  W: ["10001", "10001", "10001", "10101", "10101", "11011", "10001"],
  X: ["10001", "10001", "01010", "00100", "01010", "10001", "10001"],
  Y: ["10001", "10001", "01010", "00100", "00100", "00100", "00100"],
  Z: ["11111", "00001", "00010", "00100", "01000", "10000", "11111"],
  "0": ["01110", "10001", "10011", "10101", "11001", "10001", "01110"],
  "1": ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
  "2": ["01110", "10001", "00001", "00110", "01000", "10000", "11111"],
  "3": ["11111", "00010", "00100", "00010", "00001", "10001", "01110"],
  "4": ["00010", "00110", "01010", "10010", "11111", "00010", "00010"],
  "5": ["11111", "10000", "11110", "00001", "00001", "10001", "01110"],
  "6": ["00110", "01000", "10000", "11110", "10001", "10001", "01110"],
  "7": ["11111", "00001", "00010", "00100", "01000", "01000", "01000"],
  "8": ["01110", "10001", "10001", "01110", "10001", "10001", "01110"],
  "9": ["01110", "10001", "10001", "01111", "00001", "00010", "01100"],
  ".": ["00000", "00000", "00000", "00000", "00000", "01100", "01100"],
  ",": ["00000", "00000", "00000", "00000", "01100", "00100", "01000"],
  ":": ["00000", "01100", "01100", "00000", "01100", "01100", "00000"],
  ";": ["00000", "01100", "01100", "00000", "01100", "00100", "01000"],
  "-": ["00000", "00000", "00000", "01110", "00000", "00000", "00000"],
  "'": ["00100", "00100", "01000", "00000", "00000", "00000", "00000"],
  "/": ["00001", "00010", "00010", "00100", "01000", "01000", "10000"],
  "(": ["00010", "00100", "01000", "01000", "01000", "00100", "00010"],
  ")": ["01000", "00100", "00010", "00010", "00010", "00100", "01000"],
  "&": ["01100", "10010", "10100", "01000", "10101", "10010", "01101"],
  "!": ["00100", "00100", "00100", "00100", "00100", "00000", "00100"],
  "?": ["01110", "10001", "00001", "00110", "00100", "00000", "00100"],
  "%": ["11001", "11010", "00010", "00100", "01000", "01011", "10011"],
  "+": ["00000", "00100", "00100", "01110", "00100", "00100", "00000"],
  "=": ["00000", "00000", "11111", "00000", "11111", "00000", "00000"],
  $: ["00100", "01111", "10100", "01110", "00101", "11110", "00100"],
  "*": ["00000", "10101", "01110", "11111", "01110", "10101", "00000"],
  " ": ["00000", "00000", "00000", "00000", "00000", "00000", "00000"],
};
function textWidth(s: string, scale: number): number {
  const up = s.toUpperCase();
  return up.length * 6 * scale - scale;
}
function drawText(x: number, y: number, s: string, scale: number, c: RGB): void {
  const up = s.toUpperCase();
  let cx = x;
  for (const ch of up) {
    const g = FONT[ch] ?? FONT["?"];
    for (let row = 0; row < 7; row++) {
      for (let col = 0; col < 5; col++) {
        if (g[row][col] === "1") rect(cx + col * scale, y + row * scale, scale, scale, c);
      }
    }
    cx += 6 * scale;
  }
}
function drawCentred(cx: number, y: number, s: string, scale: number, c: RGB): void {
  drawText(cx - Math.floor(textWidth(s, scale) / 2), y, s, scale, c);
}
function wrap(s: string, maxChars: number): string[] {
  const words = s.split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    if (cur === "") cur = w;
    else if (cur.length + 1 + w.length <= maxChars) cur += " " + w;
    else {
      lines.push(cur);
      cur = w;
    }
  }
  if (cur !== "") lines.push(cur);
  return lines;
}
function drawPara(x: number, y: number, s: string, maxChars: number, scale: number, c: RGB, gap: number): number {
  const lines = wrap(s, maxChars);
  let yy = y;
  for (const ln of lines) {
    drawText(x, yy, ln, scale, c);
    yy += 7 * scale + gap;
  }
  return yy;
}

// ---- CRC32 + PNG encoder (deterministic: no ancillary chunks) ----
const CRC_TABLE: number[] = (() => {
  const t: number[] = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t.push(c >>> 0);
  }
  return t;
})();
function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type: string, data: Buffer): Buffer {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, "ascii");
  data.copy(out, 8);
  out.writeUInt32BE(crc32(Buffer.concat([Buffer.from(type, "ascii"), data])), 8 + data.length);
  return out;
}
function encodePng(): Buffer {
  const raw = Buffer.alloc(H * (1 + W * 3));
  for (let y = 0; y < H; y++) {
    raw[y * (1 + W * 3)] = 0;
    raw.set(px.subarray(y * W * 3, (y + 1) * W * 3), y * (1 + W * 3) + 1);
  }
  const idat = deflateSync(raw, { level: 9 });
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0);
  ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // truecolour RGB
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  return Buffer.concat([sig, chunk("IHDR", ihdr), chunk("IDAT", idat), chunk("IEND", Buffer.alloc(0))]);
}

// ---- layout: newspaper front page ----
paint(PAPER);
frame(14, 14, W - 28, H - 28, INK, 3);

// Top strip: date on the left, "one day" tag on the right.
rect(14, 14, W - 28, 34, INK);
drawText(30, 24, "THURSDAY, 19 NOVEMBER 2026", 2, WHITE);
drawText(W - 30 - textWidth("THE WORLD IN ONE DAY", 2), 24, "THE WORLD IN ONE DAY", 2, GOLD);

// Masthead.
drawCentred(W / 2, 66, "THE WORLD IN ONE DAY", 7, INK);
drawCentred(W / 2, 122, "THURSDAY, 19 NOVEMBER 2026", 3, RED);
hline(48, 152, W - 96, INK, 3);
drawCentred(W / 2, 162, "NINE STORIES THAT DEFINED THE DAY - FROM SHENZHEN TO GAZA", 2, INK_SOFT);

// ---- lead story: the Shenzhen trilateral ----
const LX = 48;
const LY = 196;
const LW = W - 96;
const LH = 252;
rect(LX, LY, LW, LH, CARD);
frame(LX, LY, LW, LH, INK, 2);
rect(LX, LY, LW, 30, RED);
drawText(LX + 14, LY + 8, "LEAD STORY  -  SHENZHEN, CHINA", 2, WHITE);

// Globe on the left of the lead panel.
const GX = LX + 92;
const GY = LY + 128;
disc(GX, GY, 62, SKY);
disc(GX, GY, 62, BLUE);
ring(GX, GY, 62, INK, 2);
// Continents as simple gold blobs on the globe.
disc(GX - 24, GY - 18, 17, GOLD);
disc(GX + 22, GY + 5, 20, GOLD);
disc(GX - 5, GY + 28, 13, GOLD);
rect(GX - 62, GY - 3, 124, 3, WHITE);
rect(GX - 3, GY - 62, 3, 124, WHITE);
// Three flag chips under the globe: US, China, Russia.
const flagY = LY + 206;
rect(LX + 30, flagY, 52, 26, RED);
rect(LX + 30, flagY, 52, 8, WHITE);
rect(LX + 30, flagY + 16, 52, 10, BLUE);
rect(LX + 94, flagY, 52, 26, RED);
disc(LX + 120, flagY + 13, 7, GOLD);
rect(LX + 158, flagY, 52, 26, WHITE);
rect(LX + 158, flagY, 52, 9, BLUE);
rect(LX + 158, flagY + 17, 52, 9, RED);

// Lead headline + deck on the right.
const TX = LX + 216;
drawPara(TX, LY + 48, "THREE POWERS MEET IN SHENZHEN", 24, 4, INK, 4);
drawPara(TX, LY + 128, "Trump, Xi and Putin hold the first three-way summit, with nuclear arms, Ukraine and Iran on the agenda.", 44, 2, INK_SOFT, 3);
drawText(TX, LY + 196, "APEC SIDELINES - FIRST TRILATERAL - NEW START GONE", 2, RED);

// ---- story grid: 3 columns x 3 rows ----
interface Story {
  kicker: string;
  head: string;
  detail: string;
  accent: RGB;
  icon: "bridge" | "flame" | "court" | "coin" | "handshake" | "leaf" | "atom" | "crowd" | "tank";
}
const STORIES: Story[] = [
  { kicker: "UKRAINE", head: "CRIMEA BRIDGE HIT AGAIN", detail: "Third strike this week; traffic halted.", accent: BLUE, icon: "bridge" },
  { kicker: "MIDDLE EAST", head: "IRAN HITS GULF STATES", detail: "Kuwait, Bahrain hit after Qeshm raid.", accent: RED, icon: "flame" },
  { kicker: "JUSTICE", head: "COURT RULES ON ROHINGYA", detail: "ICJ rules on Myanmar genocide case.", accent: TEAL, icon: "court" },
  { kicker: "EUROPE", head: "EU PLANS 45BN EURO LOAN", detail: "New loan funds Ukraine aid thru 2027.", accent: BLUE, icon: "coin" },
  { kicker: "AMERICAS", head: "US, VENEZUELA INK PACT", detail: "Military ties restored in Caracas.", accent: GREEN, icon: "handshake" },
  { kicker: "CLIMATE", head: "COP31 TALKS IN ANTALYA", detail: "Ministers push to unblock final text.", accent: TEAL, icon: "leaf" },
  { kicker: "ASIA", head: "NORTH KOREA ENRICHES MORE", detail: "IAEA: enrichment expanded at Yongbyon.", accent: GOLD, icon: "atom" },
  { kicker: "SOUTH ASIA", head: "BANGLADESH IN TURMOIL", detail: "Yunus home torched; 28 districts hit.", accent: RED, icon: "crowd" },
  { kicker: "GAZA", head: "TANKS ENTER CENTRAL GAZA", detail: "First ground move since ceasefire began.", accent: INK_SOFT, icon: "tank" },
];
function drawIcon(x: number, y: number, kind: Story["icon"], c: RGB): void {
  // Every icon is a 56x40 pictogram in the story's accent colour.
  if (kind === "bridge") {
    rect(x, y + 26, 56, 6, c);
    rect(x + 6, y + 6, 5, 26, c);
    rect(x + 45, y + 6, 5, 26, c);
    rect(x + 25, y, 6, 26, c);
  } else if (kind === "flame") {
    disc(x + 28, y + 24, 15, c);
    disc(x + 28, y + 12, 9, GOLD);
    disc(x + 28, y + 28, 6, WHITE);
  } else if (kind === "court") {
    rect(x + 4, y + 8, 48, 5, c);
    rect(x + 25, y + 13, 6, 18, c);
    rect(x + 4, y + 31, 48, 5, c);
    disc(x + 12, y + 20, 6, c);
    disc(x + 44, y + 20, 6, c);
  } else if (kind === "coin") {
    disc(x + 28, y + 20, 18, c);
    ring(x + 28, y + 20, 18, GOLD, 3);
    drawText(x + 20, y + 12, "45", 2, WHITE);
  } else if (kind === "handshake") {
    rect(x + 4, y + 14, 22, 12, c);
    rect(x + 30, y + 14, 22, 12, c);
    rect(x + 22, y + 18, 12, 8, GOLD);
  } else if (kind === "leaf") {
    disc(x + 28, y + 20, 17, c);
    rect(x + 26, y + 4, 4, 32, WHITE);
  } else if (kind === "atom") {
    disc(x + 28, y + 20, 7, c);
    ring(x + 28, y + 20, 16, c, 3);
    ring(x + 28, y + 20, 11, GOLD, 2);
  } else if (kind === "crowd") {
    disc(x + 14, y + 12, 8, c);
    disc(x + 28, y + 10, 9, c);
    disc(x + 42, y + 12, 8, c);
    rect(x + 6, y + 24, 16, 12, c);
    rect(x + 20, y + 22, 16, 14, c);
    rect(x + 36, y + 24, 16, 12, c);
  } else {
    rect(x + 4, y + 16, 40, 14, c);
    rect(x + 12, y + 6, 22, 10, c);
    rect(x + 40, y + 8, 14, 5, c);
    disc(x + 14, y + 34, 5, INK);
    disc(x + 38, y + 34, 5, INK);
  }
}
const GX0 = 48;
const GY0 = 472;
const CW = 288;
const CH = 148;
const CGAP = 16;
for (let i = 0; i < STORIES.length; i++) {
  const s = STORIES[i];
  const col = i % 3;
  const row = Math.floor(i / 3);
  const x = GX0 + col * (CW + CGAP);
  const y = GY0 + row * (CH + CGAP);
  rect(x, y, CW, CH, CARD);
  frame(x, y, CW, CH, LINE, 1);
  rect(x, y, CW, 5, s.accent);
  drawIcon(x + 12, y + 18, s.icon, s.accent);
  drawText(x + 80, y + 16, s.kicker, 2, s.accent);
  drawPara(x + 80, y + 38, s.head, 15, 2, INK, 2);
  drawPara(x + 12, y + 96, s.detail, 20, 2, INK_SOFT, 2);
}

// ---- footer briefs + colophon ----
const FY = GY0 + 3 * CH + 2 * CGAP + 12;
hline(48, FY, W - 96, INK, 2);
drawText(48, FY + 12, "ALSO TODAY", 2, RED);
drawText(48, FY + 34, "FIJI DROUGHT DISASTER. INDONESIA ASSET LAW. EU BACKS INDONESIA PACT.", 2, INK_SOFT);

// ---- write the image ----
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? "out";
fs.mkdirSync(outDir, { recursive: true });
const outPath = path.join(outDir, "entry.png");
fs.writeFileSync(outPath, encodePng());
console.log("wrote " + outPath);
