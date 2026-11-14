// Phase 1 (Outer Defense) rules. Pure logic: no DOM or canvas in here, so it can be tested
// and played by bots (see scripts/balance.ts).
import { ERAS } from './data/eras';
import { enemyDef, type EnemyId } from './data/enemies';
import { GAME } from './data/game';
import { MAPS } from './data/maps';
import { NO_MODS, coinsFor, type Mods, type RunOptions } from './web';
import { towerDef, upgradeCost, sellValue, type TowerId } from './data/towers';
import { buildWave, hpScale, rankFor, WAVES, type Spawn } from './data/waves';
import { distToTrail, posAt, prepareMap, type Point, type PreparedMap } from './path';
import { createRng, type Rng } from './rng';

export interface Tower {
  id: number;
  type: TowerId;
  x: number;
  y: number;
  level: number; // 0, 1 or 2
  spent: number;
  cooldown: number;
  targeting: Targeting;
}

/** Which enemy in range a tower aims at: furthest along the trail, toughest, or nearest. */
export type Targeting = 'first' | 'strong' | 'close';
export const TARGETING: Targeting[] = ['first', 'strong', 'close'];

export interface Enemy {
  id: number;
  type: EnemyId;
  boss: boolean;
  tier: number;
  rank: number; // how leveled-up it looks (see rankFor)
  hp: number;
  maxHp: number;
  speed: number;
  d: number; // tiles walked along the path
  x: number;
  y: number;
  netUntil: number; // caught in a net until this time (run.time)
  netSlow: number; // speed × while caught
}

export interface Shot {
  x: number;
  y: number;
  targetId: number;
  tx: number;
  ty: number;
  dmg: number;
  splash: number;
  speed: number;
  tower: TowerId;
  hold: number; // nets: seconds a monster stays caught (0 = not a net)
  toughSlow: number;
}

/** Things that happened this step, for the screen to show (popups, beams, shakes). */
export type SimEvent =
  | { type: 'kill'; x: number; y: number; gold: number; chest: number; boss: boolean }
  | { type: 'leak'; x: number; y: number }
  | { type: 'beam'; tower: TowerId; points: Point[] }
  | { type: 'splash'; x: number; y: number; radius: number; net?: boolean }
  | { type: 'waveStart'; wave: number; boss: boolean; bonus: number }
  | { type: 'breach' };

export interface Run {
  map: PreparedMap;
  rng: Rng;
  era: number;
  gold: number;
  chest: number;
  wave: number;
  firstWave: number; // the wave this run started after (later eras skip the easy waves)
  started: boolean; // has the first wave been called?
  nextWaveIn: number; // countdown (seconds) to the next wave, once the current one has spawned
  queue: Spawn[];
  gap: number;
  spawnTimer: number;
  enemies: Enemy[];
  towers: Tower[];
  shots: Shot[];
  damageBonus: number; // multiplies all tower damage (Camp upgrades)
  /** Towers you can build this run (from the upgrade web), or null for every one up to your era. */
  allowed: TowerId[] | null;
  /** Per-tower boosts from the upgrade web. */
  towerMods: Partial<Record<TowerId, Mods>>;
  coinBonus: number; // + share of coins (Lucky Find)
  kills: number;
  bosses: number;
  time: number;
  breached: boolean;
  nextId: number;
  events: SimEvent[];
}

const DEFAULT_OPTIONS: RunOptions = {
  era: 0,
  bonusGold: 0,
  bonusDamage: 0,
  wallBonus: 0,
  coinBonus: 0,
};

export function createRun(
  seed = Date.now(),
  options: Partial<RunOptions> = {},
  mapId = 'meadow',
): Run {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const era = ERAS[opts.era]!;
  // Later eras skip ahead so the first waves aren't a snooze: start one enemy tier below your era.
  const firstWave = Math.max(0, opts.era - 1) * WAVES.tierEvery;
  return {
    map: prepareMap(MAPS[mapId]!),
    rng: createRng(seed),
    era: opts.era,
    gold: era.startGold + opts.bonusGold,
    chest: 0,
    wave: firstWave,
    firstWave,
    started: false,
    nextWaveIn: 0,
    queue: [],
    gap: 1,
    spawnTimer: 0,
    enemies: [],
    towers: [],
    shots: [],
    damageBonus: 1 + opts.bonusDamage,
    allowed: opts.towers ?? null,
    towerMods: opts.towerMods ?? {},
    coinBonus: opts.coinBonus,
    kills: 0,
    bosses: 0,
    time: 0,
    breached: false,
    nextId: 1,
    events: [],
  };
}

