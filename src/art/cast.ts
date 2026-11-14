// Which drawn sprite each tower, defender, enemy and bit of scenery uses. Anything without an
// entry here still shows its emoji, so new content works before it gets art.
import type { EnemyId } from '../sim/data/enemies';
import type { TowerId } from '../sim/data/towers';
import type { UnitId } from '../sim/data/units';
import {
  IRON,
  drawAmphora,
  drawArrow,
  drawBoomerang,
  drawCastle,
  drawCatapult,
  drawCypress,
  drawMushroom,
  drawOilBlob,
  drawPine,
  drawTemple,
  drawWheat,
  type Armor,
  drawBoulder,
  drawBrute,
  drawBush,
  drawDropper,
  drawGrumbler,
  drawHut,
  drawNetFlying,
  drawPerson,
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

const NET_THROWER: PersonLook = {
  skin: '#e2a878',
  hairColor: '#8a3b1c',
  hair: 'pony',
  tunic: '#6aa6a0',
  spot: '#3f7a74',
  band: '#f2c94c',
  feather: '#5aa0e0',
  weapon: 'net',
};

// Ancient: woven tunics with a colored stripe.
const ARCHER: PersonLook = {
  skin: '#d9a06b',
  hairColor: '#2b1a12',
  hair: 'pony',
  tunic: '#efe6d2',
  band: '#2f6fb3',
  hem: 'straight',
  weapon: 'bow',
};
const BOOMERANG_THROWER: PersonLook = {
  skin: '#a8683f',
  hairColor: '#2b1a12',
  tunic: '#d4a14f',
  band: '#d8402f',
  hem: 'straight',
  weapon: 'boomerang',
};
// Medieval: iron helmets.
const CATAPULT_HELPER: PersonLook = {
  skin: '#f0c095',
  hairColor: '#8a3b1c',
  tunic: '#4f7fbf',
  band: '#f2c94c',
  hem: 'straight',
  helmet: IRON,
  weapon: 'none',
};
const OIL_POURER: PersonLook = {
  skin: '#e2a878',
  hairColor: '#4a2c1a',
  hair: 'pony',
  tunic: '#9c3b2f',
  band: '#f2c94c',
  hem: 'straight',
  helmet: IRON,
  weapon: 'bucket',
  cauldron: true,
};

export const TOWER_LOOKS: Partial<Record<TowerId, PersonLook>> = {
  rock: ROCK_THROWER,
  net: NET_THROWER,
  archer: ARCHER,
};
/** Towers drawn as a machine instead of one person. */
const TOWER_ART: Partial<Record<TowerId, 'catapult'>> = { catapult: 'catapult' };

export const hasTowerArt = (id: TowerId) => !!TOWER_LOOKS[id] || !!TOWER_ART[id];

/**
 * Draws a tower's crew with their feet at (0, 0), facing right. `p` is the throw progress (see
 * PersonPose), -1 when ready. Returns false when the tower has no art yet.
 */
export function drawTowerArt(
  ctx: CanvasRenderingContext2D,
  id: TowerId,
  s: number,
  p: number,
  t: number,
): boolean {
  const look = TOWER_LOOKS[id];
  if (look) drawPerson(ctx, s, look, { throw: p, t });
  else if (TOWER_ART[id] === 'catapult') drawCatapult(ctx, s, p, t, CATAPULT_HELPER);
  else return false;
  return true;
}

export const UNIT_LOOKS: Partial<Record<UnitId, PersonLook>> = {
  spear: SPEAR_THROWER,
  boomerang: BOOMERANG_THROWER,
  oil: OIL_POURER,
};
/** Defenders drawn as someone other than a thrower person. */
const UNIT_ART: Partial<Record<UnitId, 'dropper'>> = { boulder: 'dropper' };

export const hasUnitArt = (id: UnitId) => !!UNIT_LOOKS[id] || !!UNIT_ART[id];

/** Seconds of wind-up before a defender's shot: heaving a boulder takes a while. */
export const unitWindup = (id: UnitId) => (UNIT_ART[id] === 'dropper' ? 0.7 : 0.3);

/**
 * Draws a defender with its feet at (0, 0), facing right. `p` is the throw progress (see
 * PersonPose). Returns false when the defender has no art yet.
 */
export function drawUnitArt(
  ctx: CanvasRenderingContext2D,
  id: UnitId,
  s: number,
  p: number,
  t: number,
): boolean {
  const look = UNIT_LOOKS[id];
  if (look) drawPerson(ctx, s, look, { throw: p, t });
  else if (UNIT_ART[id] === 'dropper') drawDropper(ctx, s * 1.25, p, t);
  else return false;
  return true;
}

/** Which monster, and how armored it is (each era adds better armor to the same monsters). */
type MonsterArt = { kind: 'grumbler' | 'brute'; armor: Armor };
const ENEMY_ART: Partial<Record<EnemyId, MonsterArt>> = {
  caveman: { kind: 'grumbler', armor: 0 },
  mammoth: { kind: 'brute', armor: 0 },
  bronzeGrumbler: { kind: 'grumbler', armor: 1 },
  bronzeBrute: { kind: 'brute', armor: 1 },
  ironGrumbler: { kind: 'grumbler', armor: 2 },
  ironBrute: { kind: 'brute', armor: 2 },
};

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
  if (art?.kind === 'grumbler') drawGrumbler(ctx, s, pose, rank, art.armor);
  else if (art?.kind === 'brute') {
    ctx.save();
    ctx.translate(-0.14 * s, 0); // its middle, so it sits centered on its spot
    drawBrute(ctx, s, pose, boss, rank, art.armor);
    ctx.restore();
  } else return false;
  return true;
}

