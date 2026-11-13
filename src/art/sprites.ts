// Cartoon sprites drawn in code: thick dark outlines, round shapes, simple animation.
// Every function draws with the feet at (0, 0), facing right, and `s` as the full height in
// pixels. Flip with ctx.scale(-1, 1) to face left. No images to load, so it stays sharp on any
// screen and new looks (hats, armor, colors) are just a few lines.

type Ctx = CanvasRenderingContext2D;

export const OUTLINE = '#2a1b14';
const TAU = Math.PI * 2;

// ---------- helpers ----------

function fillStroke(ctx: Ctx, fill: string, lw: number) {
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.lineWidth = lw;
  ctx.strokeStyle = OUTLINE;
  ctx.stroke();
}
function circle(ctx: Ctx, x: number, y: number, r: number) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
}
function oval(ctx: Ctx, x: number, y: number, rx: number, ry: number, rot = 0) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, rot, 0, TAU);
}
/** A rounded stick with an outline: arms, legs, handles. */
function limb(
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
function furPath(
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
function polygon(ctx: Ctx, pts: [number, number][]) {
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

// ---------- people ----------

export interface PersonLook {
  skin: string;
  hairColor: string;
  hair?: 'short' | 'pony';
  tunic: string;
  spot: string;
  band?: string;
  feather?: string;
  weapon: 'rock' | 'spear';
  /** A pile of rocks at their feet. */
  pile?: boolean;
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

  const lean = p >= 0 ? keyframes(p, LEAN) : 0;
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
  limb(ctx, shX, shY, handX, handY, 0.075 * s, look.skin, lw);
  circle(ctx, handX, handY, 0.045 * s);
  fillStroke(ctx, look.skin, lw);
  if (look.weapon === 'rock' && holding)
    drawRock(ctx, handX + 0.02 * s, handY - 0.02 * s, 0.065 * s, lw);

  // tunic with a zigzag hem
  ctx.beginPath();
  ctx.moveTo(-0.13 * s, -0.6 * s);
  ctx.lineTo(0.13 * s, -0.6 * s);
  ctx.lineTo(0.18 * s, -0.31 * s);
  const teeth = 5;
  for (let i = 0; i <= teeth * 2; i++) {
    ctx.lineTo(0.18 * s - (i / (teeth * 2)) * 0.36 * s, (i % 2 ? -0.24 : -0.31) * s);
  }
  ctx.closePath();
  fillStroke(ctx, look.tunic, lw);
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
  ctx.beginPath();
  ctx.moveTo(-0.15 * s, -0.4 * s);
  ctx.lineTo(0.16 * s, -0.4 * s);
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 0.035 * s;
  ctx.stroke();

  // near arm, hanging
  limb(ctx, -0.04 * s, -0.53 * s, -0.08 * s, -0.33 * s, 0.075 * s, look.skin, lw);
  circle(ctx, -0.08 * s, -0.33 * s, 0.042 * s);
  fillStroke(ctx, look.skin, lw);

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
  if (look.band) {
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

// ---------- monsters ----------

export interface MonsterPose {
  /** Walk cycle phase in radians (keeps counting up while walking). */
  walk: number;
  /** Club swing 0..1 while hitting the wall (0.6 is the hit), or null while walking. */
  attack: number | null;
}

/** The Grumbler: a grumpy one-eyed furball with a club. */
export function drawGrumbler(ctx: Ctx, s: number, pose: MonsterPose) {
  const lw = Math.max(1, s * 0.032);
  ctx.lineJoin = 'round';
  const w = pose.attack === null ? pose.walk : 0;
  const sw = Math.sin(w) * 0.09 * s;
  const bob = -Math.abs(Math.sin(w)) * 0.06 * s;
  const fur = '#7d68c9';
  const dark = '#5a479e';
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
  furPath(ctx, 0, -0.42 * s, 0.33 * s, 0.36 * s, 11, 0.12, 1.3);
  fillStroke(ctx, fur, lw);
  oval(ctx, 0.05 * s, -0.27 * s, 0.17 * s, 0.13 * s);
  ctx.fillStyle = 'rgba(255,255,255,.22)';
  ctx.fill();
  // one big eye with a grumpy brow
  circle(ctx, 0.08 * s, -0.5 * s, 0.13 * s);
  fillStroke(ctx, '#fffaf0', lw);
  circle(ctx, 0.13 * s, -0.49 * s, 0.065 * s);
  ctx.fillStyle = OUTLINE;
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
  drawClub(ctx, hx, hy, ca, 0.5 * s, lw);
  limb(ctx, 0.2 * s, -0.4 * s, hx, hy, 0.08 * s, fur, lw);
  circle(ctx, hx, hy, 0.05 * s);
  fillStroke(ctx, fur, lw);
  ctx.restore();
}

/**
 * The Woolly Brute: a big shaggy four-legged monster with tusks. The boss gets a bone crown and
 * war paint. It is about 1.4 × s long; the feet are centered around x = 0.
 */
export function drawBrute(ctx: Ctx, s: number, pose: MonsterPose, boss = false) {
  const lw = Math.max(1, s * 0.028);
  ctx.lineJoin = 'round';
  const w = pose.attack === null ? pose.walk : 0;
  const fur = '#8a5a36';
  const dark = '#5e3b20';
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
