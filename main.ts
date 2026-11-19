// news-image-20261119 — "19 November 2026: the world in one day".
// Draws a newspaper front page (1024x1024 PNG) with pure Node.js standard
// library only: a tiny 5x7 bitmap font, flat vector scenes, and a hand-rolled
// PNG encoder. No network, no dependencies, fully deterministic — two runs
// write byte-identical bytes.
//
// Run: mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { deflateSync } from 'node:zlib';

const W = 1024;
const H = 1024;

// ---------------------------------------------------------------------------
// 5x7 bitmap font (uppercase + digits + punctuation). Each glyph is 7 rows of
// 5 bits; bit 4 (16) is the leftmost pixel, bit 0 (1) the rightmost.
// ---------------------------------------------------------------------------
const FONT = {
  A: [0x0e, 0x11, 0x11, 0x1f, 0x11, 0x11, 0x11],
  B: [0x1e, 0x11, 0x11, 0x1e, 0x11, 0x11, 0x1e],
  C: [0x0e, 0x11, 0x10, 0x10, 0x10, 0x11, 0x0e],
  D: [0x1e, 0x11, 0x11, 0x11, 0x11, 0x11, 0x1e],
  E: [0x1f, 0x10, 0x10, 0x1e, 0x10, 0x10, 0x1f],
  F: [0x1f, 0x10, 0x10, 0x1e, 0x10, 0x10, 0x10],
  G: [0x0e, 0x11, 0x10, 0x17, 0x11, 0x11, 0x0f],
  H: [0x11, 0x11, 0x11, 0x1f, 0x11, 0x11, 0x11],
  I: [0x0e, 0x04, 0x04, 0x04, 0x04, 0x04, 0x0e],
  J: [0x07, 0x02, 0x02, 0x02, 0x02, 0x12, 0x0c],
  K: [0x11, 0x12, 0x14, 0x18, 0x14, 0x12, 0x11],
  L: [0x10, 0x10, 0x10, 0x10, 0x10, 0x10, 0x1f],
  M: [0x11, 0x1b, 0x15, 0x15, 0x11, 0x11, 0x11],
  N: [0x11, 0x19, 0x15, 0x13, 0x11, 0x11, 0x11],
  O: [0x0e, 0x11, 0x11, 0x11, 0x11, 0x11, 0x0e],
  P: [0x1e, 0x11, 0x11, 0x1e, 0x10, 0x10, 0x10],
  Q: [0x0e, 0x11, 0x11, 0x11, 0x15, 0x12, 0x0d],
  R: [0x1e, 0x11, 0x11, 0x1e, 0x14, 0x12, 0x11],
  S: [0x0f, 0x10, 0x10, 0x0e, 0x01, 0x01, 0x1e],
  T: [0x1f, 0x04, 0x04, 0x04, 0x04, 0x04, 0x04],
  U: [0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x0e],
  V: [0x11, 0x11, 0x11, 0x11, 0x11, 0x0a, 0x04],
  W: [0x11, 0x11, 0x11, 0x15, 0x15, 0x1b, 0x11],
  X: [0x11, 0x11, 0x0a, 0x04, 0x0a, 0x11, 0x11],
  Y: [0x11, 0x11, 0x0a, 0x04, 0x04, 0x04, 0x04],
  Z: [0x1f, 0x01, 0x02, 0x04, 0x08, 0x10, 0x1f],
  '0': [0x0e, 0x11, 0x13, 0x15, 0x19, 0x11, 0x0e],
  '1': [0x04, 0x0c, 0x04, 0x04, 0x04, 0x04, 0x0e],
  '2': [0x0e, 0x11, 0x01, 0x06, 0x08, 0x10, 0x1f],
  '3': [0x1e, 0x01, 0x01, 0x0e, 0x01, 0x01, 0x1e],
  '4': [0x02, 0x06, 0x0a, 0x12, 0x1f, 0x02, 0x02],
  '5': [0x1f, 0x10, 0x1e, 0x01, 0x01, 0x11, 0x0e],
  '6': [0x06, 0x08, 0x10, 0x1e, 0x11, 0x11, 0x0e],
  '7': [0x1f, 0x01, 0x02, 0x04, 0x08, 0x08, 0x08],
  '8': [0x0e, 0x11, 0x11, 0x0e, 0x11, 0x11, 0x0e],
  '9': [0x0e, 0x11, 0x11, 0x0f, 0x01, 0x02, 0x0c],
  ' ': [0, 0, 0, 0, 0, 0, 0],
  '.': [0, 0, 0, 0, 0, 0x0c, 0x0c],
  ',': [0, 0, 0, 0, 0x0c, 0x04, 0x08],
  ':': [0, 0x0c, 0x0c, 0, 0x0c, 0x0c, 0],
  ';': [0, 0x0c, 0x0c, 0, 0x0c, 0x04, 0x08],
  '!': [0x04, 0x04, 0x04, 0x04, 0x04, 0, 0x04],
  '?': [0x0e, 0x11, 0x01, 0x06, 0x04, 0, 0x04],
  '-': [0, 0, 0, 0x0e, 0, 0, 0],
  "'": [0x04, 0x04, 0x08, 0, 0, 0, 0],
  '"': [0x0a, 0x0a, 0, 0, 0, 0, 0],
  '(': [0x02, 0x04, 0x08, 0x08, 0x08, 0x04, 0x02],
  ')': [0x08, 0x04, 0x02, 0x02, 0x02, 0x04, 0x08],
  '/': [0x01, 0x02, 0x02, 0x04, 0x08, 0x08, 0x10],
  '&': [0x0c, 0x12, 0x14, 0x08, 0x15, 0x12, 0x0d],
  '$': [0x04, 0x0f, 0x14, 0x0e, 0x05, 0x1e, 0x04],
  '%': [0x19, 0x1a, 0x02, 0x04, 0x08, 0x0b, 0x13],
  '+': [0, 0x04, 0x04, 0x1f, 0x04, 0x04, 0],
  '=': [0, 0, 0x1f, 0, 0x1f, 0, 0],
  '·': [0, 0, 0, 0x0c, 0x0c, 0, 0],
};

