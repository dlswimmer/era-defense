import type { MapDef } from './data/maps';

export interface Point {
  x: number;
  y: number;
}

/** A map with its path turned into geometry. Positions are in tiles (cell centers at +0.5). */
export interface PreparedMap {
  def: MapDef;
  cols: number;
  rows: number;
  points: Point[];
  segLens: number[];
  length: number;
  pathCells: Set<string>;
  decorCells: Set<string>;
  base: { col: number; row: number };
}

export const cellKey = (col: number, row: number) => `${col},${row}`;

export function prepareMap(def: MapDef): PreparedMap {
  const points = def.path.map(([c, r]) => ({ x: c + 0.5, y: r + 0.5 }));
  const segLens: number[] = [];
  let length = 0;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1]!;
    const b = points[i]!;
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    segLens.push(len);
    length += len;
  }

  const pathCells = new Set<string>();
  for (let i = 1; i < def.path.length; i++) {
    const [c0, r0] = def.path[i - 1]!;
    const [c1, r1] = def.path[i]!;
    const steps = Math.max(Math.abs(c1 - c0), Math.abs(r1 - r0));
    for (let s = 0; s <= steps; s++) {
      const c = Math.round(c0 + ((c1 - c0) * s) / steps);
      const r = Math.round(r0 + ((r1 - r0) * s) / steps);
      if (c >= 0 && r >= 0 && c < def.cols && r < def.rows) pathCells.add(cellKey(c, r));
    }
  }

  const last = def.path[def.path.length - 1]!;
  return {
    def,
    cols: def.cols,
    rows: def.rows,
    points,
    segLens,
    length,
    pathCells,
    decorCells: new Set(def.decor.map(([c, r]) => cellKey(c, r))),
    base: { col: last[0], row: last[1] },
  };
}

/** Position along the path after walking `d` tiles from the start. */
export function posAt(map: PreparedMap, d: number): Point {
  let rest = Math.max(0, d);
  for (let i = 0; i < map.segLens.length; i++) {
    const len = map.segLens[i]!;
    const a = map.points[i]!;
    const b = map.points[i + 1]!;
    if (rest <= len) {
      const t = len === 0 ? 0 : rest / len;
      return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
    }
    rest -= len;
  }
  const end = map.points[map.points.length - 1]!;
  return { x: end.x, y: end.y };
}
