// Last Stand (Phase 2) rules. Pure logic, like run.ts: the scene draws it, bots can play it.
// Phase 1 ends when the first enemy gets through. Then you defend the wall: buy defenders with
// the War Chest (they take a free place on the wall by themselves) and team boosts that make
// all of them stronger, until the wall falls. Waves keep counting up from where Phase 1 stopped.
import { ERAS } from './data/eras';
import { enemyDef, type EnemyId } from './data/enemies';
import { GAME } from './data/game';
import { BOOSTS, STAND, boostEffect, type Boost, type BoostId } from './data/stand';
import { unitDef, type UnitId } from './data/units';
import { buildWave, hpScale, type Spawn } from './data/waves';
import { createRng, type Rng } from './rng';

/** A position on the field. x along the field, y height (down is +), z depth into the screen. */
export interface Pos3 {
  x: number;
  y: number;
  z: number;
}

export interface Defender {
  id: number;
  type: UnitId;
  seat: number; // where on the wall it stands
  cooldown: number;
}

export interface Attacker {
  id: number;
  type: EnemyId;
  boss: boolean;
  tier: number;
  hp: number;
  maxHp: number;
  speed: number;
  x: number;
  z: number;
  hitTimer: number;
}

export interface StandShot extends Pos3 {
  targetId: number;
  tx: number;
  ty: number;
  tz: number;
  dmg: number;
  splash: number;
  speed: number;
  unit: UnitId;
}

export type StandEvent =
  | { type: 'kill'; x: number; y: number; z: number; chest: number; boss: boolean }
  | { type: 'wallHit'; z: number; dmg: number }
  | { type: 'splash'; x: number; y: number; z: number; radius: number }
  | { type: 'waveStart'; wave: number; boss: boolean }
  | { type: 'fallen' };

export interface Stand {
  rng: Rng;
  era: number;
  chest: number; // War Chest ⚔️ to spend on defenders and boosts
  wave: number;
  startWave: number; // the Phase 1 wave the Last Stand started in
  wallHp: number;
  wallMax: number;
  defenders: Defender[];
  boosts: Record<BoostId, number>;
  enemies: Attacker[];
  shots: StandShot[];
  queue: Spawn[];
  gap: number;
  spawnTimer: number;
  nextWaveIn: number;
  damageBonus: number; // from Relic upgrades
  kills: number;
  bosses: number;
  time: number;
  over: boolean;
  nextId: number;
  events: StandEvent[];
}

export interface StandOptions {
  era: number;
  wave: number; // the wave Phase 1 reached
  chest: number;
  damageBonus?: number;
}

export function createStand(seed: number, opts: StandOptions): Stand {
  const wall = ERAS[opts.era]!.wallHp * STAND.wallHpScale;
  const start = Math.max(0, opts.wave - 1); // the wave that broke through comes again
  return {
    rng: createRng(seed),
    era: opts.era,
    chest: Math.max(opts.chest, STAND.minChest),
    wave: start,
    startWave: start,
    wallHp: wall,
    wallMax: wall,
    defenders: [],
    boosts: { power: 0, speed: 0, reach: 0, repair: 0 },
    enemies: [],
    shots: [],
    queue: [],
    gap: 1,
    spawnTimer: 0,
    nextWaveIn: STAND.firstWaveIn,
    damageBonus: opts.damageBonus ?? 1,
    kills: 0,
    bosses: 0,
    time: 0,
    over: false,
    nextId: 1,
    events: [],
  };
}

// ---------- Where things are ----------

/**
 * Places on top of the wall, filled in order: the front rank along the edge facing the enemies
 * first (from the near end of the wall to the far end), then a second rank crowds in behind it.
 */
export function seatPos(seat: number): Pos3 {
  const { wall, depth, maxDefenders } = STAND;
  const perRank = Math.ceil(maxDefenders / 2);
  const rank = Math.floor(seat / perRank);
  const i = seat % perRank;
  return {
    x: wall.front - 0.5 - rank * 0.9,
    y: wall.top - 0.35,
    z: 0.3 + (i * (depth - 0.6)) / (perRank - 1),
  };
}

