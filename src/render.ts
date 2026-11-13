// Canvas drawing helpers. Everything is drawn in CSS pixels; fitCanvas sets up device-pixel scaling.
import type { Era } from './sim/data/eras';
import { cellKey, type PreparedMap } from './sim/path';

const EMOJI_FONT = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';

/** Sizes the canvas to the biggest whole-pixel tile that fits its parent. Returns the tile size. */
export function fitCanvas(canvas: HTMLCanvasElement, cols: number, rows: number): number {
  const stage = canvas.parentElement!;
  const tile = Math.max(
    16,
    Math.floor(Math.min(stage.clientWidth / cols, stage.clientHeight / rows)),
  );
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

/** Grass, path, decorations and the base at the end of the path. */
export function drawMap(
  ctx: CanvasRenderingContext2D,
  map: PreparedMap,
  era: Era,
  tile: number,
  wallFrac = 1,
) {
  for (let r = 0; r < map.rows; r++) {
    for (let c = 0; c < map.cols; c++) {
      const key = cellKey(c, r);
      ctx.fillStyle = map.pathCells.has(key) ? era.path : (c + r) % 2 ? era.ground : era.ground2;
      ctx.fillRect(c * tile, r * tile, tile, tile);
    }
  }
  // Soft edge along the path so it reads as a road.
  ctx.strokeStyle = 'rgba(0,0,0,.12)';
  ctx.lineWidth = tile * 0.08;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  map.points.forEach((p, i) =>
    i ? ctx.lineTo(p.x * tile, p.y * tile) : ctx.moveTo(p.x * tile, p.y * tile),
  );
  ctx.stroke();

  map.def.decor.forEach(([c, r], i) => {
    emoji(ctx, era.decor[i % era.decor.length]!, (c + 0.5) * tile, (r + 0.5) * tile, tile * 0.6);
  });

  // Base and outer wall.
  const bx = (map.base.col + 0.5) * tile;
  const by = (map.base.row + 0.5) * tile;
  ctx.fillStyle = wallFrac > 0.5 ? '#8a8f98' : wallFrac > 0.25 ? '#a07b5a' : '#a0504a';
  ctx.fillRect(bx - tile * 1.5, by - tile * 0.55, tile * 3, tile * 0.18);
  emoji(ctx, era.base, bx, by + tile * 0.08, tile * 0.85);
}
