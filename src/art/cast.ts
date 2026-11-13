// Which drawn sprite each tower, defender, enemy and bit of scenery uses. Anything without an
// entry here still shows its emoji, so new content works before it gets art.
import type { EnemyId } from '../sim/data/enemies';
import type { TowerId } from '../sim/data/towers';
import type { UnitId } from '../sim/data/units';
import {
  drawBoulder,
  drawBrute,
  drawBush,
  drawGrumbler,
  drawHut,
  drawRock,
  drawSpear,
  drawTree,
  type MonsterPose,
  type PersonLook,
} from './sprites';

const ROCK_THROWER: PersonLook = {
  skin: '#f0c095',
  hairColor: '#4a2c1a',
  tunic: '#c98a45',
  spot: '#8e5a26',
  band: '#2f9e8f',
  feather: '#e6533c',
  weapon: 'rock',
  pile: true,
};
const SPEAR_THROWER: PersonLook = {
  skin: '#c9875a',
  hairColor: '#2b1a12',
  hair: 'pony',
  tunic: '#a8b46a',
  spot: '#6f7a3a',
  band: '#e0a32b',
  weapon: 'spear',
};

export const TOWER_LOOKS: Partial<Record<TowerId, PersonLook>> = { rock: ROCK_THROWER };
export const UNIT_LOOKS: Partial<Record<UnitId, PersonLook>> = { spear: SPEAR_THROWER };

type MonsterArt = 'grumbler' | 'brute';
const ENEMY_ART: Partial<Record<EnemyId, MonsterArt>> = { caveman: 'grumbler', mammoth: 'brute' };

export const hasEnemyArt = (id: EnemyId) => ENEMY_ART[id] !== undefined;

/**
 * Draws an enemy with its feet at (0, 0), centered, facing right. `s` is the size in pixels of a
 * normal enemy (bosses are scaled by the caller). Returns false when the enemy has no art yet.
 */
export function drawEnemyArt(
  ctx: CanvasRenderingContext2D,
  id: EnemyId,
  s: number,
  pose: MonsterPose,
  boss: boolean,
  rank = 0,
): boolean {
  const art = ENEMY_ART[id];
  if (art === 'grumbler') drawGrumbler(ctx, s, pose, rank);
  else if (art === 'brute') {
    ctx.save();
    ctx.translate(-0.14 * s, 0); // its middle, so it sits centered on its spot
    drawBrute(ctx, s, pose, boss, rank);
    ctx.restore();
  } else return false;
  return true;
}

/** How tall an enemy is drawn, as a share of `s`. Used to place health bars. */
export const enemyArtHeight = (id: EnemyId) => (ENEMY_ART[id] === 'brute' ? 0.95 : 1);

/** The thing a tower or defender throws, centered on (x, y). Returns false when it has no art. */
export function drawThrown(
  ctx: CanvasRenderingContext2D,
  kind: TowerId | UnitId,
  x: number,
  y: number,
  tile: number,
  angle: number,
): boolean {
  if (kind === 'rock') {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    drawRock(ctx, 0, 0, tile * 0.13);
    ctx.restore();
  } else if (kind === 'spear') drawSpear(ctx, x, y, angle, tile * 0.75);
  else return false;
  return true;
}

/** Scenery for an era: tree, bush, boulder... Returns false when the era has no art yet. */
export function drawDecor(
  ctx: CanvasRenderingContext2D,
  eraId: string,
  i: number,
  x: number,
  y: number,
  tile: number,
): boolean {
  if (eraId !== 'stone') return false;
  const kind = i % 3;
  if (kind === 0) drawTree(ctx, x, y, tile * 1.0);
  else if (kind === 1) drawBush(ctx, x, y, tile * 0.8);
  else drawBoulder(ctx, x, y, tile * 0.8);
  return true;
}

/** The base for an era, with its bottom at (x, y). Returns false when the era has no art yet. */
export function drawBaseArt(
  ctx: CanvasRenderingContext2D,
  eraId: string,
  x: number,
  y: number,
  s: number,
): boolean {
  if (eraId !== 'stone') return false;
  drawHut(ctx, x, y, s);
  return true;
}
