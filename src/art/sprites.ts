// Cartoon sprites drawn in code: thick dark outlines, round shapes, simple animation.
// Every function draws with the feet at (0, 0), facing right, and `s` as the full height in
// pixels. Flip with ctx.scale(-1, 1) to face left. No images to load, so it stays sharp on any
// screen and new looks (hats, armor, colors) are just a few lines.

type Ctx = CanvasRenderingContext2D;

export const OUTLINE = '#2a1b14';
const TAU = Math.PI * 2;

// ---------- helpers ----------

export function fillStroke(ctx: Ctx, fill: string, lw: number) {
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.lineWidth = lw;
  ctx.strokeStyle = OUTLINE;
  ctx.stroke();
}
export function circle(ctx: Ctx, x: number, y: number, r: number) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
}
export function oval(ctx: Ctx, x: number, y: number, rx: number, ry: number, rot = 0) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, rot, 0, TAU);
}
/** A rounded stick with an outline: arms, legs, handles. */
export function limb(
  ctx: Ctx,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  w: number,
  fill: string,
  lw: number,
) {
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = w + 2 * lw;
  ctx.stroke();
  ctx.strokeStyle = fill;
  ctx.lineWidth = w;
  ctx.stroke();
}
/** A spiky oval, for fur and messy hair. */
export function furPath(
  ctx: Ctx,
  x: number,
  y: number,
  rx: number,
  ry: number,
  n: number,
  j: number,
  seed: number,
) {
  ctx.beginPath();
  const m = n * 2;
  for (let i = 0; i <= m; i++) {
    const a = (i / m) * TAU;
    const r = i % 2 ? 1 - j * 0.3 : 1 + j * (0.7 + 0.3 * Math.sin(seed + i * 1.7));
    const px = x + Math.cos(a) * rx * r;
    const py = y + Math.sin(a) * ry * r;
    if (i) ctx.lineTo(px, py);
    else ctx.moveTo(px, py);
  }
  ctx.closePath();
}
export function polygon(ctx: Ctx, pts: [number, number][]) {
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.closePath();
}

const smooth = (u: number) => u * u * (3 - 2 * u);
/** Eases between [time, value] keyframes, for 0 ≤ p ≤ 1. */
export function keyframes(p: number, k: [number, number][]): number {
  for (let i = 1; i < k.length; i++) {
    if (p <= k[i]![0]) {
      const [p0, v0] = k[i - 1]!;
      const [p1, v1] = k[i]!;
      return v0 + (v1 - v0) * smooth((p - p0) / (p1 - p0));
    }
  }
  return k[k.length - 1]![1];
}

// ---------- thrown things ----------

export function drawRock(ctx: Ctx, x: number, y: number, r: number, lw = Math.max(1, r * 0.3)) {
  ctx.beginPath();
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * TAU;
    const rr = r * (0.85 + 0.2 * Math.sin(i * 2.3));
    if (i) ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    else ctx.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
  fillStroke(ctx, '#9c968c', lw);
  circle(ctx, x - r * 0.3, y - r * 0.3, r * 0.22);
  ctx.fillStyle = '#c9c4ba';
  ctx.fill();
}

/** A spear centered on (x, y), pointing along `ang`. `grip` slides it along its length. */
export function drawSpear(
  ctx: Ctx,
  x: number,
  y: number,
  ang: number,
  len: number,
  lw = Math.max(1, len * 0.03),
  grip = 0,
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ang);
  if (grip) ctx.translate(grip * len, 0);
  limb(ctx, -len * 0.55, 0, len * 0.38, 0, len * 0.05, '#8a5a2c', lw);
  polygon(ctx, [
    [len * 0.36, -len * 0.06],
    [len * 0.55, 0],
    [len * 0.36, len * 0.06],
  ]);
  fillStroke(ctx, '#8d8a85', lw);
  ctx.beginPath();
  ctx.moveTo(len * 0.33, -len * 0.05);
  ctx.lineTo(len * 0.38, len * 0.05);
  ctx.strokeStyle = '#d9c39a';
  ctx.lineWidth = len * 0.03;
  ctx.stroke();
  ctx.restore();
}

function drawClub(ctx: Ctx, x: number, y: number, ang: number, len: number, lw: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ang);
  limb(ctx, 0, 0, len * 0.7, 0, len * 0.12, '#8a5a2c', lw);
  oval(ctx, len * 0.78, 0, len * 0.24, len * 0.16);
  fillStroke(ctx, '#9b6a3a', lw);
  circle(ctx, len * 0.84, -len * 0.06, len * 0.04);
  ctx.fillStyle = '#6e4622';
  ctx.fill();
  ctx.restore();
}

// ---------- the net ----------

const ROPE = '#d9c39a';
const ROPE_DARK = '#9c7a45';

/** A rolled-up net held in the hand. */
export function drawNetBall(ctx: Ctx, x: number, y: number, r: number, lw: number) {
  circle(ctx, x, y, r);
  fillStroke(ctx, ROPE, lw);
  ctx.save();
  circle(ctx, x, y, r);
  ctx.clip();
  ctx.strokeStyle = ROPE_DARK;
  ctx.lineWidth = Math.max(1, r * 0.14);
  for (let k = -2; k <= 2; k++) {
    ctx.beginPath();
    ctx.moveTo(x - r, y + k * r * 0.45 - r * 0.5);
    ctx.lineTo(x + r, y + k * r * 0.45 + r * 0.5);
    ctx.moveTo(x - r, y + k * r * 0.45 + r * 0.5);
    ctx.lineTo(x + r, y + k * r * 0.45 - r * 0.5);
    ctx.stroke();
  }
  ctx.restore();
  circle(ctx, x, y, r);
  ctx.lineWidth = lw;
  ctx.strokeStyle = OUTLINE;
  ctx.stroke();
  // two stone weights dangling
  for (const [dx, dy] of [
    [-0.6, 1.1],
    [0.5, 1.2],
  ] as const) {
    ctx.beginPath();
    ctx.moveTo(x + dx * r * 0.6, y + r * 0.7);
    ctx.lineTo(x + dx * r, y + dy * r);
    ctx.strokeStyle = ROPE_DARK;
    ctx.lineWidth = Math.max(1, r * 0.12);
    ctx.stroke();
    drawRock(ctx, x + dx * r, y + dy * r + r * 0.15, r * 0.28, lw * 0.7);
  }
}

/** A net spread open (seen from a little above), centered on (x, y). `open` 0..1. */
export function drawNetFlying(
  ctx: Ctx,
  x: number,
  y: number,
  R: number,
  open: number,
  spin: number,
  lw: number,
) {
  const rx = R * (0.25 + 0.75 * open);
  const ry = rx * 0.55;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(Math.sin(spin) * 0.15);
  oval(ctx, 0, 0, rx, ry);
  ctx.fillStyle = 'rgba(217,195,154,.28)';
  ctx.fill();
  ctx.save();
  oval(ctx, 0, 0, rx, ry);
  ctx.clip();
  ctx.strokeStyle = ROPE_DARK;
  ctx.lineWidth = Math.max(1, lw * 0.8);
  const step = Math.max(6, R * 0.22);
  for (let k = -6; k <= 6; k++) {
    ctx.beginPath();
    ctx.moveTo(-rx + k * step, -ry);
    ctx.lineTo(rx + k * step - 2 * rx, ry * 1.6);
    ctx.moveTo(-rx + k * step, ry);
    ctx.lineTo(rx + k * step - 2 * rx, -ry * 1.6);
    ctx.stroke();
  }
  ctx.restore();
  oval(ctx, 0, 0, rx, ry);
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = lw * 2.4;
  ctx.stroke();
  ctx.strokeStyle = ROPE;
  ctx.lineWidth = lw * 1.2;
  ctx.stroke();
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * TAU + spin * 0.3;
    drawRock(ctx, Math.cos(a) * rx, Math.sin(a) * ry, R * 0.08, lw * 0.6);
  }
  ctx.restore();
}

/** A net thrown over a monster, feet at (x, y). w and h are the monster's size. */
export function drawNetOver(
  ctx: Ctx,
  x: number,
  y: number,
  w: number,
  h: number,
  lw: number,
  wiggle: number,
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(wiggle * 0.06);
  const dome = () => {
    ctx.beginPath();
    ctx.moveTo(-w * 0.55, 0);
    ctx.bezierCurveTo(-w * 0.6, -h * 1.2, w * 0.6, -h * 1.2, w * 0.55, 0);
    ctx.closePath();
  };
  dome();
  ctx.fillStyle = 'rgba(217,195,154,.22)';
  ctx.fill();
  ctx.save();
  dome();
  ctx.clip();
  ctx.strokeStyle = ROPE_DARK;
  ctx.lineWidth = Math.max(1.5, lw * 0.9);
  const step = Math.max(7, w * 0.16);
  for (let k = -12; k <= 12; k++) {
    ctx.beginPath();
    ctx.moveTo(k * step - h, -h);
    ctx.lineTo(k * step + h * 0.3, h * 0.3);
    ctx.moveTo(k * step + h, -h);
    ctx.lineTo(k * step - h * 0.3, h * 0.3);
    ctx.stroke();
  }
  ctx.restore();
  dome();
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = lw * 2.2;
  ctx.stroke();
  ctx.strokeStyle = ROPE;
  ctx.lineWidth = lw;
  ctx.stroke();
  for (const fx of [-0.5, -0.17, 0.17, 0.5]) drawRock(ctx, fx * w, -lw, w * 0.06, lw * 0.6);
  ctx.restore();
}

/** A coil of rope and a folded net at the feet. */
function drawNetPile(ctx: Ctx, s: number, lw: number) {
  oval(ctx, 0.3 * s, -0.05 * s, 0.14 * s, 0.06 * s);
  fillStroke(ctx, ROPE, lw);
  oval(ctx, 0.3 * s, -0.07 * s, 0.09 * s, 0.035 * s);
  ctx.strokeStyle = ROPE_DARK;
  ctx.lineWidth = lw;
  ctx.stroke();
  oval(ctx, 0.3 * s, -0.11 * s, 0.11 * s, 0.05 * s);
  fillStroke(ctx, ROPE, lw);
  oval(ctx, 0.3 * s, -0.12 * s, 0.05 * s, 0.02 * s);
  ctx.fillStyle = ROPE_DARK;
  ctx.fill();
}

// ---------- Ancient and Medieval gear ----------

export const BRONZE = '#d39b3a';
export const BRONZE_DARK = '#9c6a1f';
export const IRON = '#9aa1ab';
export const IRON_DARK = '#5f6670';
const WOOD = '#8a5a2c';
const WOOD_LIGHT = '#b07f4a';

/** A curved wooden bow held at (x, y), its belly facing right. */
function drawBow(ctx: Ctx, x: number, y: number, s: number, lw: number) {
  ctx.lineCap = 'round';
  for (const [w, c] of [
    [0.05 * s + 2 * lw, OUTLINE],
    [0.05 * s, WOOD],
  ] as const) {
    ctx.beginPath();
    ctx.arc(x - 0.3 * s, y, 0.3 * s, -0.95, 0.95);
    ctx.strokeStyle = c;
    ctx.lineWidth = w;
    ctx.stroke();
  }
}

/** An arrow centered on (x, y), pointing along `ang`. */
export function drawArrow(
  ctx: Ctx,
  x: number,
  y: number,
  ang: number,
  len: number,
  lw = Math.max(1, len * 0.03),
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ang);
  limb(ctx, -len * 0.5, 0, len * 0.36, 0, len * 0.045, WOOD_LIGHT, lw * 0.8);
  polygon(ctx, [
    [len * 0.32, -len * 0.08],
    [len * 0.52, 0],
    [len * 0.32, len * 0.08],
  ]);
  fillStroke(ctx, IRON, lw * 0.8);
  for (const k of [-1, 1]) {
    polygon(ctx, [
      [-len * 0.5, 0],
      [-len * 0.36, 0],
      [-len * 0.44, k * len * 0.1],
      [-len * 0.56, k * len * 0.1],
    ]);
    fillStroke(ctx, '#e6533c', lw * 0.6);
  }
  ctx.restore();
}

