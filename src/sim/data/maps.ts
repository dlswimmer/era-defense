// Maps. Positions are in world units ("tiles"): the map is `width` × `height` of them, and
// tower ranges and enemy speeds use the same unit.
//   trail: control points the enemies' trail is smoothed through (a curve, not straight lines).
//          The first point can be off the map (enemies walk in). The last point is the base.
//   pathWidth: how wide the trail is. Towers can't be placed on it.
//   decor: [x, y] spots for trees, rocks and so on. Towers can't go on them either.
export interface MapDef {
  name: string;
  width: number;
  height: number;
  pathWidth: number;
  trail: [number, number][];
  decor: [number, number][];
}

export const MAPS: Record<string, MapDef> = {
  meadow: {
    name: 'Meadow',
    width: 10,
    height: 13,
    pathWidth: 0.85,
    trail: [
      [2.2, -1],
      [2.0, 1.4],
      [3.6, 2.6],
      [6.6, 1.6],
      [8.4, 3.0],
      [7.4, 5.0],
      [4.4, 4.6],
      [1.6, 5.6],
      [1.8, 8.0],
      [4.6, 8.6],
      [7.4, 7.6],
      [8.6, 9.6],
      [7.2, 11.2],
      [5.0, 11.0],
      [3.6, 12.0],
    ],
    decor: [
      [0.6, 0.6],
      [9.3, 0.6],
      [5.2, 0.7],
      [9.3, 12.3],
      [0.6, 9.9],
      [9.4, 6.6],
      [4.9, 6.6],
      [0.6, 12.3],
    ],
  },
};
