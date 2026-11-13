import type { MapDef } from './data/maps';

export interface Point {
  x: number;
  y: number;
}

/** A map with its trail turned into geometry. Positions are in world units ("tiles"). */
export interface PreparedMap {
  def: MapDef;
  width: number;
  height: number;
  pathWidth: number;
  /** The smoothed trail as a dense polyline, from the entrance to the base. */
  points: Point[];
  /** Distance along the trail at each point. */
  dist: number[];
  length: number;
  decor: Point[];
  base: Point;
}

/** Catmull-Rom spline through the control points, sampled into a polyline. */
export function smoothTrail(ctrl: Point[], samplesPerSegment = 14): Point[] {
  const out: Point[] = [];
  const at = (i: number) => ctrl[Math.max(0, Math.min(ctrl.length - 1, i))]!;
  for (let i = 0; i < ctrl.length - 1; i++) {
    const p0 = at(i - 1);
    const p1 = at(i);
    const p2 = at(i + 1);
    const p3 = at(i + 2);
    for (let s = 0; s < samplesPerSegment; s++) {
      const t = s / samplesPerSegment;
      const t2 = t * t;
      const t3 = t2 * t;
      const f = (a: number, b: number, c: number, d: number) =>
        0.5 *
        (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      out.push({ x: f(p0.x, p1.x, p2.x, p3.x), y: f(p0.y, p1.y, p2.y, p3.y) });
    }
  }
  const last = ctrl[ctrl.length - 1]!;
  out.push({ x: last.x, y: last.y });
  return out;
}

export function prepareMap(def: MapDef): PreparedMap {
  const points = smoothTrail(def.trail.map(([x, y]) => ({ x, y })));
  const dist = [0];
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1]!;
    const b = points[i]!;
    dist.push(dist[i - 1]! + Math.hypot(b.x - a.x, b.y - a.y));
  }
  const base = points[points.length - 1]!;
  return {
    def,
    width: def.width,
    height: def.height,
    pathWidth: def.pathWidth,
    points,
    dist,
    length: dist[dist.length - 1]!,
    decor: def.decor.map(([x, y]) => ({ x, y })),
    base: { x: base.x, y: base.y },
  };
}

/** Position along the trail after walking `d` tiles from the start. */
export function posAt(map: PreparedMap, d: number): Point {
  const { points, dist } = map;
  if (d <= 0) return { ...points[0]! };
  if (d >= map.length) return { ...points[points.length - 1]! };
  let lo = 0;
  let hi = dist.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (dist[mid]! <= d) lo = mid;
    else hi = mid;
  }
  const a = points[lo]!;
  const b = points[hi]!;
  const len = dist[hi]! - dist[lo]!;
  const t = len === 0 ? 0 : (d - dist[lo]!) / len;
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

/** Shortest distance from (x, y) to the middle line of the trail. */
export function distToTrail(map: PreparedMap, x: number, y: number): number {
  let best = Infinity;
  const { points } = map;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1]!;
    const b = points[i]!;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len2 = dx * dx + dy * dy;
    const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / len2));
    const d = Math.hypot(x - (a.x + dx * t), y - (a.y + dy * t));
    if (d < best) best = d;
  }
  return best;
}
