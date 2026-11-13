// Phase 1 (Outer Defense) rules. Pure logic: no DOM or canvas in here, so it can be tested
// and played by bots (see scripts/balance.ts).
import { ERAS } from './data/eras';
import { enemyDef, type EnemyId } from './data/enemies';
import { GAME } from './data/game';
import { MAPS } from './data/maps';
import { towerDef, upgradeCost, sellValue, type TowerId } from './data/towers';
import { buildWave, hpScale, tierFor, WAVES, type Spawn } from './data/waves';
import { cellKey, posAt, prepareMap, type Point, type PreparedMap } from './path';
import { createRng, type Rng } from './rng';

export interface Tower {
  id: number;
  type: TowerId;
  col: number;
  row: number;
  level: number; // 0, 1 or 2
  spent: number;
  cooldown: number;
}

export interface Enemy {
  id: number;
  type: EnemyId;
  boss: boolean;
  tier: number;
  hp: number;
  maxHp: number;
  speed: number;
  d: number; // tiles walked along the path
  x: number;
  y: number;
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
}

/** Things that happened this step, for the screen to show (popups, beams, shakes). */
export type SimEvent =
  | { type: 'kill'; x: number; y: number; gold: number; chest: number; boss: boolean }
  | { type: 'leak'; x: number; y: number; dmg: number }
  | { type: 'beam'; tower: TowerId; points: Point[] }
  | { type: 'splash'; x: number; y: number; radius: number }
  | { type: 'waveCleared'; wave: number; bonus: number }
  | { type: 'breach' };

export interface Run {
  map: PreparedMap;
  rng: Rng;
  era: number;
  gold: number;
  chest: number;
  wave: number;
  waveActive: boolean;
  queue: Spawn[];
  gap: number;
  spawnTimer: number;
  enemies: Enemy[];
  towers: Tower[];
  shots: Shot[];
  wallHp: number;
  wallMax: number;
  kills: number;
  bosses: number;
  time: number;
  breached: boolean;
  nextId: number;
  events: SimEvent[];
}

export function createRun(seed = Date.now(), mapId = 'meadow'): Run {
  const era = ERAS[0]!;
  return {
    map: prepareMap(MAPS[mapId]!),
    rng: createRng(seed),
    era: 0,
    gold: GAME.startGold,
    chest: 0,
    wave: 0,
    waveActive: false,
    queue: [],
    gap: 1,
    spawnTimer: 0,
    enemies: [],
    towers: [],
    shots: [],
    wallHp: era.wallHp,
    wallMax: era.wallHp,
    kills: 0,
    bosses: 0,
    time: 0,
    breached: false,
    nextId: 1,
    events: [],
  };
}

// ---------- Player actions ----------

export function towerAt(run: Run, col: number, row: number): Tower | undefined {
  return run.towers.find((t) => t.col === col && t.row === row);
}

export function isBuildable(run: Run, col: number, row: number): boolean {
  const { map } = run;
  if (col < 0 || row < 0 || col >= map.cols || row >= map.rows) return false;
  const key = cellKey(col, row);
  return !map.pathCells.has(key) && !map.decorCells.has(key) && !towerAt(run, col, row);
}

export const isUnlocked = (run: Run, type: TowerId) => towerDef(type).era <= run.era;

export function canBuild(run: Run, type: TowerId, col: number, row: number): boolean {
  return (
    !run.breached &&
    isUnlocked(run, type) &&
    run.gold >= towerDef(type).cost &&
    isBuildable(run, col, row)
  );
}