/** A boomerang centered on (x, y), turned by `ang`. `r` is about half its width. */
export function drawBoomerang(
  ctx: Ctx,
  x: number,
  y: number,
  r: number,
  ang: number,
  lw = Math.max(1, r * 0.2),
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ang);
  ctx.beginPath();
  ctx.moveTo(-r, r * 0.35);
  ctx.quadraticCurveTo(0, -r * 0.9, r, r * 0.35);
  ctx.quadraticCurveTo(r * 0.9, r * 0.6, r * 0.7, r * 0.45);
  ctx.quadraticCurveTo(0, -r * 0.3, -r * 0.7, r * 0.45);
  ctx.quadraticCurveTo(-r * 0.9, r * 0.6, -r, r * 0.35);
  ctx.closePath();
  fillStroke(ctx, '#c98a45', lw);
  ctx.beginPath();
  ctx.moveTo(-r * 0.55, r * 0.05);
  ctx.quadraticCurveTo(0, -r * 0.45, r * 0.55, r * 0.05);
  ctx.strokeStyle = '#2f9e8f';
  ctx.lineWidth = r * 0.12;
  ctx.stroke();
  ctx.restore();
}

/** A wooden bucket of hot oil hanging from a hand at (x, y). */
function drawBucket(ctx: Ctx, x: number, y: number, r: number, lw: number) {
  polygon(ctx, [
    [x - r * 0.5, y],
    [x + r * 0.5, y],
    [x + r * 0.38, y + r * 0.8],
    [x - r * 0.38, y + r * 0.8],
  ]);
  fillStroke(ctx, WOOD_LIGHT, lw);
  ctx.beginPath();
  ctx.moveTo(x - r * 0.45, y + r * 0.4);
  ctx.lineTo(x + r * 0.45, y + r * 0.4);
  ctx.strokeStyle = IRON_DARK;
  ctx.lineWidth = r * 0.1;
  ctx.stroke();
  oval(ctx, x, y, r * 0.5, r * 0.14);
  fillStroke(ctx, '#ffb547', lw * 0.7);
}

/** A glob of hot oil (orange, with a shine), centered on (x, y). */
export function drawOilBlob(ctx: Ctx, x: number, y: number, r: number, ang: number) {
  const lw = Math.max(1, r * 0.25);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ang);
  ctx.beginPath();
  ctx.moveTo(-r * 1.8, 0);
  ctx.quadraticCurveTo(-r * 0.4, -r * 1.05, r, -r * 0.6);
  ctx.arc(r * 0.2, 0, r, -0.9, 0.9);
  ctx.quadraticCurveTo(-r * 0.4, r * 1.05, -r * 1.8, 0);
  ctx.closePath();
  fillStroke(ctx, '#ffb547', lw);
  circle(ctx, r * 0.4, -r * 0.3, r * 0.28);
  ctx.fillStyle = '#fff3c4';
  ctx.fill();
  ctx.restore();
}

/** An iron pot of oil bubbling over a little fire. `s` is about its width. */
function drawCauldron(ctx: Ctx, x: number, y: number, s: number, t: number, lw: number) {
  // flames
  for (const [dx, h, c] of [
    [-0.22, 0.28, '#f07a2a'],
    [0.22, 0.26, '#f07a2a'],
    [0, 0.34, '#ffd34d'],
  ] as const) {
    const fl = h * s * (0.85 + 0.15 * Math.sin(t * 9 + dx * 20));
    polygon(ctx, [
      [x + (dx - 0.13) * s, y],
      [x + dx * s, y - fl],
      [x + (dx + 0.13) * s, y],
    ]);
    fillStroke(ctx, c, lw * 0.7);
  }
  ctx.beginPath();
  ctx.moveTo(x - 0.48 * s, y - 0.62 * s);
  ctx.quadraticCurveTo(x - 0.5 * s, y - 0.1 * s, x, y - 0.12 * s);
  ctx.quadraticCurveTo(x + 0.5 * s, y - 0.1 * s, x + 0.48 * s, y - 0.62 * s);
  ctx.closePath();
  fillStroke(ctx, '#4b4f5c', lw);
  oval(ctx, x, y - 0.62 * s, 0.5 * s, 0.1 * s);
  fillStroke(ctx, '#ffb547', lw);
  // bubbles pop up and burst
  for (let i = 0; i < 3; i++) {
    const u = (t * 0.9 + i / 3) % 1;
    circle(ctx, x + (i - 1) * 0.22 * s, y - (0.66 + u * 0.12) * s, (0.03 + u * 0.04) * s);
    ctx.fillStyle = `rgba(255,214,120,${1 - u})`;
    ctx.fill();
  }
}

/**
 * The Catapult tower: a little wooden catapult with a helper in a helmet. `p` is the throw
 * progress like a person's (0.6 is when the rock leaves the cup), or -1 when loaded and ready.
 * About as tall as a person of size `s`, feet (wheels) at (0, 0), facing right.
 */
export function drawCatapult(ctx: Ctx, s: number, p: number, t: number, helper: PersonLook) {
  const lw = Math.max(1, s * 0.03);
  ctx.lineJoin = 'round';
  ctx.save();
  ctx.translate(0.06 * s, 0); // so the whole crew sits centered on its spot
  // helper standing behind
  ctx.save();
  ctx.translate(-0.52 * s, 0);
  drawPerson(ctx, s * 0.62, helper, { throw: -1, t });
  ctx.restore();
  // base on wheels
  ctx.beginPath();
  ctx.rect(-0.14 * s, -0.2 * s, 0.66 * s, 0.09 * s);
  fillStroke(ctx, WOOD, lw);
  for (const wx of [-0.03, 0.42]) {
    circle(ctx, wx * s, -0.08 * s, 0.08 * s);
    fillStroke(ctx, WOOD_LIGHT, lw);
    circle(ctx, wx * s, -0.08 * s, 0.02 * s);
    ctx.fillStyle = OUTLINE;
    ctx.fill();
  }
  // the upright frame and the crossbar the arm hits
  const px = 0.12 * s;
  const py = -0.3 * s;
  limb(ctx, 0.02 * s, -0.2 * s, px, py, 0.05 * s, WOOD, lw);
  limb(ctx, 0.32 * s, -0.2 * s, 0.22 * s, -0.66 * s, 0.05 * s, WOOD, lw);
  limb(ctx, 0.14 * s, -0.66 * s, 0.28 * s, -0.66 * s, 0.06 * s, WOOD_LIGHT, lw);
  // the arm: lies back when loaded, swings up and slams the crossbar at release
  const rest = Math.PI - 0.08;
  const a =
    p < 0
      ? rest
      : keyframes(p, [
          [0, rest],
          [0.45, Math.PI + 0.06],
          [0.6, -Math.PI / 2 + 0.25],
          [0.7, -Math.PI / 2 + 0.4],
          [1, rest],
        ]);
  const len = 0.4 * s;
  const ax = px + Math.cos(a) * len;
  const ay = py + Math.sin(a) * len;
  const bx = px - Math.cos(a) * 0.06 * s;
  const by = py - Math.sin(a) * 0.06 * s;
  limb(ctx, bx, by, ax, ay, 0.06 * s, WOOD_LIGHT, lw);
  // the cup opens upward when loaded
  ctx.beginPath();
  ctx.arc(ax, ay, 0.085 * s, a - Math.PI / 2, a + Math.PI / 2, true);
  ctx.closePath();
  fillStroke(ctx, WOOD, lw);
  circle(ctx, px, py, 0.035 * s);
  fillStroke(ctx, IRON, lw);
  const loaded = p < 0 || p < RELEASE || p > 0.9;
  if (loaded) drawRock(ctx, ax, ay - 0.07 * s, 0.075 * s, lw);
  ctx.restore();
}

// ---------- people ----------

export interface PersonLook {
  skin: string;
  hairColor: string;
  hair?: 'short' | 'pony';
  tunic: string;
  /** Little spots on the tunic (Stone Age furs). */
  spot?: string;
  band?: string;
  feather?: string;
  weapon: 'rock' | 'spear' | 'net' | 'bow' | 'boomerang' | 'bucket' | 'none';
  /** A pile of rocks at their feet. */
  pile?: boolean;
  /** 'straight' for woven cloth (Ancient and later); the Stone Age fur has a zigzag hem. */
  hem?: 'zigzag' | 'straight';
  /** A metal helmet in this color, with an optional crest on top. */
  helmet?: string;
  crest?: string;
  /** A bubbling pot of hot oil next to them. */
  cauldron?: boolean;
}

export interface PersonPose {
  /** Throw progress 0..1 (0.6 is the moment it leaves the hand), or -1 when standing ready. */
  throw: number;
  /** For a gentle idle sway. */
  t: number;
}

/** Arm angle through a throw: rest, wind up behind the head, release, follow through. */
const ARM: [number, number][] = [
  [0, 1.2],
  [0.45, -2.5],
  [0.6, -0.3],
  [0.75, 0.8],
  [1, 1.2],
];
const LEAN: [number, number][] = [
  [0, 0],
  [0.45, -0.13],
  [0.6, 0.15],
  [0.8, 0.04],
  [1, 0],
];
/** When the thing being thrown leaves the hand. */
export const RELEASE = 0.6;

