// THE WORLD IN ONE DAY — 19 November 2026
// A one-page newspaper front page drawn as a 1024x1024 PNG.
// Node.js, standard library only. No network. Deterministic output:
// running it twice writes byte-identical PNGs.
//
// SPDX-License-Identifier: MIT

import * as fs from "node:fs";
import * as path from "node:path";
import * as zlib from "node:zlib";

const W = 1024;
const H = 1024;

// ---------------------------------------------------------------- palette
const PAPER: RGB = [246, 241, 227];
const INK: RGB = [26, 26, 26];
const NAVY: RGB = [30, 42, 74];
const RED: RGB = [176, 42, 42];
const GREY: RGB = [110, 105, 90];
const WHITE: RGB = [255, 255, 255];
const GOLD: RGB = [255, 214, 90];
const SKY: RGB = [214, 226, 240];

type RGB = [number, number, number];

// ---------------------------------------------------------------- canvas
const px = new Uint8Array(W * H * 3);

function fill(c: RGB): void {
  for (let i = 0; i < W * H; i++) {
    px[i * 3] = c[0];
    px[i * 3 + 1] = c[1];
    px[i * 3 + 2] = c[2];
  }
}

function setPixel(x: number, y: number, c: RGB): void {
  if (x < 0 || x >= W || y < 0 || y >= H) return;
  const i = (y * W + x) * 3;
  px[i] = c[0];
  px[i + 1] = c[1];
  px[i + 2] = c[2];
}

function rect(x: number, y: number, w: number, h: number, c: RGB): void {
  for (let yy = y; yy < y + h; yy++) {
    for (let xx = x; xx < x + w; xx++) setPixel(xx, yy, c);
  }
}

function hline(x: number, y: number, w: number, c: RGB, t = 1): void {
  rect(x, y, w, t, c);
}

// ---------------------------------------------------------------- 5x7 font
// Each glyph: 7 rows of 5 bits, written as strings, '#' = ink.
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
  W: ["10001", "10001", "10001", "10101", "10101", "10101", "01010"],
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
  " ": ["00000", "00000", "00000", "00000", "00000", "00000", "00000"],
  ".": ["00000", "00000", "00000", "00000", "00000", "01100", "01100"],
  ",": ["00000", "00000", "00000", "00000", "01100", "00100", "01000"],
  ":": ["00000", "01100", "01100", "00000", "01100", "01100", "00000"],
  ";": ["00000", "01100", "01100", "00000", "01100", "00100", "01000"],
  "-": ["00000", "00000", "00000", "01110", "00000", "00000", "00000"],
  "—": ["00000", "00000", "00000", "11111", "00000", "00000", "00000"],
  "–": ["00000", "00000", "00000", "01110", "00000", "00000", "00000"],
  "'": ["00100", "00100", "01000", "00000", "00000", "00000", "00000"],
  "’": ["00100", "00100", "01000", "00000", "00000", "00000", "00000"],
  "!": ["00100", "00100", "00100", "00100", "00100", "00000", "00100"],
  "?": ["01110", "10001", "00001", "00110", "00100", "00000", "00100"],
  "/": ["00001", "00010", "00010", "00100", "01000", "01000", "10000"],
  "(": ["00010", "00100", "01000", "01000", "01000", "00100", "00010"],
  ")": ["01000", "00100", "00010", "00010", "00010", "00100", "01000"],
  "$": ["00100", "01111", "10100", "01110", "00101", "11110", "00100"],
  "%": ["11001", "11010", "00010", "00100", "01000", "01011", "10011"],
  "&": ["01100", "10010", "10100", "01000", "10101", "10010", "01101"],
  "+": ["00000", "00100", "00100", "11111", "00100", "00100", "00000"],
  "=": ["00000", "00000", "11111", "00000", "11111", "00000", "00000"],
  "·": ["00000", "00000", "01100", "01100", "01100", "00000", "00000"],
  '"': ["01010", "01010", "01010", "00000", "00000", "00000", "00000"],
  "*": ["00000", "10101", "01110", "10101", "00000", "00000", "00000"],
};

