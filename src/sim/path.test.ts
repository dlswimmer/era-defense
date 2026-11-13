import { describe, expect, it } from 'vitest';
import { MAPS } from './data/maps';
import { distToTrail, posAt, prepareMap } from './path';

describe('prepareMap', () => {
  const map = prepareMap(MAPS.meadow!);

  it('walks smoothly from the entrance to the base', () => {
    expect(posAt(map, 0)).toEqual(map.points[0]);
    expect(posAt(map, map.length)).toEqual(map.base);
    expect(posAt(map, map.length + 5)).toEqual(map.base);
    // Small steps along the trail never jump.
    for (let d = 0.1; d < map.length; d += 0.1) {
      const a = posAt(map, d - 0.1);
      const b = posAt(map, d);
      expect(Math.hypot(b.x - a.x, b.y - a.y)).toBeLessThanOrEqual(0.1001);
    }
  });

  it('is a decent length and stays on the map after the entrance', () => {
    expect(map.length).toBeGreaterThan(30);
    expect(map.length).toBeLessThan(45);
    for (let d = 2; d < map.length; d += 0.25) {
      const p = posAt(map, d);
      expect(p.x).toBeGreaterThan(0);
      expect(p.x).toBeLessThan(map.width);
      expect(p.y).toBeLessThan(map.height);
    }
  });

  it('measures distance to the trail', () => {
    for (const p of map.points) expect(distToTrail(map, p.x, p.y)).toBeCloseTo(0, 5);
    expect(distToTrail(map, 0.6, 3)).toBeGreaterThan(1);
  });

  it('never puts decorations on the trail', () => {
    for (const p of map.decor) expect(distToTrail(map, p.x, p.y)).toBeGreaterThan(map.pathWidth);
  });
});