export function drawPerson(ctx: Ctx, s: number, look: PersonLook, pose: PersonPose) {
  const lw = Math.max(1, s * 0.03);
  ctx.lineJoin = 'round';
  const p = pose.throw;
  const bob = Math.sin(pose.t * 3) * s * 0.006;
  // legs and foot wraps
  limb(ctx, -0.06 * s, -0.3 * s, -0.06 * s, -0.05 * s, 0.085 * s, look.skin, lw);
  limb(ctx, 0.06 * s, -0.3 * s, 0.06 * s, -0.05 * s, 0.085 * s, look.skin, lw);
  oval(ctx, -0.04 * s, -0.035 * s, 0.07 * s, 0.04 * s);
  fillStroke(ctx, '#7a4a24', lw);
  oval(ctx, 0.08 * s, -0.035 * s, 0.07 * s, 0.04 * s);
  fillStroke(ctx, '#7a4a24', lw);
  if (look.weapon === 'net') drawNetPile(ctx, s, lw);
  if (look.cauldron) drawCauldron(ctx, -0.34 * s, 0, s * 0.42, pose.t, lw);
  if (look.pile) {
    const rocks: [number, number, number][] = [
      [0.2, -0.03, 0.06],
      [0.33, -0.03, 0.055],
      [0.26, -0.1, 0.055],
      [0.42, -0.02, 0.045],
      [0.15, -0.01, 0.04],
    ];
    for (const [px, py, pr] of rocks) drawRock(ctx, px * s, py * s, pr * s, lw);
  }

  const bow = look.weapon === 'bow';
  const lean = p >= 0 && !bow ? keyframes(p, LEAN) : 0;
  ctx.save();
  ctx.translate(0, bob - 0.3 * s);
  ctx.rotate(lean);
  ctx.translate(0, 0.3 * s);

  // Throwing arm first, so the body and head sit in front of the wind-up.
  const shX = 0.03 * s;
  const shY = -0.54 * s;
  const a = p >= 0 ? keyframes(p, ARM) : 1.25;
  const handX = shX + Math.cos(a) * 0.23 * s;
  const handY = shY + Math.sin(a) * 0.23 * s;
  const holding = p < 0 || p < RELEASE || p > 0.82;
  // An archer holds the bow out front with this arm instead, and draws with the near one.
  const bowX = 0.3 * s;
  const bowY = -0.55 * s;
  if (bow) {
    drawBow(ctx, bowX, bowY, s, lw);
    limb(ctx, shX, shY, bowX, bowY, 0.075 * s, look.skin, lw);
    circle(ctx, bowX, bowY, 0.045 * s);
    fillStroke(ctx, look.skin, lw);
  }
  if (look.weapon === 'spear' && holding) {
    const sa =
      p < 0
        ? -1.45
        : keyframes(p, [
            [0, -1.45],
            [0.3, -0.25],
            [0.6, -0.25],
            [0.82, -1.0],
            [1, -1.45],
          ]);
    drawSpear(ctx, handX, handY, sa, 0.72 * s, lw, 0.25);
  }
  if (!bow) {
    limb(ctx, shX, shY, handX, handY, 0.075 * s, look.skin, lw);
    circle(ctx, handX, handY, 0.045 * s);
    fillStroke(ctx, look.skin, lw);
  }
  if (look.weapon === 'boomerang' && holding)
    drawBoomerang(ctx, handX + 0.04 * s, handY - 0.05 * s, 0.17 * s, a + 2.2, lw);
  if (look.weapon === 'bucket' && holding) drawBucket(ctx, handX, handY, 0.15 * s, lw);
  if (look.weapon === 'rock' && holding)
    drawRock(ctx, handX + 0.02 * s, handY - 0.02 * s, 0.065 * s, lw);
  if (look.weapon === 'net' && holding)
    drawNetBall(ctx, handX + 0.03 * s, handY - 0.03 * s, 0.085 * s, lw);

  // tunic with a zigzag hem
  ctx.beginPath();
  ctx.moveTo(-0.13 * s, -0.6 * s);
  ctx.lineTo(0.13 * s, -0.6 * s);
  if (look.hem === 'straight') {
    ctx.lineTo(0.19 * s, -0.25 * s);
    ctx.lineTo(-0.19 * s, -0.25 * s);
  } else {
    ctx.lineTo(0.18 * s, -0.31 * s);
    const teeth = 5;
    for (let i = 0; i <= teeth * 2; i++) {
      ctx.lineTo(0.18 * s - (i / (teeth * 2)) * 0.36 * s, (i % 2 ? -0.24 : -0.31) * s);
    }
  }
  ctx.closePath();
  fillStroke(ctx, look.tunic, lw);
  if (look.hem === 'straight' && look.band) {
    // a colored stripe along the hem
    ctx.beginPath();
    ctx.moveTo(-0.185 * s, -0.29 * s);
    ctx.lineTo(0.185 * s, -0.29 * s);
    ctx.strokeStyle = look.band;
    ctx.lineWidth = 0.035 * s;
    ctx.stroke();
  }
  if (look.spot) {
    ctx.fillStyle = look.spot;
    for (const [x, y] of [
      [-0.06, -0.5],
      [0.07, -0.44],
      [-0.02, -0.36],
      [0.1, -0.54],
    ] as const) {
      oval(ctx, x * s, y * s, 0.028 * s, 0.02 * s);
      ctx.fill();
    }
  }
  ctx.beginPath();
  ctx.moveTo(-0.15 * s, -0.4 * s);
  ctx.lineTo(0.16 * s, -0.4 * s);
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 0.035 * s;
  ctx.stroke();

  if (bow) {
    // near arm pulls the string back, then lets go at RELEASE
    const pull =
      p < 0
        ? 0.15
        : keyframes(p, [
            [0, 0.15],
            [0.45, 1],
            [0.58, 1],
            [0.64, 0],
            [0.85, 0],
            [1, 0.15],
          ]);
    const tipX = bowX - 0.126 * s;
    const pullX = tipX - pull * 0.2 * s;
    ctx.beginPath();
    ctx.moveTo(tipX, bowY - 0.244 * s);
    ctx.lineTo(pullX, bowY);
    ctx.lineTo(tipX, bowY + 0.244 * s);
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = Math.max(1, lw * 0.6);
    ctx.stroke();
    if (holding) drawArrow(ctx, pullX + 0.2 * s, bowY, 0, 0.45 * s, lw);
    limb(ctx, -0.04 * s, -0.53 * s, pullX, bowY, 0.075 * s, look.skin, lw);
    circle(ctx, pullX, bowY, 0.042 * s);
    fillStroke(ctx, look.skin, lw);
  } else {
    // near arm, hanging
    limb(ctx, -0.04 * s, -0.53 * s, -0.08 * s, -0.33 * s, 0.075 * s, look.skin, lw);
    circle(ctx, -0.08 * s, -0.33 * s, 0.042 * s);
    fillStroke(ctx, look.skin, lw);
  }

  // head
  const hx = 0.02 * s;
  const hy = -0.77 * s;
  const hr = 0.19 * s;
  if (look.hair === 'pony') {
    oval(ctx, hx - 0.21 * s, hy + 0.02 * s, 0.07 * s, 0.13 * s, -0.5);
    fillStroke(ctx, look.hairColor, lw);
    oval(ctx, hx - 0.16 * s, hy - 0.06 * s, 0.035 * s, 0.05 * s, 0.8);
    fillStroke(ctx, '#efe2c4', lw);
  }
  furPath(ctx, hx - 0.03 * s, hy - 0.04 * s, hr * 1.05, hr, 9, 0.12, 2);
  fillStroke(ctx, look.hairColor, lw);
  circle(ctx, hx, hy, hr);
  fillStroke(ctx, look.skin, lw);
  // hair on top
  ctx.beginPath();
  ctx.moveTo(hx - hr * 1.02, hy - hr * 0.05);
  const tufts = 6;
  for (let i = 0; i <= tufts; i++) {
    const ang = Math.PI + (i / tufts) * Math.PI * 0.82;
    const r = hr * (i % 2 ? 1.22 : 1.04);
    ctx.lineTo(hx + Math.cos(ang) * r, hy + Math.sin(ang) * r * 0.95);
  }
  ctx.quadraticCurveTo(hx, hy - hr * 0.35, hx - hr * 1.02, hy - hr * 0.05);
  ctx.closePath();
  fillStroke(ctx, look.hairColor, lw);
  if (look.helmet) {
    // a round metal cap with a brim, and maybe a crest
    if (look.crest) {
      ctx.beginPath();
      ctx.ellipse(hx - 0.02 * s, hy - hr * 1.05, hr * 0.85, hr * 0.42, 0, Math.PI, TAU);
      ctx.closePath();
      fillStroke(ctx, look.crest, lw);
    }
    ctx.beginPath();
    ctx.arc(hx, hy - 0.05 * s, hr * 1.08, Math.PI, TAU);
    ctx.closePath();
    fillStroke(ctx, look.helmet, lw);
    oval(ctx, hx + 0.01 * s, hy - 0.05 * s, hr * 1.32, 0.035 * s);
    fillStroke(ctx, look.helmet, lw);
    circle(ctx, hx - hr * 0.35, hy - hr * 0.75, hr * 0.12);
    ctx.fillStyle = 'rgba(255,255,255,.45)';
    ctx.fill();
  } else if (look.band) {
    ctx.beginPath();
    ctx.arc(hx, hy + hr * 0.15, hr, Math.PI * 1.12, Math.PI * 1.9);
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 0.075 * s;
    ctx.stroke();
    ctx.strokeStyle = look.band;
    ctx.lineWidth = 0.045 * s;
    ctx.stroke();
    if (look.feather) {
      oval(ctx, hx - hr, hy - hr * 0.95, 0.035 * s, 0.11 * s, -0.5);
      fillStroke(ctx, look.feather, lw);
    }
  }
  // ear, eyes, cheek, smile, nose
  circle(ctx, hx - 0.05 * s, hy + 0.01 * s, 0.04 * s);
  fillStroke(ctx, look.skin, lw);
  ctx.fillStyle = OUTLINE;
  oval(ctx, hx + 0.06 * s, hy - 0.005 * s, 0.024 * s, 0.035 * s);
  ctx.fill();
  oval(ctx, hx + 0.135 * s, hy - 0.005 * s, 0.024 * s, 0.035 * s);
  ctx.fill();
  ctx.fillStyle = '#fff';
  circle(ctx, hx + 0.068 * s, hy - 0.018 * s, 0.009 * s);
  ctx.fill();
  circle(ctx, hx + 0.143 * s, hy - 0.018 * s, 0.009 * s);
  ctx.fill();
  circle(ctx, hx + 0.15 * s, hy + 0.05 * s, 0.03 * s);
  ctx.fillStyle = 'rgba(232,110,110,.45)';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(hx + 0.11 * s, hy + 0.055 * s, 0.05 * s, 0.2 * Math.PI, 0.8 * Math.PI);
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 0.02 * s;
  ctx.stroke();
  circle(ctx, hx + 0.19 * s, hy + 0.015 * s, 0.03 * s);
  fillStroke(ctx, look.skin, lw * 0.7);
  ctx.restore();
}

/** Where the hand is when the throw lets go, relative to the feet (facing right). */
export function releasePoint(s: number): { x: number; y: number } {
  const a = keyframes(RELEASE, ARM);
  const lean = keyframes(RELEASE, LEAN);
  const x = 0.03 * s + Math.cos(a) * 0.23 * s;
  const y = -0.54 * s + Math.sin(a) * 0.23 * s + 0.3 * s;
  return {
    x: x * Math.cos(lean) - y * Math.sin(lean),
    y: x * Math.sin(lean) + y * Math.cos(lean) - 0.3 * s,
  };
}

// ---------- the Boulder Dropper ----------

const BIG = {
  skin: '#c98a5e',
  dark: '#a8704a',
  fur: '#8b6a4a',
  furDark: '#5e452c',
  hair: '#3b2416',
  bone: '#efe2c4',
};

/** Arm angle (from the shoulder) through one heave: hug, lift overhead, heave, empty, pick up. */
const HEAVE_ARM: [number, number][] = [
  [0, 0.75],
  [0.2, -0.4],
  [0.42, -2.1],
  [0.6, -0.2],
  [0.72, 0.5],
  [0.85, 1.25],
  [1, 0.75],
];
const HEAVE_LEAN: [number, number][] = [
  [0, 0],
  [0.42, -0.12],
  [0.6, 0.22],
  [0.75, 0.08],
  [0.88, 0.25],
  [1, 0],
];
export const HEAVE_RELEASE = 0.6;

function heaveHands(s: number, p: number) {
  const a = p >= 0 ? keyframes(p, HEAVE_ARM) : 0.75;
  const lean = p >= 0 ? keyframes(p, HEAVE_LEAN) : 0;
  const shX = 0.06 * s;
  const shY = -0.6 * s;
  const len = 0.34 * s;
  return { a, lean, hx: shX + Math.cos(a) * len, hy: shY + Math.sin(a) * len, shX, shY };
}

