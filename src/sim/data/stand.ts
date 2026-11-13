// Last Stand (Phase 2) knobs. The view is from the side: the wall is on the left, enemies walk
// in from the right along the ground. Positions are in the same tile units as Phase 1.
export const STAND = {
  width: 10,
  height: 13,
  groundY: 10.4, // where enemies walk
  wallLeft: 0.3,
  wallX: 2.3, // the front face of the wall: enemies stop here and attack it
  wallTop: 3.2,
  spawnX: 10.6, // enemies walk in from just off the right edge
  /** Heights (y) of the defender spots on the wall, bottom to top. */
  slots: [9.0, 7.4, 5.8, 4.2],
  unitX: 1.55, // where defenders stand on the wall
  wallHpScale: 15, // wall HP = era.wallHp × this
  enemySpeed: 0.75, // multiplies enemy speed (the lane is shorter than the Phase 1 trail)
  attackEvery: 1, // seconds between an enemy's hits on the wall
  wallDamage: { normal: 1, heavy: 3, boss: 10 },
  minChest: 15, // you always get at least one defender, even after a rough Phase 1
  firstWaveIn: 6, // seconds to set up defenders before the first wave
  breather: 3, // seconds between waves
};