const BLANK = ["00000", "00000", "00000", "00000", "00000", "00000", "00000"];

function charWidth(scale: number): number {
  return 6 * scale;
}

function textWidth(s: string, scale: number): number {
  return s.length * charWidth(scale) - scale; // no trailing gap
}

function drawChar(ch: string, x: number, y: number, scale: number, c: RGB): void {
  const g = FONT[ch.toUpperCase()] ?? BLANK;
  for (let r = 0; r < 7; r++) {
    for (let col = 0; col < 5; col++) {
      if (g[r][col] === "1") {
        rect(x + col * scale, y + r * scale, scale, scale, c);
      }
    }
  }
}

function drawText(s: string, x: number, y: number, scale: number, c: RGB): void {
  let cx = x;
  for (const ch of s) {
    drawChar(ch, cx, y, scale, c);
    cx += charWidth(scale);
  }
}

function drawTextCentered(s: string, cx: number, y: number, scale: number, c: RGB): void {
  drawText(s, cx - Math.floor(textWidth(s, scale) / 2), y, scale, c);
}

// Word-wrap into lines that fit maxWidth px at the given scale.
function wrap(s: string, maxWidth: number, scale: number): string[] {
  const words = s.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const trial = cur ? cur + " " + w : w;
    if (textWidth(trial, scale) <= maxWidth || !cur) {
      cur = trial;
    } else {
      lines.push(cur);
      cur = w;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

function drawWrapped(s: string, x: number, y: number, maxWidth: number, scale: number, c: RGB, lineH: number): number {
  const lines = wrap(s, maxWidth, scale);
  lines.forEach((ln, i) => drawText(ln, x, y + i * lineH, scale, c));
  return lines.length;
}

// ---------------------------------------------------------------- flags
function flagUS(x: number, y: number, w: number, h: number): void {
  const stripeH = Math.max(1, Math.round(h / 13));
  for (let i = 0; i < 13; i++) {
    rect(x, y + i * stripeH, w, stripeH, i % 2 === 0 ? RED : WHITE);
  }
  const cw = Math.round(w * 0.4);
  const ch = stripeH * 7;
  rect(x, y, cw, ch, NAVY);
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 5; c++) {
      rect(x + 4 + c * Math.floor((cw - 8) / 5), y + 3 + r * Math.floor((ch - 6) / 4), 2, 2, WHITE);
    }
  }
  rect(x, y, w, 1, INK);
  rect(x, y + h - 1, w, 1, INK);
  rect(x, y, 1, h, INK);
  rect(x + w - 1, y, 1, h, INK);
}

function star(cx: number, cy: number, r: number, c: RGB): void {
  // Small 5-point star approximated with a filled diamond + arms.
  for (let dy = -r; dy <= r; dy++) {
    const span = r - Math.abs(dy);
    for (let dx = -span; dx <= span; dx++) setPixel(cx + dx, cy + dy, c);
  }
  setPixel(cx, cy - r - 1, c);
  setPixel(cx - r - 1, cy, c);
  setPixel(cx + r + 1, cy, c);
}

function flagChina(x: number, y: number, w: number, h: number): void {
  rect(x, y, w, h, RED);
  star(x + Math.round(w * 0.2), y + Math.round(h * 0.28), 7, GOLD);
  star(x + Math.round(w * 0.42), y + Math.round(h * 0.16), 3, GOLD);
  star(x + Math.round(w * 0.5), y + Math.round(h * 0.3), 3, GOLD);
  star(x + Math.round(w * 0.44), y + Math.round(h * 0.48), 3, GOLD);
  star(x + Math.round(w * 0.3), y + Math.round(h * 0.52), 3, GOLD);
  rect(x, y, w, 1, INK);
  rect(x, y + h - 1, w, 1, INK);
  rect(x, y, 1, h, INK);
  rect(x + w - 1, y, 1, h, INK);
}

function flagRussia(x: number, y: number, w: number, h: number): void {
  const third = Math.round(h / 3);
  rect(x, y, w, third, WHITE);
  rect(x, y + third, w, third, [0, 60, 160]);
  rect(x, y + 2 * third, w, h - 2 * third, RED);
  rect(x, y, w, 1, INK);
  rect(x, y + h - 1, w, 1, INK);
  rect(x, y, 1, h, INK);
  rect(x + w - 1, y, 1, h, INK);
}