export function drawDropper(ctx: Ctx, s: number, p: number, t: number, pile = true) {
  const lw = Math.max(1, s * 0.028);
  ctx.lineJoin = 'round';
  const bob = Math.sin(t * 2.4) * s * 0.008;
  if (pile) {
    for (const [px, py, pr] of [
      [-0.42, -0.07, 0.09],
      [-0.27, -0.07, 0.085],
      [-0.35, -0.2, 0.08],
    ] as const)
      drawRock(ctx, px * s, py * s, pr * s, lw);
  }
  // stocky legs and big feet
  limb(ctx, -0.1 * s, -0.32 * s, -0.11 * s, -0.06 * s, 0.13 * s, BIG.skin, lw);
  limb(ctx, 0.12 * s, -0.32 * s, 0.13 * s, -0.06 * s, 0.13 * s, BIG.skin, lw);
  oval(ctx, -0.08 * s, -0.04 * s, 0.1 * s, 0.05 * s);
  fillStroke(ctx, '#6e4422', lw);
  oval(ctx, 0.17 * s, -0.04 * s, 0.1 * s, 0.05 * s);
  fillStroke(ctx, '#6e4422', lw);

  const { a, lean, hx, hy, shX, shY } = heaveHands(s, p);
  ctx.save();
  ctx.translate(0, bob - 0.3 * s);
  ctx.rotate(lean);
  ctx.translate(0, 0.3 * s);

  // back arm (darker, behind the body)
  limb(ctx, shX - 0.08 * s, shY, hx - 0.06 * s, hy, 0.11 * s, BIG.dark, lw);

  // big round body in a fur wrap over one shoulder
  oval(ctx, 0.02 * s, -0.47 * s, 0.27 * s, 0.25 * s);
  fillStroke(ctx, BIG.skin, lw);
  ctx.save();
  oval(ctx, 0.02 * s, -0.47 * s, 0.27 * s, 0.25 * s);
  ctx.clip();
  ctx.beginPath();
  ctx.moveTo(-0.35 * s, -0.75 * s);
  ctx.lineTo(-0.1 * s, -0.75 * s);
  ctx.lineTo(0.35 * s, -0.4 * s);
  ctx.lineTo(0.35 * s, -0.1 * s);
  ctx.lineTo(-0.35 * s, -0.1 * s);
  ctx.closePath();
  fillStroke(ctx, BIG.fur, lw);
  ctx.fillStyle = BIG.furDark;
  for (const [x, y] of [
    [-0.15, -0.4],
    [0.05, -0.32],
    [0.18, -0.4],
    [-0.08, -0.25],
    [0.2, -0.25],
  ] as const) {
    oval(ctx, x * s, y * s, 0.035 * s, 0.025 * s);
    ctx.fill();
  }
  ctx.restore();
  oval(ctx, 0.02 * s, -0.47 * s, 0.27 * s, 0.25 * s);
  ctx.lineWidth = lw;
  ctx.strokeStyle = OUTLINE;
  ctx.stroke();
  // belt with a bone buckle
  ctx.beginPath();
  ctx.moveTo(-0.25 * s, -0.3 * s);
  ctx.quadraticCurveTo(0.02 * s, -0.25 * s, 0.28 * s, -0.33 * s);
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 0.04 * s;
  ctx.stroke();
  oval(ctx, 0.05 * s, -0.275 * s, 0.05 * s, 0.025 * s);
  fillStroke(ctx, BIG.bone, lw * 0.8);

  // head: small next to the body, big beard and brow
  const hX = 0.08 * s;
  const hY = -0.8 * s;
  const hr = 0.15 * s;
  furPath(ctx, hX - 0.02 * s, hY - 0.03 * s, hr * 1.12, hr * 1.02, 9, 0.14, 4);
  fillStroke(ctx, BIG.hair, lw);
  circle(ctx, hX, hY, hr);
  fillStroke(ctx, BIG.skin, lw);
  // beard
  ctx.beginPath();
  ctx.moveTo(hX - hr * 0.55, hY + hr * 0.05);
  ctx.quadraticCurveTo(hX - hr * 0.6, hY + hr * 1.6, hX + hr * 0.35, hY + hr * 1.55);
  ctx.quadraticCurveTo(hX + hr * 1.25, hY + hr * 1.35, hX + hr * 1.0, hY + hr * 0.2);
  ctx.quadraticCurveTo(hX + hr * 0.45, hY + hr * 0.55, hX - hr * 0.55, hY + hr * 0.05);
  ctx.closePath();
  fillStroke(ctx, BIG.hair, lw);
  // mouth peeking out of the beard: a grin when heaving
  ctx.beginPath();
  if (p > 0.35 && p < 0.7) {
    oval(ctx, hX + hr * 0.5, hY + hr * 0.6, hr * 0.22, hr * 0.15);
    fillStroke(ctx, '#7a2a20', lw * 0.7);
  } else {
    ctx.arc(hX + hr * 0.5, hY + hr * 0.45, hr * 0.22, 0.2 * Math.PI, 0.8 * Math.PI);
    ctx.strokeStyle = '#f2d2b0';
    ctx.lineWidth = 0.018 * s;
    ctx.stroke();
  }
  // hair on top, bone tucked in
  ctx.beginPath();
  ctx.moveTo(hX - hr * 1.05, hY);
  for (let i = 0; i <= 6; i++) {
    const ang = Math.PI + (i / 6) * Math.PI * 0.85;
    const r = hr * (i % 2 ? 1.28 : 1.05);
    ctx.lineTo(hX + Math.cos(ang) * r, hY + Math.sin(ang) * r);
  }
  ctx.quadraticCurveTo(hX, hY - hr * 0.3, hX - hr * 1.05, hY);
  ctx.closePath();
  fillStroke(ctx, BIG.hair, lw);
  ctx.save();
  ctx.translate(hX - hr * 0.3, hY - hr * 1.05);
  ctx.rotate(-0.5);
  limb(ctx, -hr * 0.35, 0, hr * 0.35, 0, hr * 0.12, BIG.bone, lw * 0.7);
  for (const ex of [-0.38, 0.38]) {
    circle(ctx, ex * hr, -hr * 0.06, hr * 0.09);
    fillStroke(ctx, BIG.bone, lw * 0.6);
    circle(ctx, ex * hr, hr * 0.06, hr * 0.09);
    fillStroke(ctx, BIG.bone, lw * 0.6);
  }
  ctx.restore();
  // brow, eyes, nose
  ctx.beginPath();
  ctx.moveTo(hX + hr * 0.05, hY - hr * 0.32);
  ctx.lineTo(hX + hr * 0.95, hY - hr * 0.3);
  ctx.strokeStyle = BIG.hair;
  ctx.lineWidth = 0.04 * s;
  ctx.lineCap = 'round';
  ctx.stroke();
  ctx.fillStyle = OUTLINE;
  const blink = Math.sin(t * 1.3) > 0.97;
  for (const ex of [0.32, 0.78]) {
    oval(ctx, hX + ex * hr, hY - hr * 0.08, 0.018 * s, blink ? 0.004 * s : 0.026 * s);
    ctx.fill();
  }
  circle(ctx, hX + hr * 1.0, hY + hr * 0.12, 0.035 * s);
  fillStroke(ctx, BIG.skin, lw * 0.7);
  circle(ctx, hX + hr * 0.9, hY + hr * 0.25, 0.025 * s);
  ctx.fillStyle = 'rgba(232,110,110,.45)';
  ctx.fill();

  // the boulder, held in both hands (gone between the heave and the pick-up)
  const holding = p < 0 || p < HEAVE_RELEASE || p > 0.86;
  if (holding) {
    const lift =
      p > 0.86
        ? keyframes(p, [
            [0.86, 0.6],
            [1, 1],
          ])
        : 1;
    drawRock(
      ctx,
      hx + Math.cos(a) * 0.12 * s + 0.03 * s,
      hy + Math.sin(a) * 0.12 * s,
      0.16 * s * lift,
      lw,
    );
  }
  // front arm, over the boulder
  limb(ctx, shX + 0.06 * s, shY + 0.02 * s, hx + 0.06 * s, hy + 0.02 * s, 0.115 * s, BIG.skin, lw);
  circle(ctx, hx + 0.06 * s, hy + 0.02 * s, 0.06 * s);
  fillStroke(ctx, BIG.skin, lw);
  // a strain line on the arm when lifting
  if (a < -1.5) {
    ctx.beginPath();
    ctx.arc(shX + 0.1 * s, shY - 0.1 * s, 0.05 * s, 0.2, 1.4);
    ctx.strokeStyle = BIG.dark;
    ctx.lineWidth = lw;
    ctx.stroke();
  }
  ctx.restore();
}

// ---------- monsters ----------

export interface MonsterPose {
  /** Walk cycle phase in radians (keeps counting up while walking). */
  walk: number;
  /** Club swing 0..1 while hitting the wall (0.6 is the hit), or null while walking. */
  attack: number | null;
}

/** The Grumbler: a grumpy one-eyed furball with a club. */
/** Monster colors by rank: they level up every few waves with a new color, then gear. */
const GRUMBLER_FUR = [
  ['#7d68c9', '#5a479e'],
  ['#e0843a', '#b05f22'],
  ['#d4483b', '#9c2d24'],
  ['#4b4f5c', '#2f323b'],
] as const;
const BRUTE_FUR = [
  ['#8a5a36', '#5e3b20'],
  ['#6f7f99', '#4b5870'],
  ['#8c3a2e', '#5f2219'],
  ['#3a3440', '#221e27'],
] as const;
const BONE = '#efe2c4';
const HIDE = '#8b5a2b';
const furFor = (table: typeof GRUMBLER_FUR | typeof BRUTE_FUR, rank: number) =>
  table[Math.min(rank, table.length - 1)]!;

/** A row of bone spikes along an arc (the monster's back). */
function backSpikes(
  ctx: Ctx,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  from: number,
  to: number,
  n: number,
  h: number,
  lw: number,
  color = BONE,
) {
  for (let i = 0; i < n; i++) {
    const a = from + ((to - from) * (i + 0.5)) / n;
    const x = cx + Math.cos(a) * rx;
    const y = cy + Math.sin(a) * ry;
    const nx = Math.cos(a);
    const ny = Math.sin(a);
    polygon(ctx, [
      [x - ny * h * 0.35, y + nx * h * 0.35],
      [x + nx * h, y + ny * h],
      [x + ny * h * 0.35, y - nx * h * 0.35],
    ]);
    fillStroke(ctx, color, lw);
  }
}

/**
 * Monster armor by era: 0 none (Stone Age fur, bone gear as they level up), 1 bronze (Ancient),
 * 2 iron (Medieval). Robot parts come later.
 */
export type Armor = 0 | 1 | 2;
const metal = (armor: Armor) => (armor === 1 ? BRONZE : IRON);
const metalDark = (armor: Armor) => (armor === 1 ? BRONZE_DARK : IRON_DARK);
/** Crest or plume colors by rank. */
const PLUMES = ['#d8402f', '#3a6fd8', '#f6d65a', '#2f2a35'];
const plumeFor = (rank: number) => PLUMES[Math.min(rank, PLUMES.length - 1)]!;

/** The weapon a Grumbler swings: a club, a bronze sword or an iron mace. */
function drawMonsterWeapon(
  ctx: Ctx,
  armor: Armor,
  x: number,
  y: number,
  ang: number,
  len: number,
  lw: number,
) {
  if (armor === 0) return drawClub(ctx, x, y, ang, len, lw);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ang);
  if (armor === 1) {
    polygon(ctx, [
      [len * 0.12, -len * 0.07],
      [len * 0.85, -len * 0.05],
      [len * 1.0, 0],
      [len * 0.85, len * 0.05],
      [len * 0.12, len * 0.07],
    ]);
    fillStroke(ctx, BRONZE, lw);
    limb(ctx, len * 0.1, -len * 0.16, len * 0.1, len * 0.16, len * 0.06, BRONZE_DARK, lw);
    limb(ctx, -len * 0.06, 0, len * 0.08, 0, len * 0.1, WOOD, lw);
  } else {
    limb(ctx, 0, 0, len * 0.7, 0, len * 0.09, WOOD, lw);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * TAU;
      polygon(ctx, [
        [len * 0.8 + Math.cos(a - 0.35) * len * 0.12, Math.sin(a - 0.35) * len * 0.12],
        [len * 0.8 + Math.cos(a) * len * 0.24, Math.sin(a) * len * 0.24],
        [len * 0.8 + Math.cos(a + 0.35) * len * 0.12, Math.sin(a + 0.35) * len * 0.12],
      ]);
      fillStroke(ctx, IRON_DARK, lw * 0.8);
    }
    circle(ctx, len * 0.8, 0, len * 0.16);
    fillStroke(ctx, IRON, lw);
  }
  ctx.restore();
}

