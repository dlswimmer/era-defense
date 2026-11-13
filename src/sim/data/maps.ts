// Maps. `path` is a list of grid waypoints [col, row]; enemies walk between them in straight lines.
// The first point can be off the grid (enemies walk in from outside). The last point is the base.
export interface MapDef {
  name: string;
  cols: number;
  rows: number;
  path: [number, number][];
  decor: [number, number][];
}

export const MAPS: Record<string, MapDef> = {
  meadow: {
    name: 'Meadow',
    cols: 10,
    rows: 13,
    path: [
      [1, -1],
      [1, 2],
      [8, 2],
      [8, 5],
      [1, 5],
      [1, 8],
      [8, 8],
      [8, 10],
      [4, 10],
      [4, 12],
    ],
    // A few cells with decorations (not buildable). Purely for looks.
    decor: [
      [0, 0],
      [9, 0],
      [4, 0],
      [9, 12],
      [0, 12],
      [9, 6],
      [0, 10],
    ],
  },
};
