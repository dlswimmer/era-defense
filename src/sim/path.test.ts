import { describe, expect, it } from 'vitest';
import { MAPS } from './data/maps';
import { cellKey, posAt, prepareMap } from './path';

describe('prepareMap', () => {
  const map = prepareMap(MAPS.meadow!);

  it('walks from the first waypoint to the base', () => {
    expect(posAt(map, 0)).toEqual(map.points[0]);
    expect(posAt(map, map.length)).toEqual(map.points[map.points.length - 1]);
    expect(posAt(map, map.length + 5)).toEqual(map.points[map.points.length - 1]);
  });

  it('marks path cells inside the grid, including the base', () => {
    expect(map.pathCells.has(cellKey(map.base.col, map.base.row))).toBe(true);
    expect(map.pathCells.has(cellKey(1, 0))).toBe(true);
    expect(map.pathCells.has(cellKey(5, 2))).toBe(true);
    expect(map.pathCells.has(cellKey(5, 3))).toBe(false);
  });

  it('never puts decorations on the path', () => {
    for (const key of map.decorCells) expect(map.pathCells.has(key)).toBe(false);
  });
});