/** A metal cap over a monster's head, centered at (x, y) with radius r. Iron ones have a brim. */
function metalHelmet(
  ctx: Ctx,
  armor: Armor,
  x: number,
  y: number,
  r: number,
  rank: number,
  lw: number,
) {
  if (armor === 1) {
    // a crest of stiff horsehair, front to back
    ctx.beginPath();
    ctx.ellipse(x, y - r * 0.8, r * 0.75, r * 0.45, 0, Math.PI, TAU);
    ctx.closePath();
    fillStroke(ctx, plumeFor(rank), lw);
  } else if (rank >= 1) {
    oval(ctx, x - r * 0.5, y - r * 1.05, r * 0.18, r * 0.42, -0.6);
    fillStroke(ctx, plumeFor(rank - 1), lw);
  }
  ctx.beginPath();
  ctx.arc(x, y, r, Math.PI * 1.05, Math.PI * 1.95);
  ctx.closePath();
  fillStroke(ctx, metal(armor), lw);
  if (armor === 2) {
    oval(ctx, x, y - r * 0.12, r * 1.15, r * 0.12);
    fillStroke(ctx, IRON, lw);
  } else {
    ctx.beginPath();
    ctx.moveTo(x - r * 0.9, y - r * 0.25);
    ctx.lineTo(x + r * 0.9, y - r * 0.25);
    ctx.strokeStyle = BRONZE_DARK;
    ctx.lineWidth = r * 0.08;
    ctx.stroke();
  }
  circle(ctx, x - r * 0.35, y - r * 0.65, r * 0.1);
  ctx.fillStyle = 'rgba(255,255,255,.5)';
  ctx.fill();
}

/** Body armor: a bronze chest plate, or iron chain mail with a belt. */
function bodyArmor(
  ctx: Ctx,
  armor: Armor,
  x: number,
  y: number,
  rx: number,
  ry: number,
  lw: number,
) {
  oval(ctx, x, y, rx, ry);
  fillStroke(ctx, metal(armor), lw);
  ctx.strokeStyle = metalDark(armor);
  ctx.lineWidth = Math.max(1, rx * 0.06);
  if (armor === 1) {
    for (const k of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(x + k * rx * 0.33, y - ry * 0.15, rx * 0.3, Math.PI * 0.15, Math.PI * 0.85);
      ctx.stroke();
    }
  } else {
    for (let row = -1; row <= 1; row++)
      for (let col = -2; col <= 2; col++) {
        ctx.beginPath();
        ctx.arc(
          x + col * rx * 0.32 + (row & 1) * rx * 0.16,
          y + row * ry * 0.4,
          rx * 0.1,
          0,
          Math.PI,
        );
        ctx.stroke();
      }
  }
}

/** Studded hide armor over the belly or back. */
function hideArmor(ctx: Ctx, x: number, y: number, rx: number, ry: number, lw: number) {
  oval(ctx, x, y, rx, ry);
  fillStroke(ctx, HIDE, lw);
  ctx.fillStyle = '#c9c4ba';
  for (const [dx, dy] of [
    [-0.5, -0.2],
    [0, -0.45],
    [0.5, -0.2],
    [-0.25, 0.3],
    [0.25, 0.3],
  ] as const) {
    circle(ctx, x + dx * rx, y + dy * ry, Math.max(1, rx * 0.09));
    ctx.fill();
    ctx.lineWidth = lw * 0.6;
    ctx.strokeStyle = OUTLINE;
    ctx.stroke();
  }
}

export function drawGrumbler(ctx: Ctx, s: number, pose: MonsterPose, rank = 0, armor: Armor = 0) {
  const lw = Math.max(1, s * 0.032);
  ctx.lineJoin = 'round';
  const w = pose.attack === null ? pose.walk : 0;
  const sw = Math.sin(w) * 0.09 * s;
  const bob = -Math.abs(Math.sin(w)) * 0.06 * s;
  const [fur, dark] = furFor(GRUMBLER_FUR, rank);
  oval(ctx, -0.12 * s + sw, -0.04 * s, 0.1 * s, 0.055 * s);
  fillStroke(ctx, dark, lw);
  oval(ctx, 0.12 * s - sw, -0.04 * s, 0.1 * s, 0.055 * s);
  fillStroke(ctx, dark, lw);
  ctx.save();
  ctx.translate(0, bob);
  for (const [hx, flip] of [
    [-0.13, -1],
    [0.13, 1],
  ] as const) {
    ctx.beginPath();
    ctx.moveTo((hx - 0.06) * s, -0.7 * s);
    ctx.quadraticCurveTo((hx + flip * 0.02) * s, -0.95 * s, (hx + flip * 0.09) * s, -0.97 * s);
    ctx.quadraticCurveTo((hx + flip * 0.03) * s, -0.82 * s, (hx + 0.06) * s, -0.7 * s);
    ctx.closePath();
    fillStroke(ctx, '#efe2c4', lw);
  }
  limb(ctx, -0.25 * s, -0.4 * s, -0.36 * s - sw * 0.5, -0.26 * s, 0.08 * s, dark, lw);
  if (armor && rank >= 2) {
    // a round shield on the back arm
    const shx = -0.36 * s - sw * 0.5;
    circle(ctx, shx, -0.3 * s, 0.17 * s);
    fillStroke(ctx, metal(armor), lw);
    circle(ctx, shx, -0.3 * s, 0.11 * s);
    fillStroke(ctx, armor === 1 ? plumeFor(rank) : IRON_DARK, lw);
    circle(ctx, shx, -0.3 * s, 0.04 * s);
    fillStroke(ctx, metal(armor), lw);
  }
  furPath(ctx, 0, -0.42 * s, 0.33 * s, 0.36 * s, 11, 0.12, 1.3);
  fillStroke(ctx, fur, lw);
  oval(ctx, 0.05 * s, -0.27 * s, 0.17 * s, 0.13 * s);
  ctx.fillStyle = 'rgba(255,255,255,.22)';
  ctx.fill();
  if (rank >= 3)
    backSpikes(
      ctx,
      0,
      -0.42 * s,
      0.33 * s,
      0.36 * s,
      Math.PI * 0.75,
      Math.PI * 1.3,
      4,
      0.12 * s,
      lw,
      armor ? metal(armor) : BONE,
    );
  if (armor) bodyArmor(ctx, armor, 0.04 * s, -0.17 * s, 0.24 * s, 0.13 * s, lw);
  else if (rank >= 2) hideArmor(ctx, 0.05 * s, -0.15 * s, 0.19 * s, 0.1 * s, lw);
  // one big eye with a grumpy brow
  circle(ctx, 0.08 * s, -0.5 * s, 0.13 * s);
  fillStroke(ctx, '#fffaf0', lw);
  circle(ctx, 0.13 * s, -0.49 * s, 0.065 * s);
  ctx.fillStyle = rank >= 3 ? '#e8a020' : OUTLINE;
  ctx.fill();
  circle(ctx, 0.15 * s, -0.51 * s, 0.02 * s);
  ctx.fillStyle = '#fff';
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-0.06 * s, -0.68 * s);
  ctx.lineTo(0.22 * s, -0.6 * s);
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 0.05 * s;
  ctx.lineCap = 'round';
  ctx.stroke();
  // mouth with two little teeth
  ctx.beginPath();
  ctx.moveTo(-0.02 * s, -0.3 * s);
  ctx.quadraticCurveTo(0.12 * s, -0.27 * s, 0.25 * s, -0.31 * s);
  ctx.lineWidth = 0.03 * s;
  ctx.stroke();
  ctx.fillStyle = '#fffaf0';
  for (const tx of [0.04, 0.17]) {
    polygon(ctx, [
      [tx * s, -0.29 * s],
      [(tx + 0.03) * s, -0.36 * s],
      [(tx + 0.055) * s, -0.29 * s],
    ]);
    ctx.fill();
    ctx.lineWidth = lw * 0.7;
    ctx.stroke();
  }
  if (armor) metalHelmet(ctx, armor, 0.02 * s, -0.66 * s, 0.25 * s, rank, lw);
  else if (rank >= 1) {
    // a bone skull-cap helmet, with the horns poking through
    ctx.beginPath();
    ctx.arc(0.02 * s, -0.66 * s, 0.25 * s, Math.PI * 1.05, Math.PI * 1.95);
    ctx.closePath();
    fillStroke(ctx, BONE, lw);
    ctx.beginPath();
    ctx.moveTo(0.06 * s, -0.9 * s);
    ctx.lineTo(0.03 * s, -0.82 * s);
    ctx.lineTo(0.07 * s, -0.76 * s);
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = lw * 0.7;
    ctx.stroke();
  }
  // front arm with the club
  const ca =
    pose.attack === null
      ? -1.0 + Math.sin(w) * 0.1
      : keyframes(pose.attack, [
          [0, -1.0],
          [0.4, -1.7],
          [0.6, 0.35],
          [1, -1.0],
        ]);
  const hx = 0.3 * s;
  const hy = -0.33 * s;
  drawMonsterWeapon(ctx, armor, hx, hy, ca, 0.5 * s, lw);
  limb(ctx, 0.2 * s, -0.4 * s, hx, hy, 0.08 * s, fur, lw);
  circle(ctx, hx, hy, 0.05 * s);
  fillStroke(ctx, fur, lw);
  if (armor === 2 && rank >= 2) {
    // a shoulder plate
    ctx.beginPath();
    ctx.ellipse(0.2 * s, -0.42 * s, 0.11 * s, 0.08 * s, 0.3, Math.PI, TAU);
    ctx.closePath();
    fillStroke(ctx, IRON, lw);
  }
  ctx.restore();
}

/**
 * The Woolly Brute: a big shaggy four-legged monster with tusks. The boss gets a bone crown and
 * war paint. It is about 1.4 × s long; the feet are centered around x = 0.
 */