// ---------------------------------------------------------------- skyline
function skyline(x: number, y: number, w: number, h: number): void {
  rect(x, y, w, h, NAVY);
  // Deterministic building silhouettes (heights in px above the band base).
  const heights = [46, 78, 58, 92, 64, 108, 72, 52, 96, 60, 84, 48, 70, 100, 56, 80, 62, 90, 50, 74];
  const bw = Math.floor(w / heights.length);
  for (let i = 0; i < heights.length; i++) {
    const bh = heights[i];
    const bx = x + i * bw;
    rect(bx + 2, y + h - bh, bw - 4, bh, [16, 24, 48]);
    // Antenna on the tallest towers.
    if (bh >= 92) rect(bx + Math.floor(bw / 2), y + h - bh - 12, 2, 12, [16, 24, 48]);
    // Lit windows, deterministic pattern.
    for (let wy = y + h - bh + 8; wy < y + h - 8; wy += 12) {
      for (let wx = bx + 6; wx < bx + bw - 6; wx += 10) {
        if (((wx * 7 + wy * 13) % 5) < 2) rect(wx, wy, 3, 4, GOLD);
      }
    }
  }
  // Sun / moon disc.
  for (let dy = -14; dy <= 14; dy++) {
    for (let dx = -14; dx <= 14; dx++) {
      if (dx * dx + dy * dy <= 196) setPixel(x + w - 90 + dx, y + 26 + dy, GOLD);
    }
  }
}