// ---------- Player actions ----------

/** The tower whose footprint covers (x, y), if any. `slop` widens it for fat fingers. */
export function towerAt(run: Run, x: number, y: number, slop = 0): Tower | undefined {
  let best: Tower | undefined;
  let bestDist = GAME.towerRadius + slop;
  for (const t of run.towers) {
    const d = Math.hypot(t.x - x, t.y - y);
    if (d <= bestDist) {
      best = t;
      bestDist = d;
    }
  }
  return best;
}

/** Can a tower stand at (x, y)? Not on the trail, a decoration, the base or another tower. */
export function isBuildable(run: Run, x: number, y: number): boolean {
  const { map } = run;
  const r = GAME.towerRadius;
  if (x < r || y < r || x > map.width - r || y > map.height - r) return false;
  if (distToTrail(map, x, y) < map.pathWidth / 2 + r * 0.75) return false;
  if (Math.hypot(x - map.base.x, y - map.base.y) < 0.9 + r) return false;
  if (map.decor.some((p) => Math.hypot(p.x - x, p.y - y) < 0.35 + r)) return false;
  return !run.towers.some((t) => Math.hypot(t.x - x, t.y - y) < r * 2);
}

export const isUnlocked = (run: Run, type: TowerId) =>
  run.allowed ? run.allowed.includes(type) : towerDef(type).era <= run.era;

/** A tower's stats at a level (0-based), with its upgrade-web boosts and Strong Arms. */
export function towerStats(run: Run, type: TowerId, level: number) {
  const base = towerDef(type).levels[level]!;
  const m = run.towerMods[type] ?? NO_MODS;
  const def = towerDef(type);
  return {
    dmg: base.dmg * m.dmg * run.damageBonus,
    range: base.range * m.range,
    rate: base.rate * m.rate,
    splash: (def.splash ?? 0) * m.splash * (def.net ? m.net : 1),
    /** Nets: how long a net holds, in seconds. */
    hold: def.net ? def.net.hold * (1 + 0.25 * level) + m.hold : 0,
    /** Nets: speed × for heavy monsters and bosses while caught. */
    toughSlow: def.net ? (m.grip ? 0.25 : def.net.toughSlow) : 1,
  };
}

/** The level (0-based) a new tower starts at: Mastery skips the first one. */
export const startLevel = (run: Run, type: TowerId) => (run.towerMods[type]?.mastery ? 1 : 0);

export function canBuild(run: Run, type: TowerId, x: number, y: number): boolean {
  return (
    !run.breached &&
    isUnlocked(run, type) &&
    run.gold >= towerDef(type).cost &&
    isBuildable(run, x, y)
  );
}

export function build(run: Run, type: TowerId, x: number, y: number): Tower | null {
  if (!canBuild(run, type, x, y)) return null;
  const cost = towerDef(type).cost;
  run.gold -= cost;
  const tower: Tower = {
    id: run.nextId++,
    type,
    x,
    y,
    level: startLevel(run, type),
    spent: cost,
    cooldown: 0,
    targeting: 'first',
  };
  run.towers.push(tower);
  return tower;
}

export function nextUpgradeCost(tower: Tower): number | null {
  if (tower.level >= 2) return null;
  return upgradeCost(towerDef(tower.type), tower.level);
}

export function upgrade(run: Run, tower: Tower): boolean {
  const cost = nextUpgradeCost(tower);
  if (cost === null || run.gold < cost || run.breached) return false;
  run.gold -= cost;
  tower.spent += cost;
  tower.level++;
  return true;
}

export function sell(run: Run, tower: Tower): number {
  if (run.breached) return 0;
  const value = sellValue(tower.spent);
  run.gold += value;
  run.towers = run.towers.filter((t) => t !== tower);
  return value;
}

