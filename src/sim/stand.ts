// Last Stand (Phase 2) rules. Pure logic, like run.ts: the scene draws it, bots can play it.
// Phase 1 ends when the first enemy gets through. Then you defend the wall with defenders bought
// from the War Chest, until the wall falls. Waves keep counting up from where Phase 1 stopped.
import { ERAS } from './data/eras';
import { enemyDef, type EnemyId } from './data/enemies';
import { GAME } from './data/game';
import { STAND } from './data/stand';
import { unitDef, unitUpgradeCost, type UnitId } from './data/units';
import { buildWave, hpScale, type Spawn } from './data/waves';
import { sellValue } from './data/towers';
import { createRng, type Rng } from './rng';

export interface Defender {
  id: number;
  type: UnitId;
  slot: number;
  level: number;
  spent: number;
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
  hitTimer: number;
}

export interface StandShot {
  x: number;
  y: number;
  targetId: number;
  tx: number;
  ty: number;
  dmg: number;
  splash: number;
  speed: number;
  unit: UnitId;
}

export type StandEvent =
  | { type: 'kill'; x: number; y: number; chest: number; boss: boolean }
  | { type: 'wallHit'; x: number; dmg: number }
  | { type: 'splash'; x: number; y: number; radius: number }
  | { type: 'waveStart'; wave: number; boss: boolean }
  | { type: 'fallen' };

export interface Stand {
  rng: Rng;
  era: number;
  chest: number; // War Chest ⚔️ to spend on defenders
  wave: number;
  startWave: number; // the Phase 1 wave the Last Stand started in
  wallHp: number;
  wallMax: number;
  slots: (Defender | null)[];
  enemies: Attacker[];
  shots: StandShot[];
  queue: Spawn[];
  gap: number;
  spawnTimer: number;
  nextWaveIn: number;
  damageBonus: number;
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
  return {
    rng: createRng(seed),
    era: opts.era,
    chest: Math.max(opts.chest, STAND.minChest),
    wave: Math.max(0, opts.wave - 1), // the wave that broke through comes again at the wall
    startWave: Math.max(0, opts.wave - 1),
    wallHp: wall,
    wallMax: wall,
    slots: STAND.slots.map(() => null),
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

// ---------- Player actions ----------

export const isUnitUnlocked = (stand: Stand, type: UnitId) => unitDef(type).era <= stand.era;

export function firstFreeSlot(stand: Stand): number {
  return stand.slots.findIndex((s) => s === null);
}

export function hire(stand: Stand, type: UnitId, slot = firstFreeSlot(stand)): Defender | null {
  const def = unitDef(type);
  if (stand.over || !isUnitUnlocked(stand, type) || stand.chest < def.cost) return null;
  if (slot < 0 || slot >= stand.slots.length || stand.slots[slot]) return null;
  stand.chest -= def.cost;
  const unit: Defender = {
    id: stand.nextId++,
    type,
    slot,
    level: 0,
    spent: def.cost,
    cooldown: 0,
  };
  stand.slots[slot] = unit;
  return unit;
}

export function nextUnitCost(unit: Defender): number | null {
  return unit.level >= 2 ? null : unitUpgradeCost(unitDef(unit.type), unit.level);
}

export function promote(stand: Stand, unit: Defender): boolean {
  const cost = nextUnitCost(unit);
  if (cost === null || stand.chest < cost || stand.over) return false;
  stand.chest -= cost;
  unit.spent += cost;
  unit.level++;
  return true;
}

export function dismiss(stand: Stand, unit: Defender): number {
  if (stand.over) return 0;
  const value = sellValue(unit.spent);
  stand.chest += value;
  stand.slots[unit.slot] = null;
  return value;
}

/** Waves fully held at the wall. */
export const standWavesHeld = (stand: Stand) =>
  Math.max(0, stand.wave - stand.startWave - (stand.over ? 1 : 0));

/** Relics for the Last Stand: 1 per wave held at the wall, plus 2 per boss stopped. */
export const standRelics = (stand: Stand) => standWavesHeld(stand) + 2 * stand.bosses;

/** Where a defender stands, and where an enemy is drawn (its middle). */
export const unitPos = (slot: number) => ({ x: STAND.unitX, y: STAND.slots[slot]! - 0.35 });
export const enemyY = (e: Attacker) => STAND.groundY - 0.35 * (e.boss ? GAME.boss.size : 1);

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
    x: STAND.spawnX + stand.rng.next() * 0.3,
    hitTimer: 0,
  });
}

function moveEnemies(stand: Stand, dt: number) {
  for (const e of stand.enemies) {
    const front = STAND.wallX + 0.3 * (e.boss ? GAME.boss.size : 1);
    if (e.x > front) {
      e.x = Math.max(front, e.x - e.speed * dt);
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
    stand.events.push({ type: 'wallHit', x: e.x, dmg });
  }
  if (stand.wallHp <= 0) {
    stand.over = true;
    stand.queue = [];
    stand.events.push({ type: 'fallen' });
  }
}

function fire(stand: Stand, dt: number) {
  for (const u of stand.slots) {
    if (!u) continue;
    u.cooldown -= dt;
    if (u.cooldown > 0) continue;
    const def = unitDef(u.type);
    const stats = def.levels[u.level]!;
    const reach = STAND.wallX + stats.range;
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
    const from = unitPos(u.slot);
    stand.shots.push({
      x: from.x,
      y: from.y,
      targetId: target.id,
      tx: target.x,
      ty: enemyY(target),
      dmg: stats.dmg * stand.damageBonus,
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
    }
    const dx = s.tx - s.x;
    const dy = s.ty - s.y;
    const dist = Math.hypot(dx, dy);
    const move = s.speed * dt;
    if (dist <= move || dist < 0.05) {
      if (s.splash > 0) {
        for (const e of stand.enemies) if (Math.abs(e.x - s.tx) <= s.splash) hurt(stand, e, s.dmg);
        stand.events.push({ type: 'splash', x: s.tx, y: s.ty, radius: s.splash });
      } else if (target) hurt(stand, target, s.dmg);
      continue;
    }
    s.x += (dx / dist) * move;
    s.y += (dy / dist) * move;
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
  stand.events.push({ type: 'kill', x: e.x, y: enemyY(e), chest, boss: e.boss });
}