/** Height of an enemy's middle. */
export const enemyY = (e: Attacker) => STAND.groundY - 0.35 * (e.boss ? GAME.boss.size : 1);

/** Where an enemy stops to hit the wall. */
export const wallStop = (e: Attacker) => STAND.wall.front + 0.3 * (e.boss ? GAME.boss.size : 1);

// ---------- Player actions ----------

export const isUnitUnlocked = (stand: Stand, type: UnitId) => unitDef(type).era <= stand.era;

export const wallFull = (stand: Stand) => stand.defenders.length >= STAND.maxDefenders;

export function canHire(stand: Stand, type: UnitId): boolean {
  return (
    !stand.over &&
    !wallFull(stand) &&
    isUnitUnlocked(stand, type) &&
    stand.chest >= unitDef(type).cost
  );
}

/** Buys a defender. It takes the next free place on the wall. */
export function hire(stand: Stand, type: UnitId): Defender | null {
  if (!canHire(stand, type)) return null;
  stand.chest -= unitDef(type).cost;
  const taken = new Set(stand.defenders.map((d) => d.seat));
  let seat = 0;
  while (taken.has(seat)) seat++;
  const unit: Defender = { id: stand.nextId++, type, seat, cooldown: 0 };
  stand.defenders.push(unit);
  return unit;
}

/** War Chest for the next level of a boost, or null when it's maxed (or the wall is full HP). */
export function boostCost(stand: Stand, boost: Boost): number | null {
  const level = stand.boosts[boost.id];
  if (boost.max !== undefined && level >= boost.max) return null;
  if (boost.id === 'repair' && stand.wallHp >= stand.wallMax) return null;
  return Math.round(boost.cost(level) * (STAND.boostCostByEra[stand.era] ?? 1));
}

export function buyBoost(stand: Stand, id: BoostId): boolean {
  const boost = BOOSTS.find((b) => b.id === id)!;
  const cost = boostCost(stand, boost);
  if (cost === null || stand.chest < cost || stand.over) return false;
  stand.chest -= cost;
  stand.boosts[id]++;
  if (id === 'repair') {
    stand.wallHp = Math.min(
      stand.wallMax,
      stand.wallHp + Math.round(stand.wallMax * boostEffect.repair),
    );
  }
  return true;
}

/** A defender's stats with the team boosts. */
export function defenderStats(stand: Stand, type: UnitId) {
  const def = unitDef(type);
  return {
    dmg: def.dmg * boostEffect.power(stand.boosts.power) * stand.damageBonus,
    rate: def.rate * boostEffect.speed(stand.boosts.speed),
    range: def.range + boostEffect.reach(stand.boosts.reach),
  };
}

/** Waves fully held at the wall. */
export const standWavesHeld = (stand: Stand) =>
  Math.max(0, stand.wave - stand.startWave - (stand.over ? 1 : 0));

/** Relics for the Last Stand: 1 per wave held at the wall, plus 2 per boss stopped. */
export const standRelics = (stand: Stand) => standWavesHeld(stand) + 2 * stand.bosses;

// ---------- Simulation ----------

export function stepStand(stand: Stand, dt: number): void {
  if (stand.over) return;
  stand.time += dt;
  waves(stand, dt);
  moveEnemies(stand, dt);
  if (stand.over) return;
  fire(stand, dt);
  moveShots(stand, dt);
}

function waves(stand: Stand, dt: number) {
  if (stand.queue.length) {
    stand.spawnTimer -= dt;
    if (stand.spawnTimer > 0) return;
    stand.spawnTimer = stand.gap;
    spawn(stand, stand.queue.shift()!);
    if (!stand.queue.length) stand.nextWaveIn = STAND.breather;
    return;
  }
  stand.nextWaveIn -= dt;
  if (stand.nextWaveIn > 0) return;
  stand.wave++;
  const wave = buildWave(stand.wave, stand.rng);
  stand.queue = wave.spawns;
  stand.gap = wave.gap;
  stand.spawnTimer = 0;
  stand.events.push({
    type: 'waveStart',
    wave: stand.wave,
    boss: wave.spawns.some((s) => s.boss),
  });
}