export function drawBrute(
  ctx: Ctx,
  s: number,
  pose: MonsterPose,
  boss = false,
  rank = 0,
  armor: Armor = 0,
) {
  const lw = Math.max(1, s * 0.028);
  ctx.lineJoin = 'round';
  const w = pose.attack === null ? pose.walk : 0;
  const [fur, dark] = furFor(BRUTE_FUR, rank);
  const bob = -Math.abs(Math.sin(w)) * 0.03 * s;
  const legs: [number, number][] = [
    [-0.36, 0],
    [0.26, Math.PI],
    [-0.22, Math.PI],
    [0.4, 0],
  ];
  legs.forEach(([lx, ph], i) => {
    const sw = Math.sin(w + ph) * 0.07 * s;
    ctx.beginPath();
    ctx.rect(lx * s - 0.08 * s + sw * 0.5, -0.36 * s, 0.16 * s, 0.34 * s + Math.min(0, sw * 0.3));
    fillStroke(ctx, i < 2 ? dark : fur, lw);
    oval(ctx, lx * s + sw * 0.5, -0.03 * s, 0.09 * s, 0.04 * s);
    fillStroke(ctx, '#d9c8a8', lw);
  });
  ctx.save();
  ctx.translate(0, bob);
  if (pose.attack !== null) {
    // a head-butt
    const k = keyframes(pose.attack, [
      [0, 0],
      [0.4, -0.12],
      [0.6, 0.08],
      [1, 0],
    ]);
    ctx.translate(0.5 * s, -0.4 * s);
    ctx.rotate(k);
    ctx.translate(-0.5 * s, 0.4 * s);
  }
  limb(ctx, -0.55 * s, -0.55 * s, -0.66 * s, -0.4 * s, 0.05 * s, dark, lw);
  furPath(ctx, 0, -0.55 * s, 0.56 * s, 0.33 * s, 14, 0.1, 0.5);
  fillStroke(ctx, fur, lw);
  ctx.strokeStyle = dark;
  ctx.lineWidth = 0.025 * s;
  for (const x of [-0.35, -0.15, 0.05, 0.22]) {
    ctx.beginPath();
    ctx.moveTo(x * s, -0.75 * s);
    ctx.quadraticCurveTo((x + 0.05) * s, -0.55 * s, (x - 0.02) * s, -0.35 * s);
    ctx.stroke();
  }
  if (rank >= 3)
    backSpikes(
      ctx,
      0,
      -0.55 * s,
      0.56 * s,
      0.33 * s,
      Math.PI * 1.15,
      Math.PI * 1.85,
      5,
      0.13 * s,
      lw,
      armor ? metal(armor) : BONE,
    );
  if (armor === 1) {
    // a red blanket covered in bronze scales
    oval(ctx, -0.05 * s, -0.7 * s, 0.36 * s, 0.16 * s);
    fillStroke(ctx, '#b8402f', lw);
    for (let i = -2; i <= 2; i++) {
      circle(ctx, -0.05 * s + i * 0.12 * s, -0.72 * s + Math.abs(i) * 0.02 * s, 0.055 * s);
      fillStroke(ctx, BRONZE, lw * 0.8);
    }
  } else if (armor === 2) {
    // iron plates down the back, held with straps and rivets
    ctx.beginPath();
    ctx.ellipse(-0.03 * s, -0.62 * s, 0.48 * s, 0.25 * s, 0, Math.PI * 1.02, Math.PI * 1.98);
    ctx.quadraticCurveTo(-0.03 * s, -0.52 * s, -0.5 * s, -0.6 * s);
    ctx.closePath();
    fillStroke(ctx, IRON, lw);
    ctx.strokeStyle = IRON_DARK;
    ctx.lineWidth = 0.025 * s;
    ctx.fillStyle = IRON_DARK;
    for (const x of [-0.28, -0.03, 0.22]) {
      ctx.beginPath();
      ctx.moveTo(x * s, -0.86 * s);
      ctx.lineTo(x * s, -0.6 * s);
      ctx.stroke();
      circle(ctx, x * s, -0.66 * s, 0.022 * s);
      ctx.fill();
    }
  } else if (rank >= 2) hideArmor(ctx, -0.05 * s, -0.68 * s, 0.32 * s, 0.17 * s, lw);
  if (boss) {
    ctx.strokeStyle = '#d8402f';
    ctx.lineWidth = 0.05 * s;
    for (const x of [-0.3, -0.1]) {
      ctx.beginPath();
      ctx.moveTo(x * s, -0.78 * s);
      ctx.lineTo((x + 0.06) * s, -0.4 * s);
      ctx.stroke();
    }
  }
  const hx = 0.52 * s;
  const hy = -0.6 * s;
  for (const k of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(hx + (k * 0.08 - 0.04) * s, hy - 0.18 * s);
    ctx.quadraticCurveTo(hx + k * 0.12 * s, hy - 0.36 * s, hx + k * 0.2 * s, hy - 0.34 * s);
    ctx.quadraticCurveTo(
      hx + k * 0.1 * s,
      hy - 0.26 * s,
      hx + (k * 0.08 + 0.04) * s,
      hy - 0.17 * s,
    );
    ctx.closePath();
    fillStroke(ctx, '#efe2c4', lw);
  }
  furPath(ctx, hx, hy, 0.24 * s, 0.22 * s, 9, 0.1, 3);
  fillStroke(ctx, fur, lw);
  oval(ctx, hx + 0.2 * s, hy + 0.07 * s, 0.1 * s, 0.08 * s);
  fillStroke(ctx, '#c9906a', lw);
  ctx.fillStyle = OUTLINE;
  circle(ctx, hx + 0.24 * s, hy + 0.05 * s, 0.018 * s);
  ctx.fill();
  circle(ctx, hx + 0.19 * s, hy + 0.06 * s, 0.018 * s);
  ctx.fill();
  // tusks
  ctx.beginPath();
  ctx.moveTo(hx + 0.1 * s, hy + 0.14 * s);
  ctx.quadraticCurveTo(hx + 0.24 * s, hy + 0.34 * s, hx + 0.42 * s, hy + 0.12 * s);
  ctx.quadraticCurveTo(hx + 0.24 * s, hy + 0.24 * s, hx + 0.16 * s, hy + 0.08 * s);
  ctx.closePath();
  fillStroke(ctx, '#fbf3df', lw);
  // eyes peeking under a shaggy fringe
  ctx.fillStyle = OUTLINE;
  circle(ctx, hx + 0.08 * s, hy - 0.04 * s, 0.035 * s);
  ctx.fill();
  ctx.fillStyle = '#fff';
  circle(ctx, hx + 0.09 * s, hy - 0.052 * s, 0.012 * s);
  ctx.fill();
  furPath(ctx, hx + 0.02 * s, hy - 0.14 * s, 0.17 * s, 0.07 * s, 7, 0.3, 1);
  fillStroke(ctx, dark, lw);
  if (armor === 2) {
    // a spike on the iron face plate
    polygon(ctx, [
      [hx + 0.02 * s, hy - 0.2 * s],
      [hx + 0.2 * s, hy - 0.36 * s],
      [hx + 0.12 * s, hy - 0.15 * s],
    ]);
    fillStroke(ctx, IRON_DARK, lw);
  }
  if (armor) metalHelmet(ctx, armor, hx + 0.02 * s, hy - 0.08 * s, 0.2 * s, rank, lw);
  else if (rank >= 1) {
    // a bone helmet
    ctx.beginPath();
    ctx.arc(hx + 0.02 * s, hy - 0.08 * s, 0.2 * s, Math.PI * 1.05, Math.PI * 1.95);
    ctx.closePath();
    fillStroke(ctx, BONE, lw);
    ctx.fillStyle = OUTLINE;
    circle(ctx, hx + 0.02 * s, hy - 0.2 * s, 0.025 * s);
    ctx.fill();
  }
  if (boss) {
    ctx.save();
    ctx.translate(hx - 0.02 * s, hy - 0.2 * s);
    for (const [bx, bh] of [
      [-0.08, 0.13],
      [0, 0.18],
      [0.08, 0.13],
    ] as const) {
      polygon(ctx, [
        [(bx - 0.03) * s, 0],
        [bx * s, -bh * s],
        [(bx + 0.03) * s, 0],
      ]);
      fillStroke(ctx, '#f6d65a', lw);
    }
    ctx.restore();
  }
  ctx.restore();
}

// ---------- new monsters for Ancient and Medieval ----------

/** Body colors by rank for the smaller monsters: the same colors as the Grumblers. */
const smallFur = (rank: number) => furFor(GRUMBLER_FUR, rank);

/** One big grumpy eye looking right, centered on (x, y). */
function monsterEye(ctx: Ctx, x: number, y: number, r: number, rank: number, lw: number) {
  circle(ctx, x, y, r);
  fillStroke(ctx, '#fffaf0', lw);
  circle(ctx, x + r * 0.38, y + r * 0.08, r * 0.5);
  ctx.fillStyle = rank >= 3 ? '#e8a020' : OUTLINE;
  ctx.fill();
  circle(ctx, x + r * 0.52, y - r * 0.08, r * 0.15);
  ctx.fillStyle = '#fff';
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x - r * 1.05, y - r * 1.25);
  ctx.lineTo(x + r * 1.1, y - r * 0.65);
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = r * 0.38;
  ctx.lineCap = 'round';
  ctx.stroke();
}

/**
 * The Scarab Scuttler (Ancient): a small, fast monster under a bronze beetle shell, on six
 * scurrying legs. About half as tall as a Grumbler.
 */
export function drawScuttler(ctx: Ctx, s: number, pose: MonsterPose, rank = 0) {
  const lw = Math.max(1, s * 0.03);
  ctx.lineJoin = 'round';
  const w = pose.attack === null ? pose.walk * 1.6 : 0;
  const [fur, dark] = smallFur(rank);
  // legs: three pairs, alternating
  for (let i = 0; i < 3; i++) {
    const lx = (-0.22 + i * 0.2) * s;
    const sw = Math.sin(w + i * 2.1) * 0.06 * s;
    limb(ctx, lx, -0.16 * s, lx - 0.06 * s + sw, -0.02 * s, 0.04 * s, dark, lw);
    limb(ctx, lx + 0.03 * s, -0.16 * s, lx + 0.1 * s - sw, -0.02 * s, 0.04 * s, dark, lw);
  }
  const bob = -Math.abs(Math.sin(w)) * 0.025 * s;
  ctx.save();
  ctx.translate(0, bob);
  // furry face peeking out in front
  furPath(ctx, 0.24 * s, -0.24 * s, 0.17 * s, 0.15 * s, 8, 0.15, 2);
  fillStroke(ctx, fur, lw);
  for (const k of [0, 1]) {
    ctx.beginPath();
    ctx.moveTo((0.28 + k * 0.06) * s, -0.36 * s);
    ctx.quadraticCurveTo((0.36 + k * 0.08) * s, -0.52 * s, (0.46 + k * 0.06) * s, -0.5 * s);
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 0.025 * s;
    ctx.stroke();
    circle(ctx, (0.46 + k * 0.06) * s, -0.5 * s, 0.025 * s);
    fillStroke(ctx, BRONZE, lw * 0.6);
  }
  monsterEye(ctx, 0.29 * s, -0.27 * s, 0.075 * s, rank, lw);
  // the shell, with a line down the middle and a shine
  ctx.beginPath();
  ctx.ellipse(-0.05 * s, -0.2 * s, 0.3 * s, 0.24 * s, 0, Math.PI, TAU);
  ctx.quadraticCurveTo(-0.05 * s, -0.12 * s, -0.35 * s, -0.2 * s);
  ctx.closePath();
  fillStroke(ctx, rank >= 2 ? BRONZE_DARK : BRONZE, lw);
  ctx.beginPath();
  ctx.moveTo(-0.05 * s, -0.44 * s);
  ctx.lineTo(-0.05 * s, -0.16 * s);
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = lw;
  ctx.stroke();
  oval(ctx, -0.17 * s, -0.33 * s, 0.07 * s, 0.035 * s, -0.4);
  ctx.fillStyle = 'rgba(255,255,255,.45)';
  ctx.fill();
  if (rank >= 1) {
    ctx.fillStyle = plumeFor(rank - 1);
    for (const [dx, dy] of [
      [-0.2, -0.27],
      [0.08, -0.3],
      [-0.12, -0.38],
      [0.02, -0.38],
    ] as const) {
      circle(ctx, dx * s, dy * s, 0.03 * s);
      ctx.fill();
    }
  }
  if (rank >= 3)
    backSpikes(
      ctx,
      -0.05 * s,
      -0.2 * s,
      0.3 * s,
      0.24 * s,
      Math.PI * 1.15,
      Math.PI * 1.85,
      3,
      0.08 * s,
      lw,
      BRONZE,
    );
  ctx.restore();
}

/**
 * The Shellback (Ancient): a slow, stubby monster carrying a huge bronze shell that soaks up the
 * first hits. With `shell` false the shell has broken off and it hurries along without it.
 */