/** True while the current wave is still sending enemies. */
export const isSpawning = (run: Run) => run.queue.length > 0;

/** Gold you get for calling the next wave now instead of waiting for the countdown. */
export const earlyCallBonus = (run: Run) =>
  run.started ? Math.ceil(run.nextWaveIn) * GAME.earlyCallGold : 0;

/**
 * Starts the next wave. The player calls the first wave; after that waves come on their own
 * a few seconds after the previous one has finished spawning, or early when the player taps.
 */
export function startWave(run: Run): boolean {
  if (run.breached || isSpawning(run)) return false;
  const bonus = run.started ? WAVES.waveBonus(run.wave) + earlyCallBonus(run) : 0;
  run.gold += bonus;
  run.started = true;
  run.wave++;
  const wave = buildWave(run.wave, run.rng, run.era);
  run.queue = wave.spawns;
  run.gap = wave.gap;
  run.spawnTimer = 0;
  run.nextWaveIn = WAVES.breather;
  run.events.push({
    type: 'waveStart',
    wave: run.wave,
    boss: wave.spawns.some((sp) => sp.boss),
    bonus,
  });
  return true;
}

/** Waves the player held off this run. */
/** Coins for Phase 1: 1 per wave reached and 2 per boss stopped, scaled by the era. */
export const runCoins = (run: Run) => coinsFor(run.wave + 2 * run.bosses, run.era, run.coinBonus);

export const wavesHeld = (run: Run) =>
  Math.max(0, run.wave - run.firstWave - (run.breached ? 1 : 0));

// ---------- Simulation ----------

export function step(run: Run, dt: number): void {
  if (run.breached) return;
  run.time += dt;
  spawnEnemies(run, dt);
  moveEnemies(run, dt);
  if (run.breached) return;
  fireTowers(run, dt);
  moveShots(run, dt);
  if (run.started && !isSpawning(run)) {
    run.nextWaveIn -= dt;
    if (run.nextWaveIn <= 0) startWave(run);
  }
}

function spawnEnemies(run: Run, dt: number) {
  if (!run.queue.length) return;
  run.spawnTimer -= dt;
  if (run.spawnTimer > 0) return;
  run.spawnTimer = run.gap;
  const spawn = run.queue.shift()!;
  const def = enemyDef(spawn.id);
  const hp = Math.round(def.hp * hpScale(run.wave, run.era) * (spawn.boss ? GAME.boss.hp : 1));
  const start = posAt(run.map, 0);
  run.enemies.push({
    id: run.nextId++,
    type: spawn.id,
    boss: spawn.boss,
    tier: def.tier,
    rank: rankFor(run.wave, run.era),
    hp,
    maxHp: hp,
    speed: def.speed * GAME.enemySpeed * (spawn.boss ? 0.8 : 1),
    d: 0,
    netUntil: 0,
    netSlow: 1,
    x: start.x,
    y: start.y,
  });
}

function moveEnemies(run: Run, dt: number) {
  for (const e of run.enemies) {
    e.d += e.speed * (run.time < e.netUntil ? e.netSlow : 1) * dt;
    const p = posAt(run.map, e.d);
    e.x = p.x;
    e.y = p.y;
    if (e.d >= run.map.length && !run.breached) {
      // No wall HP in Phase 1: the first enemy that reaches the base ends it (Last Stand next).
      run.breached = true;
      run.queue = [];
      run.events.push({ type: 'leak', x: e.x, y: e.y });
      run.events.push({ type: 'breach' });
    }
  }
}

/** The enemy in range the tower wants most. Ties go to whoever is further along the trail. */
export function findTarget(
  run: Run,
  x: number,
  y: number,
  range: number,
  mode: Targeting = 'first',
  want: (e: Enemy) => boolean = () => true,
): Enemy | undefined {
  let best: Enemy | undefined;
  let bestScore = -Infinity;
  for (const e of run.enemies) {
    if (e.hp <= 0 || !want(e)) continue;
    const dist = Math.hypot(e.x - x, e.y - y);
    if (dist > range) continue;
    const main = mode === 'strong' ? e.hp : mode === 'close' ? -dist : e.d;
    const score = main * 1000 + e.d;
    if (score > bestScore) {
      bestScore = score;
      best = e;
    }
  }
  return best;
}