// ---------------------------------------------------------------------------
// Canvas: a plain RGB buffer with flat-shape drawing helpers.
// ---------------------------------------------------------------------------
const px = new Uint8Array(W * H * 3);

function setPix(x, y, c) {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const i = (y * W + x) * 3;
  px[i] = c[0]; px[i + 1] = c[1]; px[i + 2] = c[2];
}

function rect(x, y, w, h, c) {
  const x0 = Math.max(0, Math.floor(x));
  const y0 = Math.max(0, Math.floor(y));
  const x1 = Math.min(W, Math.ceil(x + w));
  const y1 = Math.min(H, Math.ceil(y + h));
  for (let yy = y0; yy < y1; yy++) {
    for (let xx = x0; xx < x1; xx++) setPix(xx, yy, c);
  }
}

function circle(cx, cy, r, c) {
  const x0 = Math.floor(cx - r), x1 = Math.ceil(cx + r);
  const y0 = Math.floor(cy - r), y1 = Math.ceil(cy + r);
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const dx = x + 0.5 - cx, dy = y + 0.5 - cy;
      if (dx * dx + dy * dy <= r * r) setPix(x, y, c);
    }
  }
}

// Filled triangle (scanline).
function tri(x0, y0, x1, y1, x2, y2, c) {
  const minY = Math.max(0, Math.floor(Math.min(y0, y1, y2)));
  const maxY = Math.min(H - 1, Math.ceil(Math.max(y0, y1, y2)));
  for (let y = minY; y <= maxY; y++) {
    const xs = [];
    const edges = [[x0, y0, x1, y1], [x1, y1, x2, y2], [x2, y2, x0, y0]];
    for (const [ax, ay, bx, by] of edges) {
      if ((ay <= y && by > y) || (by <= y && ay > y)) {
        xs.push(ax + ((y - ay) / (by - ay)) * (bx - ax));
      }
    }
    if (xs.length >= 2) {
      const a = Math.max(0, Math.floor(Math.min(...xs)));
      const b = Math.min(W - 1, Math.ceil(Math.max(...xs)));
      for (let x = a; x <= b; x++) setPix(x, y, c);
    }
  }
}

// Thick line (Bresenham, square brush).
function line(x0, y0, x1, y1, c, t = 1) {
  const dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let err = dx - dy, x = x0, y = y0;
  const half = Math.floor(t / 2);
  for (let guard = 0; guard < 4096; guard++) {
    rect(x - half, y - half, t, t, c);
    if (x === x1 && y === y1) break;
    const e2 = 2 * err;
    if (e2 > -dy) { err -= dy; x += sx; }
    if (e2 < dx) { err += dx; y += sy; }
  }
}