export function build(run: Run, type: TowerId, col: number, row: number): Tower | null {
  if (!canBuild(run, type, col, row)) return null;
  const cost = towerDef(type).cost;
  run.gold -= cost;
  const tower: Tower = { id: run.nextId++, type, col, row, level: 0, spent: cost, cooldown: 0 };
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

export function evolveCost(run: Run): number | null {
  const next = ERAS[run.era + 1];
  return next ? next.evolveCost : null;
}

/** Evolve to the next era: unlocks towers, fully repairs the wall and raises its max HP. */
export function evolve(run: Run): boolean {
  const cost = evolveCost(run);
  if (cost === null || run.gold < cost || run.breached) return false;
  run.gold -= cost;
  run.era++;
  run.wallMax = ERAS[run.era]!.wallHp;
  run.wallHp = run.wallMax;
  return true;
}

export function startWave(run: Run): boolean {
  if (run.waveActive || run.breached) return false;
  run.wave++;
  const wave = buildWave(run.wave, run.rng);
  run.queue = wave.spawns;
  run.gap = wave.gap;
  run.spawnTimer = 0;
  run.waveActive = true;
  return true;
}

// ---------- Simulation ----------

export function step(run: Run, dt: number): void {
  if (run.breached) return;
  run.time += dt;
  spawnEnemies(run, dt);
  moveEnemies(run, dt);
  if (run.breached) return;
  fireTowers(run, dt);
  moveShots(run, dt);
  checkWaveEnd(run);
}

function spawnEnemies(run: Run, dt: number) {
  if (!run.queue.length) return;
  run.spawnTimer -= dt;
  if (run.spawnTimer > 0) return;
  run.spawnTimer = run.gap;
  const spawn = run.queue.shift()!;
  const def = enemyDef(spawn.id);
  const hp = Math.round(def.hp * hpScale(run.wave) * (spawn.boss ? GAME.boss.hp : 1));
  const start = posAt(run.map, 0);
  run.enemies.push({
    id: run.nextId++,
    type: spawn.id,
    boss: spawn.boss,
    tier: def.tier,
    hp,
    maxHp: hp,
    speed: def.speed * (spawn.boss ? 0.8 : 1),
    d: 0,
    x: start.x,
    y: start.y,
  });
}

function moveEnemies(run: Run, dt: number) {
  for (const e of run.enemies) {
    e.d += e.speed * dt;
    const p = posAt(run.map, e.d);
    e.x = p.x;
    e.y = p.y;
    if (e.d >= run.map.length) {
      const dmg = e.boss
        ? GAME.wallDamage.boss
        : enemyDef(e.type).heavy
          ? GAME.wallDamage.heavy
          : GAME.wallDamage.normal;
      run.wallHp = Math.max(0, run.wallHp - dmg);
      e.hp = 0;
      run.events.push({ type: 'leak', x: e.x, y: e.y, dmg });
    }
  }
  run.enemies = run.enemies.filter((e) => e.hp > 0);
  if (run.wallHp <= 0) {
    run.breached = true;
    run.waveActive = false;
    run.events.push({ type: 'breach' });
  }
}

/** The enemy in range that is furthest along the path. */
function findTarget(run: Run, x: number, y: number, range: number): Enemy | undefined {
  let best: Enemy | undefined;
  for (const e of run.enemies) {
    if (e.hp <= 0) continue;
    if (Math.hypot(e.x - x, e.y - y) > range) continue;
    if (!best || e.d > best.d) best = e;
  }
  return best;
}

function fireTowers(run: Run, dt: number) {
  for (const t of run.towers) {
    t.cooldown -= dt;
    if (t.cooldown > 0) continue;
    const def = towerDef(t.type);
    const stats = def.levels[t.level]!;
    const x = t.col + 0.5;
    const y = t.row + 0.5;
    const target = findTarget(run, x, y, stats.range);
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
        dmg: stats.dmg,
        splash: def.splash ?? 0,
        speed: def.shot?.speed ?? 8,
        tower: t.type,
      });
    } else if (def.kind === 'beam') {
      damage(run, target, stats.dmg);
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
        damage(run, cur, stats.dmg * Math.pow(0.8, i));
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
          if (Math.hypot(e.x - s.tx, e.y - s.ty) <= s.splash) damage(run, e, s.dmg);
        }
        run.events.push({ type: 'splash', x: s.tx, y: s.ty, radius: s.splash });
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

function checkWaveEnd(run: Run) {
  if (!run.waveActive || run.queue.length || run.enemies.length) return;
  run.waveActive = false;
  const bonus = WAVES.clearBonus(run.wave);
  run.gold += bonus;
  run.events.push({ type: 'waveCleared', wave: run.wave, bonus });
}

/** The enemy tier the next wave will bring, so the UI can warn "Evolve soon!". */
export const nextWaveTier = (run: Run) => tierFor(run.wave + 1);