// ---------------------------------------------------------------- PNG encoder
const CRC_TABLE: number[] = (() => {
  const t: number[] = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
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

function encodePNG(): Buffer {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0);
  ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type RGB
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const raw = Buffer.alloc(H * (1 + W * 3));
  for (let y = 0; y < H; y++) {
    raw[y * (1 + W * 3)] = 0; // filter: none
    raw.set(px.subarray(y * W * 3, (y + 1) * W * 3), y * (1 + W * 3) + 1);
  }
  const idat = zlib.deflateSync(raw, { level: 9 });

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// ---------------------------------------------------------------- layout
const M = 28; // page margin
const CW = W - 2 * M; // 968 content width

function drawMasthead(): void {
  drawTextCentered("THE WORLD IN ONE DAY", W / 2, 30, 6, NAVY);
  drawTextCentered("THURSDAY  ·  19 NOVEMBER 2026", W / 2, 84, 3, INK);
  hline(M, 116, CW, INK, 3);
  hline(M, 121, CW, INK, 1);
}

function drawLead(): void {
  drawTextCentered("— THE LEAD —", W / 2, 136, 2, RED);
  drawTextCentered("TRUMP, XI AND PUTIN MEET IN SHENZHEN", W / 2, 162, 4, INK);
  drawTextCentered("FIRST THREE-WAY SUMMIT", W / 2, 196, 4, NAVY);
  const body =
    "The first three-way summit of the US, Chinese and Russian leaders opens in Shenzhen " +
    "on the sidelines of APEC. Nuclear arms top the agenda as the New START treaty expires " +
    "in February 2026 — but no deal is expected.";
  drawWrapped(body, M + 40, 238, CW - 80, 2, INK, 20);

  // Picture band: skyline with the three flags on poles in front of it.
  const by = 306;
  const bh = 92;
  skyline(M, by, CW, bh);
  const fw = 132;
  const fh = 62;
  const fy = by + 8;
  const gap = Math.floor((CW - 3 * fw) / 4);
  const flags = [flagUS, flagChina, flagRussia];
  for (let i = 0; i < 3; i++) {
    const fx = M + gap + i * (fw + gap);
    // Pole.
    rect(fx - 4, fy - 2, 2, fh + 14, [60, 55, 45]);
    flags[i](fx, fy, fw, fh);
  }
  hline(M, by + bh + 8, CW, INK, 2);
}

interface Card {
  kicker: string;
  color: RGB;
  headline: string;
  body: string;
}

const CARDS: Card[] = [
  {
    kicker: "JUSTICE",
    color: [46, 90, 136],
    headline: "ICJ RULES ON ROHINGYA GENOCIDE CASE",
    body: "The world court in The Hague hands down its final, unappealable judgment in Gambia v. Myanmar over the Rohingya.",
  },
  {
    kicker: "MIDDLE EAST",
    color: [138, 90, 27],
    headline: "IRAN STRIKES GULF, KUWAIT REPELS ATTACK",
    body: "Iran attacks Gulf states; Kuwait repels the assault. The IAEA: Iran's 440.9 kg uranium stockpile is unverified.",
  },
  {
    kicker: "CLIMATE",
    color: [47, 107, 58],
    headline: "COP31 TALKS RACE TO BREAK DEADLOCK",
    body: "Ministers in Antalya scramble to break the deadlock at the COP31 climate talks, which close on Friday 20 November.",
  },
  {
    kicker: "BUSINESS",
    color: [107, 74, 138],
    headline: "ANTHROPIC IPO AT $83 — $1.51 TRILLION",
    body: "The biggest AI debut ever raises $81.3 billion — the largest IPO in history. Shares trade on Nasdaq as ANT from 19 November.",
  },
  {
    kicker: "WAR IN EUROPE",
    color: [176, 42, 42],
    headline: "UKRAINE HITS CRIMEA BRIDGE A THIRD TIME",
    body: "Ukraine strikes the Crimea Bridge for the third time this week; traffic is suspended.",
  },
  {
    kicker: "SPACE",
    color: [20, 88, 107],
    headline: "VOYAGER 1 REACHES ONE LIGHT-DAY FROM EARTH",
    body: "Voyager 1 becomes the first human-made object to travel one light-day from Earth, crossing the mark on 18 November.",
  },
];

function drawCard(c: Card, x: number, y: number, w: number, h: number): void {
  rect(x, y, w, h, WHITE);
  rect(x, y, w, 8, c.color);
  // Border.
  rect(x, y, w, 1, INK);
  rect(x, y + h - 1, w, 1, INK);
  rect(x, y, 1, h, INK);
  rect(x + w - 1, y, 1, h, INK);
  drawText(c.kicker, x + 14, y + 18, 2, c.color);
  hline(x + 14, y + 40, w - 28, GREY, 1);
  const n = drawWrapped(c.headline, x + 14, y + 50, w - 28, 2, INK, 20);
  drawWrapped(c.body, x + 14, y + 50 + n * 20 + 10, w - 28, 2, [60, 58, 52], 19);
}

function drawCards(): void {
  const colW = Math.floor((CW - 2 * 16) / 3); // 312
  const rowH = 228;
  const y0 = 420;
  const y1 = 656;
  for (let i = 0; i < 6; i++) {
    const col = i % 3;
    const row = Math.floor(i / 3);
    drawCard(CARDS[i], M + col * (colW + 16), row === 0 ? y0 : y1, colW, rowH);
  }
}

function drawFooter(): void {
  const fy = 902;
  const fh = 84;
  rect(M, fy, CW, fh, NAVY);
  drawTextCentered("— ALSO TODAY —", W / 2, fy + 10, 2, GOLD);
  const items = [
    "GTA VI LAUNCHES WORLDWIDE TODAY",
    "VAN GOGH SELLS FOR $190.4M — ARTIST RECORD",
    "JEFFRIES TO BE FIRST BLACK US HOUSE SPEAKER",
  ];
  const colW = Math.floor(CW / 3);
  for (let i = 0; i < 3; i++) {
    drawWrapped(items[i], M + i * colW + 12, fy + 36, colW - 24, 2, WHITE, 19);
  }
  drawTextCentered("19 NOVEMBER 2026", W / 2, 996, 2, GREY);
}

// ---------------------------------------------------------------- main
function main(): void {
  fill(PAPER);
  drawMasthead();
  drawLead();
  drawCards();
  drawFooter();

  const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, "entry.png");
  fs.writeFileSync(outPath, encodePNG());
  console.log("wrote " + outPath);
}

main();