// Five-pointed star.
function star(cx, cy, r, c) {
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const ang = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 === 0 ? r : r * 0.42;
    pts.push([cx + rr * Math.cos(ang), cy + rr * Math.sin(ang)]);
  }
  for (let i = 1; i < 9; i++) tri(pts[0][0], pts[0][1], pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], c);
}

// ---------------------------------------------------------------------------
// Text. All copy is uppercased; unknown glyphs become a space.
// ---------------------------------------------------------------------------
function textWidth(s, scale) {
  return s.length * 6 * scale - scale;
}

function drawText(s, x, y, scale, c) {
  const up = s.toUpperCase();
  let cx = x;
  for (const ch of up) {
    const g = FONT[ch] || FONT[' '];
    for (let row = 0; row < 7; row++) {
      for (let col = 0; col < 5; col++) {
        if ((g[row] >> (4 - col)) & 1) {
          rect(cx + col * scale, y + row * scale, scale, scale, c);
        }
      }
    }
    cx += 6 * scale;
  }
}

function drawTextCentered(s, cx, y, scale, c) {
  drawText(s, Math.round(cx - textWidth(s, scale) / 2), y, scale, c);
}

// Greedy word wrap to a pixel width.
function wrap(s, scale, maxW) {
  const words = s.toUpperCase().split(/\s+/).filter(Boolean);
  const lines = [];
  let cur = '';
  for (const w of words) {
    const trial = cur ? cur + ' ' + w : w;
    if (textWidth(trial, scale) <= maxW || !cur) {
      cur = trial;
    } else {
      lines.push(cur);
      cur = w;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

// ---------------------------------------------------------------------------
// PNG encoder (colour type 2, RGB, 8-bit). Deterministic: no timestamps.
// ---------------------------------------------------------------------------
const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, 'ascii');
  data.copy(out, 8);
  out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length);
  return out;
}