export function drawShellback(ctx: Ctx, s: number, pose: MonsterPose, rank = 0, shell = true) {
  const lw = Math.max(1, s * 0.03);
  ctx.lineJoin = 'round';
  const w = pose.attack === null ? pose.walk * (shell ? 0.8 : 1.4) : 0;
  const [fur, dark] = furFor(BRUTE_FUR, rank);
  for (const [lx, ph] of [
    [-0.28, 0],
    [0.22, Math.PI],
    [-0.14, Math.PI],
    [0.34, 0],
  ] as const) {
    const sw = Math.sin(w + ph) * 0.05 * s;
    oval(ctx, lx * s + sw, -0.08 * s, 0.08 * s, 0.09 * s);
    fillStroke(ctx, dark, lw);
  }
  // head on a stretchy neck
  const hx = 0.46 * s;
  const hy = -0.36 * s + Math.sin(w) * 0.015 * s;
  limb(ctx, 0.2 * s, -0.25 * s, hx - 0.06 * s, hy + 0.04 * s, 0.13 * s, fur, lw);
  furPath(ctx, hx, hy, 0.15 * s, 0.13 * s, 8, 0.12, 4);
  fillStroke(ctx, fur, lw);
  monsterEye(ctx, hx + 0.02 * s, hy - 0.01 * s, 0.07 * s, rank, lw);
  ctx.beginPath();
  ctx.moveTo(hx + 0.02 * s, hy + 0.08 * s);
  ctx.quadraticCurveTo(hx + 0.09 * s, hy + 0.1 * s, hx + 0.14 * s, hy + 0.06 * s);
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 0.02 * s;
  ctx.stroke();
  if (shell) {
    // a tall dome of bronze plates
    ctx.beginPath();
    ctx.ellipse(0, -0.16 * s, 0.42 * s, 0.4 * s, 0, Math.PI, TAU);
    ctx.closePath();
    fillStroke(ctx, BRONZE, lw);
    ctx.strokeStyle = BRONZE_DARK;
    ctx.lineWidth = 0.025 * s;
    for (const [cx, cy] of [
      [-0.2, -0.3],
      [0.05, -0.36],
      [0.26, -0.26],
      [-0.08, -0.48],
    ] as const) {
      ctx.beginPath();
      for (let i = 0; i <= 6; i++) {
        const a = (i / 6) * TAU;
        const px = cx * s + Math.cos(a) * 0.09 * s;
        const py = cy * s + Math.sin(a) * 0.08 * s;
        if (i) ctx.lineTo(px, py);
        else ctx.moveTo(px, py);
      }
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(-0.42 * s, -0.16 * s);
    ctx.lineTo(0.42 * s, -0.16 * s);
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = lw * 1.5;
    ctx.stroke();
    oval(ctx, -0.18 * s, -0.42 * s, 0.09 * s, 0.04 * s, -0.5);
    ctx.fillStyle = 'rgba(255,255,255,.4)';
    ctx.fill();
    if (rank >= 2) {
      // a crest along the top
      ctx.beginPath();
      ctx.ellipse(-0.02 * s, -0.56 * s, 0.24 * s, 0.1 * s, 0, Math.PI, TAU);
      ctx.closePath();
      fillStroke(ctx, plumeFor(rank), lw);
    }
    if (rank >= 3)
      backSpikes(
        ctx,
        0,
        -0.16 * s,
        0.42 * s,
        0.4 * s,
        Math.PI * 1.1,
        Math.PI * 1.35,
        2,
        0.1 * s,
        lw,
        BRONZE,
      );
  } else {
    // just a fuzzy back, a little embarrassed
    furPath(ctx, 0, -0.2 * s, 0.32 * s, 0.2 * s, 10, 0.12, 2);
    fillStroke(ctx, fur, lw);
  }
}

/**
 * The Goo Knight (Medieval): a wobbly blob of goo in a tiny iron helmet. When it's stopped it
 * splits into two small ones (`small` draws those).
 */
export function drawGoo(ctx: Ctx, s: number, pose: MonsterPose, rank = 0, small = false) {
  const lw = Math.max(1, s * 0.03);
  const size = small ? 0.6 : 1;
  const w = pose.attack === null ? pose.walk * 1.2 : pose.attack * TAU;
  const squish = Math.sin(w) * 0.08;
  const GOO = [
    ['#6cc96a', '#3f9a44'],
    ['#5ab8d8', '#3786a3'],
    ['#d86ab8', '#a3418a'],
    ['#7a62c9', '#4f3d96'],
  ] as const;
  const [goo, dark] = GOO[Math.min(rank, GOO.length - 1)]!;
  ctx.save();
  ctx.scale(size, size);
  const rx = 0.32 * s * (1 + squish);
  const ry = 0.3 * s * (1 - squish);
  ctx.beginPath();
  ctx.moveTo(-rx, 0);
  ctx.bezierCurveTo(-rx * 1.1, -ry * 1.5, rx * 1.1, -ry * 1.5, rx, 0);
  // drippy bottom edge
  for (let i = 1; i <= 4; i++) {
    const x = rx - (i / 4) * rx * 2;
    ctx.quadraticCurveTo(x + rx * 0.25, 0.05 * s, x, 0);
  }
  ctx.closePath();
  ctx.globalAlpha = 0.95;
  fillStroke(ctx, goo, lw);
  ctx.globalAlpha = 1;
  // bits floating inside
  ctx.fillStyle = dark;
  circle(ctx, -0.12 * s, -0.12 * s, 0.035 * s);
  ctx.fill();
  circle(ctx, 0.14 * s, -0.08 * s, 0.025 * s);
  ctx.fill();
  oval(ctx, -0.14 * s, -ry * 0.95, 0.06 * s, 0.035 * s, -0.5);
  ctx.fillStyle = 'rgba(255,255,255,.55)';
  ctx.fill();
  monsterEye(ctx, 0.06 * s, -0.24 * s * (1 - squish), 0.09 * s, rank, lw);
  // tiny iron helmet, tilted
  ctx.save();
  ctx.translate(-0.02 * s, -ry * 1.12);
  ctx.rotate(-0.2 + squish);
  ctx.beginPath();
  ctx.arc(0, 0, 0.12 * s, Math.PI, TAU);
  ctx.closePath();
  fillStroke(ctx, IRON, lw);
  oval(ctx, 0, 0, 0.16 * s, 0.025 * s);
  fillStroke(ctx, IRON, lw);
  if (rank >= 1) {
    oval(ctx, -0.04 * s, -0.15 * s, 0.025 * s, 0.07 * s, -0.4);
    fillStroke(ctx, plumeFor(rank - 1), lw * 0.8);
  }
  ctx.restore();
  ctx.restore();
}

/**
 * The Flapper (Medieval): a small furry monster on bat wings. It flies, so nets can't catch it.
 * Drawn with its body about 0.55 × s above the feet point; the caller draws the shadow below.
 */
export function drawFlapper(ctx: Ctx, s: number, pose: MonsterPose, rank = 0) {
  const lw = Math.max(1, s * 0.03);
  ctx.lineJoin = 'round';
  const w = pose.walk * 2.2;
  const [fur, dark] = smallFur(rank);
  const y = -0.62 * s + Math.sin(w * 0.5) * 0.05 * s;
  const flap = Math.sin(w);
  for (const k of [-1, 1]) {
    // wings: the back one darker
    ctx.save();
    ctx.translate(k * 0.05 * s, y - 0.04 * s);
    ctx.scale(1, k < 0 ? 1 : 1);
    ctx.rotate(k < 0 ? -0.3 : 0.1);
    const up = flap * 0.22 * s;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(-0.15 * s, -0.2 * s - up, -0.42 * s, -0.16 * s - up);
    ctx.quadraticCurveTo(-0.34 * s, -0.06 * s - up * 0.5, -0.36 * s, 0.02 * s - up * 0.3);
    ctx.quadraticCurveTo(-0.24 * s, -0.04 * s, -0.22 * s, 0.06 * s);
    ctx.quadraticCurveTo(-0.12 * s, 0.0, 0, 0.06 * s);
    ctx.closePath();
    fillStroke(ctx, k < 0 ? '#3a3440' : '#57505f', lw);
    ctx.restore();
  }
  furPath(ctx, 0, y, 0.17 * s, 0.16 * s, 9, 0.15, 5);
  fillStroke(ctx, fur, lw);
  for (const k of [-1, 1]) {
    polygon(ctx, [
      [k * 0.08 * s - 0.03 * s, y - 0.13 * s],
      [k * 0.11 * s, y - 0.26 * s],
      [k * 0.08 * s + 0.04 * s, y - 0.12 * s],
    ]);
    fillStroke(ctx, BONE, lw * 0.8);
  }
  monsterEye(ctx, 0.05 * s, y - 0.01 * s, 0.075 * s, rank, lw);
  ctx.fillStyle = '#fffaf0';
  polygon(ctx, [
    [0.04 * s, y + 0.09 * s],
    [0.06 * s, y + 0.14 * s],
    [0.08 * s, y + 0.09 * s],
  ]);
  ctx.fill();
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = lw * 0.6;
  ctx.stroke();
  // dangling feet
  for (const k of [-1, 1])
    limb(ctx, k * 0.06 * s, y + 0.14 * s, k * 0.07 * s, y + 0.22 * s, 0.035 * s, dark, lw);
  if (rank >= 2) {
    // a little iron cap
    ctx.beginPath();
    ctx.arc(-0.01 * s, y - 0.08 * s, 0.14 * s, Math.PI * 1.1, Math.PI * 1.9);
    ctx.closePath();
    fillStroke(ctx, IRON, lw);
  }
}

// ---------- scenery ----------

export function drawShadow(ctx: Ctx, x: number, y: number, rx: number) {
  oval(ctx, x, y, rx, rx * 0.32);
  ctx.fillStyle = 'rgba(30,40,10,.28)';
  ctx.fill();
}

/** Trees, bushes and boulders. `s` is about the height. */
export function drawTree(ctx: Ctx, x: number, y: number, s: number) {
  const lw = Math.max(1, s * 0.03);
  drawShadow(ctx, x, y, s * 0.45);
  limb(ctx, x, y, x, y - s * 0.45, s * 0.16, '#7a4f2a', lw);
  for (const [dx, dy, r, c] of [
    [-0.2, -0.62, 0.3, '#3f8a3a'],
    [0.2, -0.64, 0.3, '#3f8a3a'],
    [0, -0.85, 0.34, '#4c9c44'],
  ] as const) {
    circle(ctx, x + dx * s, y + dy * s, r * s);
    fillStroke(ctx, c, lw);
  }
  circle(ctx, x - 0.08 * s, y - 0.95 * s, 0.09 * s);
  ctx.fillStyle = 'rgba(255,255,255,.25)';
  ctx.fill();
}
export function drawBush(ctx: Ctx, x: number, y: number, s: number) {
  const lw = Math.max(1, s * 0.03);
  drawShadow(ctx, x, y, s * 0.4);
  for (const [dx, r] of [
    [-0.18, 0.2],
    [0.18, 0.2],
    [0, 0.26],
  ] as const) {
    circle(ctx, x + dx * s, y - 0.18 * s, r * s);
    fillStroke(ctx, '#55a046', lw);
  }
  ctx.fillStyle = '#e6533c';
  for (const [dx, dy] of [
    [-0.1, -0.25],
    [0.12, -0.18],
    [0.02, -0.33],
  ] as const) {
    circle(ctx, x + dx * s, y + dy * s, 0.035 * s);
    ctx.fill();
  }
}
export function drawBoulder(ctx: Ctx, x: number, y: number, s: number) {
  drawShadow(ctx, x, y, s * 0.4);
  ctx.beginPath();
  ctx.moveTo(x - 0.38 * s, y);
  ctx.quadraticCurveTo(x - 0.4 * s, y - 0.4 * s, x - 0.05 * s, y - 0.45 * s);
  ctx.quadraticCurveTo(x + 0.36 * s, y - 0.42 * s, x + 0.38 * s, y);
  ctx.closePath();
  fillStroke(ctx, '#a39d92', Math.max(1, s * 0.03));
  oval(ctx, x - 0.12 * s, y - 0.3 * s, 0.08 * s, 0.05 * s);
  ctx.fillStyle = '#cdc8bd';
  ctx.fill();
}
/** A thatched hut, the Stone Age base. */
export function drawHut(ctx: Ctx, x: number, y: number, s: number) {
  const lw = Math.max(1, s * 0.03);
  drawShadow(ctx, x, y, s * 0.55);
  polygon(ctx, [
    [x - 0.5 * s, y],
    [x, y - 0.9 * s],
    [x + 0.5 * s, y],
  ]);
  fillStroke(ctx, '#d4a14f', lw);
  ctx.strokeStyle = '#a8772f';
  ctx.lineWidth = s * 0.025;
  for (const k of [0.3, 0.55]) {
    ctx.beginPath();
    ctx.moveTo(x - 0.5 * s * (1 - k * 0.9), y - 0.9 * s * k);
    ctx.lineTo(x + 0.5 * s * (1 - k * 0.9), y - 0.9 * s * k);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(x - 0.13 * s, y);
  ctx.lineTo(x - 0.13 * s, y - 0.18 * s);
  ctx.arc(x, y - 0.18 * s, 0.13 * s, Math.PI, 0);
  ctx.lineTo(x + 0.13 * s, y);
  ctx.closePath();
  fillStroke(ctx, '#3a2414', lw);
  for (const k of [-1, 1])
    limb(ctx, x, y - 0.88 * s, x + k * 0.12 * s, y - 1.02 * s, 0.04 * s, '#7a4f2a', lw * 0.7);
}

// ---------- Ancient scenery ----------

/** A tall, thin cypress tree. */
export function drawCypress(ctx: Ctx, x: number, y: number, s: number) {
  const lw = Math.max(1, s * 0.03);
  drawShadow(ctx, x, y, s * 0.3);
  limb(ctx, x, y, x, y - s * 0.2, s * 0.1, '#7a4f2a', lw);
  ctx.beginPath();
  ctx.moveTo(x, y - 1.15 * s);
  ctx.quadraticCurveTo(x + 0.26 * s, y - 0.6 * s, x + 0.12 * s, y - 0.16 * s);
  ctx.lineTo(x - 0.12 * s, y - 0.16 * s);
  ctx.quadraticCurveTo(x - 0.26 * s, y - 0.6 * s, x, y - 1.15 * s);
  ctx.closePath();
  fillStroke(ctx, '#3d7a3a', lw);
  ctx.beginPath();
  ctx.moveTo(x - 0.04 * s, y - 0.95 * s);
  ctx.quadraticCurveTo(x - 0.12 * s, y - 0.6 * s, x - 0.06 * s, y - 0.3 * s);
  ctx.strokeStyle = 'rgba(255,255,255,.25)';
  ctx.lineWidth = s * 0.04;
  ctx.stroke();
}

/** A clump of golden wheat. */
export function drawWheat(ctx: Ctx, x: number, y: number, s: number) {
  const lw = Math.max(1, s * 0.025);
  drawShadow(ctx, x, y, s * 0.35);
  for (const [dx, h, lean] of [
    [-0.18, 0.5, -0.2],
    [0, 0.62, 0],
    [0.18, 0.5, 0.2],
    [-0.08, 0.42, -0.1],
    [0.1, 0.45, 0.1],
  ] as const) {
    const tx = x + (dx + lean * 0.4) * s;
    const ty = y - h * s;
    ctx.beginPath();
    ctx.moveTo(x + dx * s * 0.5, y);
    ctx.lineTo(tx, ty);
    ctx.strokeStyle = '#b8932f';
    ctx.lineWidth = s * 0.03;
    ctx.stroke();
    oval(ctx, tx, ty - 0.06 * s, 0.045 * s, 0.1 * s, lean);
    fillStroke(ctx, '#e8c25a', lw);
  }
}

/** A clay pot with a painted stripe. */
export function drawAmphora(ctx: Ctx, x: number, y: number, s: number) {
  const lw = Math.max(1, s * 0.03);
  drawShadow(ctx, x, y, s * 0.25);
  for (const k of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(x + k * 0.13 * s, y - 0.52 * s, 0.07 * s, 0, TAU);
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 0.05 * s;
    ctx.stroke();
    ctx.strokeStyle = '#c96a3a';
    ctx.lineWidth = 0.025 * s;
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(x - 0.07 * s, y - 0.62 * s);
  ctx.lineTo(x - 0.06 * s, y - 0.5 * s);
  ctx.quadraticCurveTo(x - 0.26 * s, y - 0.35 * s, x - 0.06 * s, y);
  ctx.lineTo(x + 0.06 * s, y);
  ctx.quadraticCurveTo(x + 0.26 * s, y - 0.35 * s, x + 0.06 * s, y - 0.5 * s);
  ctx.lineTo(x + 0.07 * s, y - 0.62 * s);
  ctx.closePath();
  fillStroke(ctx, '#c96a3a', lw);
  ctx.beginPath();
  ctx.moveTo(x - 0.17 * s, y - 0.3 * s);
  ctx.lineTo(x + 0.17 * s, y - 0.3 * s);
  ctx.strokeStyle = '#2a1b14';
  ctx.lineWidth = s * 0.04;
  ctx.stroke();
}

/** A little temple with columns, the Ancient base. */
export function drawTemple(ctx: Ctx, x: number, y: number, s: number) {
  const lw = Math.max(1, s * 0.03);
  const stone = '#efe2c4';
  drawShadow(ctx, x, y, s * 0.6);
  ctx.beginPath();
  ctx.rect(x - 0.52 * s, y - 0.1 * s, 1.04 * s, 0.1 * s);
  fillStroke(ctx, stone, lw);
  for (let i = 0; i < 4; i++) {
    const cx = x + (-0.36 + i * 0.24) * s;
    ctx.beginPath();
    ctx.rect(cx - 0.06 * s, y - 0.62 * s, 0.12 * s, 0.52 * s);
    fillStroke(ctx, stone, lw);
    ctx.beginPath();
    ctx.moveTo(cx, y - 0.58 * s);
    ctx.lineTo(cx, y - 0.14 * s);
    ctx.strokeStyle = '#cdbb94';
    ctx.lineWidth = s * 0.02;
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.rect(x - 0.5 * s, y - 0.72 * s, 1.0 * s, 0.1 * s);
  fillStroke(ctx, stone, lw);
  polygon(ctx, [
    [x - 0.56 * s, y - 0.72 * s],
    [x, y - 1.02 * s],
    [x + 0.56 * s, y - 0.72 * s],
  ]);
  fillStroke(ctx, '#d4a14f', lw);
  circle(ctx, x, y - 0.82 * s, 0.05 * s);
  fillStroke(ctx, '#2f9e8f', lw * 0.7);
}

// ---------- Medieval scenery ----------

/** A pointy pine tree. */
export function drawPine(ctx: Ctx, x: number, y: number, s: number) {
  const lw = Math.max(1, s * 0.03);
  drawShadow(ctx, x, y, s * 0.4);
  limb(ctx, x, y, x, y - s * 0.25, s * 0.12, '#7a4f2a', lw);
  for (const [w, top, bottom, c] of [
    [0.42, 0.62, 0.2, '#2f6e3c'],
    [0.34, 0.86, 0.45, '#367a42'],
    [0.24, 1.08, 0.68, '#3f8a4a'],
  ] as const) {
    polygon(ctx, [
      [x - w * s, y - bottom * s],
      [x, y - top * s],
      [x + w * s, y - bottom * s],
    ]);
    fillStroke(ctx, c, lw);
  }
}

/** A red spotted mushroom. */
export function drawMushroom(ctx: Ctx, x: number, y: number, s: number) {
  const lw = Math.max(1, s * 0.03);
  drawShadow(ctx, x, y, s * 0.28);
  ctx.beginPath();
  ctx.rect(x - 0.08 * s, y - 0.3 * s, 0.16 * s, 0.3 * s);
  fillStroke(ctx, '#f3ead2', lw);
  ctx.beginPath();
  ctx.ellipse(x, y - 0.3 * s, 0.3 * s, 0.24 * s, 0, Math.PI, TAU);
  ctx.closePath();
  fillStroke(ctx, '#d8402f', lw);
  ctx.fillStyle = '#fff';
  for (const [dx, dy, r] of [
    [-0.15, -0.36, 0.045],
    [0.05, -0.47, 0.05],
    [0.17, -0.36, 0.035],
  ] as const) {
    circle(ctx, x + dx * s, y + dy * s, r * s);
    ctx.fill();
  }
}

/** A stone castle keep with a flag, the Medieval base. */
export function drawCastle(ctx: Ctx, x: number, y: number, s: number) {
  const lw = Math.max(1, s * 0.03);
  const stone = '#b9b3a6';
  drawShadow(ctx, x, y, s * 0.6);
  const battlements = (left: number, right: number, top: number) => {
    ctx.beginPath();
    ctx.moveTo(x + left * s, y);
    ctx.lineTo(x + left * s, y - top * s);
    const n = 3;
    const w = (right - left) / (n * 2 - 1);
    for (let i = 0; i < n * 2 - 1; i++) {
      const lx = left + w * i;
      const up = i % 2 === 0;
      ctx.lineTo(x + lx * s, y - (top + (up ? 0.1 : 0)) * s);
      ctx.lineTo(x + (lx + w) * s, y - (top + (up ? 0.1 : 0)) * s);
      ctx.lineTo(x + (lx + w) * s, y - top * s);
    }
    ctx.lineTo(x + right * s, y);
    ctx.closePath();
    fillStroke(ctx, stone, lw);
  };
  battlements(-0.55, -0.25, 0.7);
  battlements(0.25, 0.55, 0.7);
  battlements(-0.3, 0.3, 0.52);
  // gate
  ctx.beginPath();
  ctx.moveTo(x - 0.12 * s, y);
  ctx.lineTo(x - 0.12 * s, y - 0.2 * s);
  ctx.arc(x, y - 0.2 * s, 0.12 * s, Math.PI, 0);
  ctx.lineTo(x + 0.12 * s, y);
  ctx.closePath();
  fillStroke(ctx, '#6d4c2f', lw);
  for (const wx of [-0.4, 0.4]) {
    ctx.beginPath();
    ctx.rect(x + (wx - 0.03) * s, y - 0.5 * s, 0.06 * s, 0.12 * s);
    fillStroke(ctx, '#3a2414', lw * 0.7);
  }
  // flag
  limb(ctx, x - 0.4 * s, y - 0.8 * s, x - 0.4 * s, y - 1.12 * s, 0.025 * s, '#6d4c2f', lw * 0.6);
  polygon(ctx, [
    [x - 0.39 * s, y - 1.12 * s],
    [x - 0.15 * s, y - 1.04 * s],
    [x - 0.39 * s, y - 0.96 * s],
  ]);
  fillStroke(ctx, '#4fb3ff', lw * 0.7);
}

// ---------- puffs: a stopped enemy goes poof in dust and stars ----------

interface Bit {
  kind: 'dust' | 'star';
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  life: number;
  max: number;
  spin: number;
}

export class Puffs {
  private bits: Bit[] = [];

  /** A poof where an enemy was stopped. Positions and size are in pixels. */
  poof(x: number, y: number, size: number) {
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * TAU;
      this.bits.push({
        kind: 'dust',
        x,
        y,
        vx: Math.cos(a) * size * 1.6,
        vy: Math.sin(a) * size - size * 0.4,
        r: size * 0.28,
        life: 0,
        max: 0.55,
        spin: 0,
      });
    }
    for (let i = 0; i < 3; i++) {
      this.bits.push({
        kind: 'star',
        x,
        y: y - size * 0.3,
        vx: (i - 1) * size * 1.4,
        vy: -size * 2.4,
        r: size * 0.16,
        life: 0,
        max: 0.7,
        spin: i,
      });
    }
  }

  /** A little puff of dust where something got hit. */
  hit(x: number, y: number, size: number) {
    for (let i = 0; i < 3; i++) {
      this.bits.push({
        kind: 'dust',
        x,
        y,
        vx: (i - 1) * size,
        vy: -size * (0.4 + (i % 2) * 0.4),
        r: size * 0.12,
        life: 0,
        max: 0.3,
        spin: 0,
      });
    }
  }

  update(dt: number) {
    for (const b of this.bits) {
      b.life += dt;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      if (b.kind === 'star') b.vy += b.r * 50 * dt;
    }
    this.bits = this.bits.filter((b) => b.life < b.max);
  }

  draw(ctx: Ctx) {
    for (const b of this.bits) {
      const u = b.life / b.max;
      ctx.globalAlpha = 1 - u;
      if (b.kind === 'dust') {
        circle(ctx, b.x, b.y, b.r * (1 + u));
        ctx.fillStyle = '#efe8da';
        ctx.fill();
      } else {
        ctx.beginPath();
        for (let i = 0; i < 10; i++) {
          const a = b.spin + u * 4 + (i / 10) * TAU - Math.PI / 2;
          const rr = i % 2 ? b.r * 0.45 : b.r;
          if (i) ctx.lineTo(b.x + Math.cos(a) * rr, b.y + Math.sin(a) * rr);
          else ctx.moveTo(b.x + Math.cos(a) * rr, b.y + Math.sin(a) * rr);
        }
        ctx.closePath();
        fillStroke(ctx, '#ffd84a', Math.max(1, b.r * 0.15));
      }
    }
    ctx.globalAlpha = 1;
  }

  clear() {
    this.bits = [];
  }
}
