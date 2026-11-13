// Canvas drawing helpers. Everything is drawn in CSS pixels; fitCanvas sets up device-pixel scaling.
import { drawBaseArt, drawDecor } from './art/cast';
import type { Era } from './sim/data/eras';
import { createRng } from './sim/rng';
import type { PreparedMap } from './sim/path';

const EMOJI_FONT = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';

/** Sizes the canvas to the biggest tile that fits its parent. Returns the tile size. */
export function fitCanvas(canvas: HTMLCanvasElement, cols: number, rows: number): number {
  const stage = canvas.parentElement!;
  // Quarter-pixel steps: as big as fits, without blurry odd sizes.
  const fit = Math.min(stage.clientWidth / cols, stage.clientHeight / rows);
  const tile = Math.max(16, Math.floor(fit * 4) / 4);
  const dpr = window.devicePixelRatio || 1;
  canvas.style.width = `${tile * cols}px`;
  canvas.style.height = `${tile * rows}px`;
  canvas.width = Math.round(tile * cols * dpr);
  canvas.height = Math.round(tile * rows * dpr);
  canvas.getContext('2d')!.setTransform(dpr, 0, 0, dpr, 0, 0);
  return tile;
}

export function emoji(
  ctx: CanvasRenderingContext2D,
  ch: string,
  x: number,
  y: number,
  size: number,
) {
  ctx.font = `${Math.round(size)}px ${EMOJI_FONT}`;
  ctx.fillStyle = '#000'; // emoji pick up the fill alpha in some browsers
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(ch, x, y);
}