function encodePNG() {
  const raw = Buffer.alloc((W * 3 + 1) * H);
  for (let y = 0; y < H; y++) {
    raw[y * (W * 3 + 1)] = 0; // filter: none
    Buffer.from(px.buffer, y * W * 3, W * 3).copy(raw, y * (W * 3 + 1) + 1);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0);
  ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type: RGB
  ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  return Buffer.concat([
    sig,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', deflateSync(raw, { level: 9 })),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

// ---------------------------------------------------------------------------
// Palette and scenes. Flat, high-contrast shapes so every story reads at
// a glance, even small.
// ---------------------------------------------------------------------------
const PAPER = [248, 244, 234];
const INK = [26, 36, 51];
const NAVY = [20, 33, 61];
const NAVY2 = [38, 58, 94];
const RED = [192, 57, 43];
const GOLD = [201, 162, 39];
const WHITE = [255, 255, 255];
const SKY = [191, 217, 232];
const SKY2 = [148, 190, 214];
const SEA = [46, 94, 140];
const SEA2 = [24, 64, 104];
const GREEN = [31, 122, 109];
const GREEN2 = [64, 160, 90];
const GREY = [120, 128, 138];
const GREY2 = [88, 96, 106];
const SAND = [226, 208, 170];
const ORANGE = [224, 122, 40];
const BLACK = [10, 14, 22];

// --- Lead scene: Shenzhen skyline at dusk with the three flags. ----------
function sceneShenzhen(x, y, w, h) {
  rect(x, y, w, h, SKY);
  circle(x + 42, y + 40, 24, RED); // low sun, top left
  // skyline silhouette
  const towers = [0.10, 0.22, 0.16, 0.34, 0.26, 0.42, 0.30, 0.20, 0.38, 0.14];
  const base = y + h - 26;
  towers.forEach((f, i) => {
    const tw = w / towers.length;
    const th = Math.round(h * f);
    rect(x + i * tw + 3, base - th, tw - 6, th + 26, NAVY2);
    // lit windows
    for (let wy = base - th + 8; wy < base - 6; wy += 14) {
      for (let wx = x + i * tw + 8; wx < x + (i + 1) * tw - 6; wx += 12) {
        if (((wx * 7 + wy * 13) % 5) < 2) rect(wx, wy, 4, 5, GOLD);
      }
    }
  });
  rect(x, base, w, 26, NAVY);
  // three flag poles in front
  const poleX = [x + 62, x + w / 2, x + w - 62];
  const flagW = 74, flagH = 46;
  poleX.forEach((pxx, i) => {
    rect(pxx, y + 34, 4, base - y - 34, GREY2);
    circle(pxx + 2, y + 30, 5, GOLD);
    const fx = i === 2 ? pxx - flagW : pxx + 4, fy = y + 36; // last flag hangs left
    if (i === 0) {
      // United States: stripes + canton
      for (let s = 0; s < 7; s++) rect(fx, fy + s * 7, flagW, 7, s % 2 === 0 ? RED : WHITE);
      rect(fx, fy, 30, 21, NAVY);
      for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) rect(fx + 4 + c * 7, fy + 4 + r * 6, 3, 3, WHITE);
    } else if (i === 1) {
      // China: red field, gold stars
      rect(fx, fy, flagW, flagH, RED);
      star(fx + 14, fy + 12, 9, GOLD);
      star(fx + 32, fy + 8, 4, GOLD);
      star(fx + 40, fy + 16, 4, GOLD);
      star(fx + 36, fy + 26, 4, GOLD);
      star(fx + 26, fy + 30, 4, GOLD);
    } else {
      // Russia: white / blue / red
      rect(fx, fy, flagW, 15, WHITE);
      rect(fx, fy + 15, flagW, 16, SEA);
      rect(fx, fy + 31, flagW, 15, RED);
    }
  });
}

// --- ICJ: courthouse with columns and scales of justice. ------------------
function sceneCourt(x, y, w, h) {
  rect(x, y, w, h, SKY);
  const cx = x + w / 2;
  tri(cx - 62, y + 30, cx + 62, y + 30, cx, y + 8, NAVY); // pediment
  circle(cx, y + 22, 6, GOLD);
  for (let i = -2; i <= 2; i++) rect(cx + i * 26 - 6, y + 34, 12, 34, NAVY2); // columns
  rect(x + 22, y + 68, w - 44, 8, NAVY); // base
  // scales of justice, small, in front
  const sy = y + 34;
  line(cx, sy + 2, cx, sy + 34, INK, 3);
  line(cx - 20, sy + 8, cx + 20, sy + 8, INK, 3);
  line(cx - 20, sy + 8, cx - 28, sy + 22, INK, 2);
  line(cx - 20, sy + 8, cx - 12, sy + 22, INK, 2);
  tri(cx - 30, sy + 22, cx - 10, sy + 22, cx - 20, sy + 30, GOLD);
  line(cx + 20, sy + 8, cx + 12, sy + 22, INK, 2);
  line(cx + 20, sy + 8, cx + 28, sy + 22, INK, 2);
  tri(cx + 10, sy + 22, cx + 30, sy + 22, cx + 20, sy + 30, GOLD);
  rect(cx - 14, sy + 34, 28, 5, INK);
}

// --- Gulf: sea, a missile arc and a ship. ---------------------------------
function sceneGulf(x, y, w, h) {
  rect(x, y, w, h, SKY2);
  circle(x + w - 46, y + 22, 14, GOLD);
  rect(x, y + 48, w, h - 48, SEA);
  for (let i = 0; i < 4; i++) rect(x, y + 56 + i * 8, w, 2, SEA2);
  // missile arc
  line(x + 26, y + 44, x + 96, y + 14, WHITE, 4);
  line(x + 96, y + 14, x + 150, y + 26, WHITE, 4);
  circle(x + 150, y + 26, 7, ORANGE);
  circle(x + 150, y + 26, 3, RED);
  // ship
  const bx = x + w - 96, by = y + 58;
  rect(bx, by, 64, 12, NAVY);
  tri(bx + 4, by, bx + 24, by, bx + 4, by - 16, NAVY);
  rect(bx + 34, by - 12, 4, 12, GREY2);
  rect(bx + 40, by - 16, 14, 5, RED);
}

// --- COP31: globe with a leaf. --------------------------------------------
function sceneClimate(x, y, w, h) {
  rect(x, y, w, h, SKY);
  const cx = x + w / 2, cy = y + h / 2 + 2, r = 30;
  circle(cx, cy, r, SEA);
  // land blobs
  circle(cx - 12, cy - 8, 10, GREEN2);
  circle(cx + 10, cy + 6, 12, GREEN2);
  circle(cx + 14, cy - 12, 6, GREEN2);
  circle(cx - 2, cy + 14, 7, GREEN2);
  // leaf
  const lx = x + w - 34, ly = y + 16;
  tri(lx, ly, lx + 22, ly + 6, lx + 4, ly + 24, GREEN);
  line(lx + 4, ly + 24, lx + 18, ly + 4, GREEN2, 2);
}

// --- Anthropic IPO: rising chart. ------------------------------------------
function sceneIPO(x, y, w, h) {
  rect(x, y, w, h, PAPER);
  const ox = x + 16, oy = y + h - 16;
  line(ox, oy, ox + w - 30, oy, INK, 3); // axis
  line(ox, oy, ox, y + 14, INK, 3);
  const pts = [[ox + 8, oy - 8], [ox + 34, oy - 16], [ox + 58, oy - 12], [ox + 84, oy - 30], [ox + 112, oy - 26], [ox + 138, oy - 48]];
  for (let i = 0; i < pts.length - 1; i++) line(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], GREEN, 5);
  // arrowhead
  tri(pts[5][0] - 2, pts[5][1] + 12, pts[5][0] + 12, pts[5][1] - 2, pts[5][0] + 2, pts[5][1] + 2, GREEN);
  pts.forEach(([pxx, pyy]) => circle(pxx, pyy, 4, NAVY));
  rect(x + w - 78, y + 10, 66, 26, NAVY);
  drawText('$83', x + w - 70, y + 16, 2, WHITE);
}

// --- Crimea bridge: deck, towers, cables, smoke. --------------------------
function sceneBridge(x, y, w, h) {
  rect(x, y, w, h, SKY);
  rect(x, y + 56, w, h - 56, SEA2);
  for (let i = 0; i < 3; i++) rect(x, y + 62 + i * 8, w, 2, SEA);
  // towers
  rect(x + 44, y + 12, 8, 46, NAVY2);
  rect(x + w - 52, y + 12, 8, 46, NAVY2);
  // cables
  line(x + 48, y + 12, x + w / 2, y + 44, GREY2, 2);
  line(x + w - 48, y + 12, x + w / 2, y + 44, GREY2, 2);
  line(x + 48, y + 12, x + 24, y + 44, GREY2, 2);
  line(x + w - 48, y + 12, x + w - 24, y + 44, GREY2, 2);
  // deck
  rect(x + 12, y + 44, w - 24, 8, NAVY);
  // smoke over the middle
  circle(x + w / 2 - 8, y + 30, 10, GREY);
  circle(x + w / 2 + 6, y + 22, 12, GREY2);
  circle(x + w / 2 + 16, y + 32, 8, GREY);
  // blast flash
  star(x + w / 2, y + 48, 9, ORANGE);
}

// --- Voyager 1: black sky, stars, the probe. ------------------------------
function sceneVoyager(x, y, w, h) {
  rect(x, y, w, h, BLACK);
  const stars = [[18, 12], [52, 30], [88, 10], [120, 26], [150, 12], [178, 34], [205, 14], [240, 28], [272, 12], [36, 52], [150, 56], [236, 52], [290, 40], [70, 66], [190, 66]];
  stars.forEach(([sx, sy]) => { rect(x + sx, y + sy, 3, 3, WHITE); });
  circle(x + 24, y + 70, 5, GOLD);
  // dashed trajectory
  for (let i = 0; i < 10; i++) rect(x + 30 + i * 22, y + 62 - i * 2, 12, 2, GREY);
  // probe: dish + body + boom
  const px0 = x + w - 92, py0 = y + 30;
  circle(px0, py0, 14, WHITE);
  circle(px0, py0, 9, SKY2);
  rect(px0 + 10, py0 - 3, 30, 6, GREY);
  rect(px0 + 40, py0 - 5, 22, 10, GOLD);
  line(px0 + 40, py0 + 5, px0 + 66, py0 + 16, GREY, 3);
  circle(px0 + 68, py0 + 18, 4, RED);
}

// ---------------------------------------------------------------------------
// Layout: newspaper front page, 1024 x 1024.
// ---------------------------------------------------------------------------
function drawCard(x, y, w, h, scene, tag, headline, summary) {
  rect(x, y, w, h, WHITE);
  rect(x, y, w, h, INK); // border (drawn as outline below)
  rect(x + 1, y + 1, w - 2, h - 2, WHITE);
  scene(x + 1, y + 1, w - 2, 84);
  rect(x + 1, y + 85, w - 2, 2, INK);
  // tag
  rect(x + 10, y + 94, textWidth(tag, 2) + 12, 18, RED);
  drawText(tag, x + 16, y + 98, 2, WHITE);
  // headline (explicit lines, scale 3)
  headline.forEach((ln, i) => drawText(ln, x + 10, y + 120 + i * 26, 3, INK));
  // summary (wrapped, scale 2)
  const lines = wrap(summary, 2, w - 20);
  lines.slice(0, 3).forEach((ln, i) => drawText(ln, x + 10, y + 120 + headline.length * 26 + 6 + i * 18, 2, [64, 72, 84]));
}

function draw() {
  rect(0, 0, W, H, PAPER);

  // Masthead.
  rect(0, 0, W, 128, NAVY);
  drawTextCentered('THE WORLD IN ONE DAY', W / 2, 16, 2, GOLD);
  drawTextCentered('19 NOVEMBER 2026', W / 2, 42, 6, WHITE);
  drawTextCentered('THURSDAY', W / 2, 96, 2, WHITE);
  rect(0, 128, W, 6, RED);

  // Lead story.
  const leadX = 24, leadY = 146, leadW = 454, leadH = 284;
  rect(leadX, leadY, leadW, leadH, WHITE);
  sceneShenzhen(leadX, leadY, leadW, leadH);
  rect(leadX, leadY + leadH - 26, leadW, 26, NAVY);
  drawText('SHENZHEN · APEC', leadX + 12, leadY + leadH - 20, 2, WHITE);
  const tx = 500;
  drawText('LEAD — SUMMIT IN SHENZHEN', tx, 152, 2, RED);
  const head = wrap('TRUMP, XI AND PUTIN MEET IN SHENZHEN — FIRST THREE-WAY SUMMIT', 4, 500);
  head.forEach((ln, i) => drawText(ln, tx, 182 + i * 36, 4, INK));
  const sumY = 182 + head.length * 36 + 12;
  const sum = wrap('Nuclear arms top the agenda: the last US-Russia treaty expired in February. No deal is expected; Ukraine and Iran are also on the table.', 2, 500);
  sum.forEach((ln, i) => drawText(ln, tx, sumY + i * 20, 2, [64, 72, 84]));
  rect(tx, sumY + sum.length * 20 + 10, 120, 4, RED);

  // Divider.
  rect(24, 442, 976, 2, INK);

  // Story grid: 2 rows x 3 columns.
  const cols = [24, 354, 684];
  const rows = [456, 686];
  const cw = 316, ch = 216;
  drawCard(cols[0], rows[0], cw, ch, sceneCourt, 'JUSTICE', ['WORLD COURT', 'ROHINGYA VERDICT'], 'ICJ verdict in Gambia v Myanmar case.');
  drawCard(cols[1], rows[0], cw, ch, sceneGulf, 'MIDDLE EAST', ['IRAN STRIKES', 'GULF STATES'], 'Kuwait repels attack. IAEA: uranium unverifiable.');
  drawCard(cols[2], rows[0], cw, ch, sceneClimate, 'CLIMATE', ['CLIMATE TALKS', 'IN ANTALYA'], 'Ministers race to unblock the COP31 final text.');
  drawCard(cols[0], rows[1], cw, ch, sceneIPO, 'BUSINESS', ['ANTHROPIC IPO', '$83 A SHARE'], '$1.51 trillion valuation in a record AI debut.');
  drawCard(cols[1], rows[1], cw, ch, sceneBridge, 'WAR IN EUROPE', ['CRIMEA BRIDGE', 'HIT AGAIN'], 'Third strike this week; traffic suspended.');
  drawCard(cols[2], rows[1], cw, ch, sceneVoyager, 'SPACE', ['VOYAGER 1', 'ONE LIGHT-DAY'], 'First human-made object to reach one light-day.');

  // Bottom strip.
  rect(0, 916, W, 108, NAVY);
  drawText('ALSO TODAY:', 24, 930, 2, GOLD);
  drawText('GTA VI LAUNCHES WORLDWIDE · VAN GOGH SELLS FOR $190.4M, A RECORD', 24, 956, 2, WHITE);
  drawText('JEFFRIES SET TO BE FIRST BLACK US HOUSE SPEAKER', 24, 980, 2, WHITE);
  drawTextCentered('19 NOVEMBER 2026', W / 2, 1004, 2, GOLD);
}

function main() {
  draw();
  const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, 'entry.png'), encodePNG());
}

main();