/** How tall an enemy is drawn, as a share of `s`. Used to place health bars. */
export const enemyArtHeight = (id: EnemyId) => (ENEMY_ART[id]?.kind === 'brute' ? 0.95 : 1);

/**
 * The thing a tower or defender throws, centered on (x, y). `angle` spins it (or points it, for
 * spears, arrows and oil); `u` is how far along its flight it is (0..1). Returns false when it has
 * no art.
 */
export function drawThrown(
  ctx: CanvasRenderingContext2D,
  kind: TowerId | UnitId,
  x: number,
  y: number,
  tile: number,
  angle: number,
  u = 1,
  radius = tile * 0.8,
): boolean {
  if (kind === 'net') {
    // A rolled-up net that opens as it flies; `radius` is the size it lands at.
    drawNetFlying(ctx, x, y, radius, Math.min(1, u * 1.4), angle, Math.max(1, tile * 0.03));
  } else if (kind === 'boulder') {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle * 0.4);
    drawRock(ctx, 0, 0, tile * 0.28);
    ctx.restore();
  } else if (kind === 'rock') {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    drawRock(ctx, 0, 0, tile * 0.13);
    ctx.restore();
  } else if (kind === 'catapult') {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle * 0.5);
    drawRock(ctx, 0, 0, tile * 0.2);
    ctx.restore();
  } else if (kind === 'spear') drawSpear(ctx, x, y, angle, tile * 0.75);
  else if (kind === 'archer') drawArrow(ctx, x, y, angle, tile * 0.5);
  else if (kind === 'boomerang') drawBoomerang(ctx, x, y, tile * 0.16, u * 30);
  else if (kind === 'oil') drawOilBlob(ctx, x, y, tile * 0.11, angle);
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
  const kind = i % 3;
  if (eraId === 'stone') {
    if (kind === 0) drawTree(ctx, x, y, tile * 1.0);
    else if (kind === 1) drawBush(ctx, x, y, tile * 0.8);
    else drawBoulder(ctx, x, y, tile * 0.8);
  } else if (eraId === 'ancient') {
    if (kind === 0) drawCypress(ctx, x, y, tile * 1.0);
    else if (kind === 1) drawWheat(ctx, x, y, tile * 0.8);
    else drawAmphora(ctx, x, y, tile * 0.7);
  } else if (eraId === 'medieval') {
    if (kind === 1) drawMushroom(ctx, x, y, tile * 0.6);
    else drawPine(ctx, x, y, tile * (kind === 0 ? 1.0 : 0.8));
  } else return false;
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
  if (eraId === 'stone') drawHut(ctx, x, y, s);
  else if (eraId === 'ancient') drawTemple(ctx, x, y, s);
  else if (eraId === 'medieval') drawCastle(ctx, x, y, s);
  else return false;
  return true;
}