function fireTowers(run: Run, dt: number) {
  for (const t of run.towers) {
    t.cooldown -= dt;
    if (t.cooldown > 0) continue;
    const def = towerDef(t.type);
    const stats = towerStats(run, t.type, t.level);
    const { x, y } = t;
    const dmg = stats.dmg;
    // Nets skip monsters that are already caught, so a throw is never wasted.
    const target = def.net
      ? findTarget(run, x, y, stats.range, t.targeting, (e) => run.time >= e.netUntil - 0.3)
      : findTarget(run, x, y, stats.range, t.targeting);
    if (!target) {
      t.cooldown = 0;
      continue;
    }
    t.cooldown = 1 / stats.rate;
    if (def.kind === 'shot') {
      run.shots.push({
        x,
        y,
        targetId: target.id,
        tx: target.x,
        ty: target.y,
        dmg,
        splash: stats.splash,
        speed: def.shot?.speed ?? 8,
        tower: t.type,
        hold: stats.hold,
        toughSlow: stats.toughSlow,
      });
    } else if (def.kind === 'beam') {
      damage(run, target, dmg);
      run.events.push({
        type: 'beam',
        tower: t.type,
        points: [
          { x, y },
          { x: target.x, y: target.y },
        ],
      });
    } else {
      // Chain lightning: hop to the nearest enemy that hasn't been zapped yet.
      const points: Point[] = [{ x, y }];
      const hit = new Set<Enemy>();
      let cur: Enemy | undefined = target;
      for (let i = 0; i < (def.chain ?? 3) && cur; i++) {
        hit.add(cur);
        points.push({ x: cur.x, y: cur.y });
        damage(run, cur, dmg * Math.pow(0.8, i));
        const from: Enemy = cur;
        cur = undefined;
        let bestDist = 1.6;
        for (const e of run.enemies) {
          if (hit.has(e) || e.hp <= 0) continue;
          const dist = Math.hypot(e.x - from.x, e.y - from.y);
          if (dist < bestDist) {
            bestDist = dist;
            cur = e;
          }
        }
      }
      run.events.push({ type: 'beam', tower: t.type, points });
    }
  }
  run.enemies = run.enemies.filter((e) => e.hp > 0);
}

function moveShots(run: Run, dt: number) {
  const remaining: Shot[] = [];
  for (const s of run.shots) {
    const target = run.enemies.find((e) => e.id === s.targetId);
    if (target) {
      s.tx = target.x;
      s.ty = target.y;
    }
    const dx = s.tx - s.x;
    const dy = s.ty - s.y;
    const dist = Math.hypot(dx, dy);
    const move = s.speed * dt;
    if (dist <= move || dist < 0.05) {
      if (s.splash > 0) {
        for (const e of run.enemies) {
          if (Math.hypot(e.x - s.tx, e.y - s.ty) > s.splash) continue;
          damage(run, e, s.dmg);
          if (s.hold > 0) {
            e.netSlow = e.boss || enemyDef(e.type).heavy ? s.toughSlow : 0;
            e.netUntil = run.time + s.hold;
          }
        }
        run.events.push({
          type: 'splash',
          x: s.tx,
          y: s.ty,
          radius: s.splash,
          net: s.hold > 0,
        });
      } else if (target) {
        damage(run, target, s.dmg);
      }
      continue;
    }
    s.x += (dx / dist) * move;
    s.y += (dy / dist) * move;
    remaining.push(s);
  }
  run.shots = remaining;
  run.enemies = run.enemies.filter((e) => e.hp > 0);
}

function damage(run: Run, e: Enemy, dmg: number) {
  if (e.hp <= 0) return;
  e.hp -= dmg;
  if (e.hp > 0) return;
  const def = enemyDef(e.type);
  const gold = def.gold * (e.boss ? GAME.boss.gold : 1);
  const chest = GAME.warChest.perKill(e.tier) + (e.boss ? GAME.warChest.perBoss(e.tier) : 0);
  run.gold += gold;
  run.chest += chest;
  run.kills++;
  if (e.boss) run.bosses++;
  run.events.push({ type: 'kill', x: e.x, y: e.y, gold, chest, boss: e.boss });
}