export function text(
  ctx: CanvasRenderingContext2D,
  s: string,
  x: number,
  y: number,
  size: number,
  color: string,
) {
  ctx.font = `800 ${Math.round(size)}px system-ui, sans-serif, ${EMOJI_FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineWidth = Math.max(2, size / 6);
  ctx.strokeStyle = 'rgba(0,0,0,.6)';
  ctx.strokeText(s, x, y);
  ctx.fillStyle = color;
  ctx.fillText(s, x, y);
}

export function hpBar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  frac: number,
) {
  ctx.fillStyle = 'rgba(0,0,0,.55)';
  ctx.fillRect(x - w / 2, y, w, h);
  ctx.fillStyle = frac > 0.5 ? '#5fd068' : frac > 0.25 ? '#ffb547' : '#ff5d5d';
  ctx.fillRect(x - w / 2, y, w * Math.max(0, frac), h);
}

/** Mixes a #rrggbb color toward black (amount < 0) or white (amount > 0). */
export function shade(hex: string, amount: number): string {
  const n = parseInt(hex.slice(1), 16);
  const target = amount < 0 ? 0 : 255;
  const a = Math.abs(amount);
  const mix = (c: number) => Math.round(c + (target - c) * a);
  return `rgb(${mix((n >> 16) & 255)},${mix((n >> 8) & 255)},${mix(n & 255)})`;
}

function tracePath(ctx: CanvasRenderingContext2D, map: PreparedMap, tile: number) {
  ctx.beginPath();
  map.points.forEach((p, i) =>
    i ? ctx.lineTo(p.x * tile, p.y * tile) : ctx.moveTo(p.x * tile, p.y * tile),
  );
}

/** Grass, the dirt trail and decorations. Drawn once per map/era/size and then reused. */
function renderGround(map: PreparedMap, era: Era, tile: number, dpr: number): HTMLCanvasElement {
  const w = map.width * tile;
  const h = map.height * tile;
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  const ctx = canvas.getContext('2d')!;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const rng = createRng(7); // same scenery every time

  // Grass: base color, soft patches, then little tufts and flowers.
  ctx.fillStyle = era.ground;
  ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 70; i++) {
    ctx.fillStyle = i % 2 ? era.ground2 : shade(era.ground, 0.06);
    ctx.globalAlpha = 0.7;
    ctx.beginPath();
    ctx.ellipse(
      rng.next() * w,
      rng.next() * h,
      tile * (0.5 + rng.next() * 1.2),
      tile * (0.3 + rng.next() * 0.7),
      rng.next() * Math.PI,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.strokeStyle = shade(era.ground, -0.22);
  ctx.lineWidth = Math.max(1, tile * 0.035);
  ctx.lineCap = 'round';
  for (let i = 0; i < 260; i++) {
    const x = rng.next() * w;
    const y = rng.next() * h;
    const s = tile * (0.06 + rng.next() * 0.06);
    ctx.beginPath();
    ctx.moveTo(x - s, y - s * 1.2);
    ctx.lineTo(x, y);
    ctx.lineTo(x + s * 0.2, y - s * 1.6);
    ctx.moveTo(x, y);
    ctx.lineTo(x + s, y - s * 1.1);
    ctx.stroke();
  }
  for (let i = 0; i < 40; i++) {
    ctx.fillStyle = rng.pick(['#fff6d5', '#ffe066', '#ffb3c7']);
    ctx.beginPath();
    ctx.arc(rng.next() * w, rng.next() * h, tile * 0.045, 0, Math.PI * 2);
    ctx.fill();
  }

  // The trail: a soft shadow, a darker rim, the dirt, and a worn lighter middle.
  const pw = map.pathWidth * tile;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.save();
  ctx.translate(0, tile * 0.06);
  tracePath(ctx, map, tile);
  ctx.strokeStyle = 'rgba(0,0,0,.18)';
  ctx.lineWidth = pw + tile * 0.22;
  ctx.stroke();
  ctx.restore();
  tracePath(ctx, map, tile);
  ctx.strokeStyle = shade(era.path, -0.28);
  ctx.lineWidth = pw + tile * 0.14;
  ctx.stroke();
  ctx.strokeStyle = era.path;
  ctx.lineWidth = pw;
  ctx.stroke();
  ctx.strokeStyle = shade(era.path, 0.12);
  ctx.lineWidth = pw * 0.45;
  ctx.globalAlpha = 0.55;
  ctx.stroke();
  ctx.globalAlpha = 1;
  // Pebbles scattered along the trail.
  for (let i = 0; i < 90; i++) {
    const p = map.points[Math.floor(rng.next() * map.points.length)]!;
    const a = rng.next() * Math.PI * 2;
    const r = rng.next() * map.pathWidth * 0.42;
    ctx.fillStyle = shade(era.path, rng.next() < 0.5 ? -0.2 : -0.35);
    ctx.beginPath();
    ctx.ellipse(
      (p.x + Math.cos(a) * r) * tile,
      (p.y + Math.sin(a) * r) * tile,
      tile * (0.03 + rng.next() * 0.04),
      tile * (0.025 + rng.next() * 0.03),
      rng.next() * Math.PI,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }

  // A dirt clearing around the base.
  ctx.fillStyle = shade(era.path, -0.28);
  ctx.beginPath();
  ctx.arc(map.base.x * tile, map.base.y * tile, tile * 0.78, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = era.path;
  ctx.beginPath();
  ctx.arc(map.base.x * tile, map.base.y * tile, tile * 0.7, 0, Math.PI * 2);
  ctx.fill();

  map.decor.forEach((p, i) => {
    if (drawDecor(ctx, era.id, i, p.x * tile, (p.y + 0.3) * tile, tile)) return;
    ctx.fillStyle = 'rgba(0,0,0,.18)';
    ctx.beginPath();
    ctx.ellipse(p.x * tile, (p.y + 0.25) * tile, tile * 0.3, tile * 0.1, 0, 0, Math.PI * 2);
    ctx.fill();
    emoji(ctx, era.decor[i % era.decor.length]!, p.x * tile, p.y * tile, tile * 0.7);
  });
  return canvas;
}

const groundCache = new Map<string, HTMLCanvasElement>();

/** Grass, trail, decorations and the base at the end of the trail. */
export function drawMap(ctx: CanvasRenderingContext2D, map: PreparedMap, era: Era, tile: number) {
  const dpr = window.devicePixelRatio || 1;
  const key = `${map.def.name}|${era.id}|${tile}|${dpr}`;
  let ground = groundCache.get(key);
  if (!ground) {
    if (groundCache.size > 8) groundCache.clear();
    ground = renderGround(map, era, tile, dpr);
    groundCache.set(key, ground);
  }
  ctx.drawImage(ground, 0, 0, map.width * tile, map.height * tile);
  if (!drawBaseArt(ctx, era.id, map.base.x * tile, (map.base.y + 0.45) * tile, tile * 1.3))
    emoji(ctx, era.base, map.base.x * tile, map.base.y * tile, tile * 1.0);
}