function spawn(stand: Stand, sp: Spawn) {
  const def = enemyDef(sp.id);
  const hp = Math.round(def.hp * hpScale(stand.wave) * (sp.boss ? GAME.boss.hp : 1));
  stand.enemies.push({
    id: stand.nextId++,
    type: sp.id,
    boss: sp.boss,
    tier: def.tier,
    hp,
    maxHp: hp,
    speed: def.speed * STAND.enemySpeed * (sp.boss ? 0.8 : 1),
    x: STAND.spawnX + stand.rng.next() * 0.5,
    z: sp.boss ? STAND.depth / 2 : 0.3 + stand.rng.next() * (STAND.depth - 0.6),
    hitTimer: 0,
  });
}

function moveEnemies(stand: Stand, dt: number) {
  for (const e of stand.enemies) {
    const stop = wallStop(e);
    if (e.x > stop) {
      e.x = Math.max(stop, e.x - e.speed * dt);
      continue;
    }
    // At the wall: hit it every so often.
    e.hitTimer -= dt;
    if (e.hitTimer > 0) continue;
    e.hitTimer = STAND.attackEvery;
    const dmg = e.boss
      ? STAND.wallDamage.boss
      : enemyDef(e.type).heavy
        ? STAND.wallDamage.heavy
        : STAND.wallDamage.normal;
    stand.wallHp = Math.max(0, stand.wallHp - dmg);
    stand.events.push({ type: 'wallHit', z: e.z, dmg });
  }
  if (stand.wallHp <= 0) {
    stand.over = true;
    stand.queue = [];
    stand.events.push({ type: 'fallen' });
  }
}

function fire(stand: Stand, dt: number) {
  for (const u of stand.defenders) {
    u.cooldown -= dt;
    if (u.cooldown > 0) continue;
    const def = unitDef(u.type);
    const stats = defenderStats(stand, u.type);
    const reach = STAND.wall.front + stats.range;
    // Aim at whoever is closest to the wall.
    let target: Attacker | undefined;
    for (const e of stand.enemies) {
      if (e.hp > 0 && e.x <= reach && (!target || e.x < target.x)) target = e;
    }
    if (!target) {
      u.cooldown = 0;
      continue;
    }
    u.cooldown = 1 / stats.rate;
    const from = seatPos(u.seat);
    stand.shots.push({
      ...from,
      targetId: target.id,
      tx: target.x,
      ty: enemyY(target),
      tz: target.z,
      dmg: stats.dmg,
      splash: def.splash ?? 0,
      speed: def.shot.speed,
      unit: u.type,
    });
  }
}

function moveShots(stand: Stand, dt: number) {
  const remaining: StandShot[] = [];
  for (const s of stand.shots) {
    const target = stand.enemies.find((e) => e.id === s.targetId);
    if (target) {
      s.tx = target.x;
      s.ty = enemyY(target);
      s.tz = target.z;
    }
    const dx = s.tx - s.x;
    const dy = s.ty - s.y;
    const dz = s.tz - s.z;
    const dist = Math.hypot(dx, dy, dz);
    const move = s.speed * dt;
    if (dist <= move || dist < 0.05) {
      if (s.splash > 0) {
        for (const e of stand.enemies)
          if (Math.hypot(e.x - s.tx, e.z - s.tz) <= s.splash) hurt(stand, e, s.dmg);
        stand.events.push({ type: 'splash', x: s.tx, y: s.ty, z: s.tz, radius: s.splash });
      } else if (target) hurt(stand, target, s.dmg);
      continue;
    }
    s.x += (dx / dist) * move;
    s.y += (dy / dist) * move;
    s.z += (dz / dist) * move;
    remaining.push(s);
  }
  stand.shots = remaining;
  stand.enemies = stand.enemies.filter((e) => e.hp > 0);
}

function hurt(stand: Stand, e: Attacker, dmg: number) {
  if (e.hp <= 0) return;
  e.hp -= dmg;
  if (e.hp > 0) return;
  const chest = GAME.warChest.perKill(e.tier) + (e.boss ? GAME.warChest.perBoss(e.tier) : 0);
  stand.chest += chest;
  stand.kills++;
  if (e.boss) stand.bosses++;
  stand.events.push({ type: 'kill', x: e.x, y: enemyY(e), z: e.z, chest, boss: e.boss });
}
