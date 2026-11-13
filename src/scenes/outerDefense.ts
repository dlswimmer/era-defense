// Phase 1: Outer Defense. Draws the run and turns taps into sim actions (src/sim/run.ts).
import type { Game, RunSummary, Scene } from '../game';
import { emoji, fitCanvas, hpBar, drawMap, text } from '../render';
import { saveMeta } from '../save';
import { ERAS } from '../sim/data/eras';
import { enemyDef } from '../sim/data/enemies';
import { GAME } from '../sim/data/game';
import { relicsEarned, runOptions } from '../sim/data/metaUpgrades';
import { TOWER_IDS, towerDef, sellValue, type TowerId } from '../sim/data/towers';
import { posAt, type Point } from '../sim/path';
import * as sim from '../sim/run';
import { openIdeaBox } from '../ui/ideas';
import { $, el, setDisabled, setText } from '../ui/dom';

interface Popup {
  x: number;
  y: number;
  text: string;
  color: string;
  t: number;
  size: number;
}
interface Flash {
  points: Point[];
  color: string;
  width: number;
  t: number;
}
interface Ring {
  x: number;
  y: number;
  r: number;
  t: number;
}

const BREACH_TIME = 2.6;
/** On touch screens the tower being placed floats this far (in tiles) above the finger. */
const TOUCH_LIFT = 1.1;
/** How close (in tiles of trail) an enemy gets to the base before the danger warning shows. */
const DANGER_TILES = 6;

/** A tower picked from the shop that is being dragged onto the map. */
interface Placing {
  type: TowerId;
  x: number;
  y: number;
  show: boolean; // is the ghost over the map?
  dragging: boolean; // is a finger or button held down?
}

export function createOuterDefenseScene(game: Game): Scene {
  let run: sim.Run;
  let tile = 32;
  let selected: sim.Tower | null = null;
  let placing: Placing | null = null;
  let speed = 1;
  let paused = false;
  let popups: Popup[] = [];
  let flashes: Flash[] = [];
  let rings: Ring[] = [];
  let shake = 0;
  let breachTimer = -1;
  let banner: { text: string; t: number } | null = null;
  // Little animations worked out from the sim state each frame (the sim doesn't need them).
  let clock = 0;
  const lastHp = new Map<number, number>();
  const hitFlash = new Map<number, number>(); // enemy id -> seconds of white flash left
  const lastCooldown = new Map<number, number>();
  const firePulse = new Map<number, number>(); // tower id -> seconds of "throw" bounce left

  // ---------- HUD ----------
  const hud = {
    gold: el('span', { class: 'hud-chip gold' }),
    chest: el('span', { class: 'hud-chip' }),
    wave: el('span', { class: 'hud-chip' }),
    era: el('span', { class: 'hud-chip era' }),
  };
  const buildHud = () => {
    $('hud').replaceChildren(
      el('div', { class: 'hud-row' }, hud.gold, hud.chest, hud.wave, hud.era, ctl.idea),
    );
  };
  const updateHud = () => {
    const era = ERAS[run.era]!;
    setText(hud.gold, `💰 ${run.gold}`);
    setText(hud.chest, `⚔️ ${run.chest}`);
    setText(hud.wave, `🌊 ${run.wave}`);
    setText(hud.era, `${era.base} ${era.name}`);
  };

  // ---------- Panel ----------
  const ctl = {
    wave: el('button', { class: 'btn go wave', onclick: () => onWaveButton() }),
    speed: el('button', { class: 'btn', onclick: () => cycleSpeed(), 'aria-label': 'Speed' }),
    pause: el('button', { class: 'btn', onclick: () => (paused = !paused), 'aria-label': 'Pause' }),
    idea: el(
      'button',
      { class: 'btn idea', onclick: () => onIdea(), 'aria-label': 'Idea Box' },
      '💡',
    ),
  };
  const context = el('div', { class: 'context' });
  /** Buttons in the context area that cost gold: re-checked every frame. */
  let costButtons: { btn: HTMLButtonElement; cost: () => number | null }[] = [];

  const buildPanel = () => {
    $('panel').replaceChildren(
      el('div', { class: 'controls' }, ctl.wave, ctl.speed, ctl.pause),
      context,
    );
  };

  const renderContext = () => {
    costButtons = [];
    if (selected) context.replaceChildren(towerInfo(selected));
    else context.replaceChildren(shop());
  };

  const shop = () => {
    const grid = el('div', { class: 'shop' });
    for (const id of TOWER_IDS) {
      const def = towerDef(id);
      // Only towers you can use in this era. Ones you can't afford yet show grayed out.
      if (!sim.isUnlocked(run, id)) continue;
      const btn = el(
        'button',
        {
          class: `btn${placing?.type === id ? ' picked' : ''}`,
          onpointerdown: (e: Event) => onPickTower(id, e),
        },
        el('span', { class: 'em' }, def.emoji),
        el('span', { class: 'nm' }, def.name),
        el('span', { class: 'cost' }, `💰${def.cost}`),
      );
      costButtons.push({ btn, cost: () => def.cost });
      grid.append(btn);
    }
    return grid;
  };

  const towerInfo = (tower: sim.Tower) => {
    const def = towerDef(tower.type);
    const stats = def.levels[tower.level]!;
    const next = def.levels[tower.level + 1];
    const upCost = sim.nextUpgradeCost(tower);
    const upBtn = el(
      'button',
      { class: 'btn primary', onclick: () => onUpgrade(tower) },
      upCost === null ? '⭐ Max' : `⬆️ 💰${upCost}`,
    );
    if (upCost === null) upBtn.disabled = true;
    else costButtons.push({ btn: upBtn, cost: () => sim.nextUpgradeCost(tower) });
    const statLine = (label: string, now: number, then?: number) =>
      `${label} ${fmt(now)}${then !== undefined && then !== now ? ` → ${fmt(then)}` : ''}`;
    const aim = el(
      'div',
      { class: 'aim' },
      ...sim.TARGETING.map((mode) =>
        el(
          'button',
          {
            class: `btn${tower.targeting === mode ? ' on' : ''}`,
            onclick: () => {
              tower.targeting = mode;
              renderContext();
            },
          },
          AIM_LABELS[mode],
        ),
      ),
    );
    return el(
      'div',
      { class: 'info' },
      el(
        'div',
        { class: 'txt' },
        el('b', {}, `${def.emoji} ${def.name} ${'⭐'.repeat(tower.level + 1)}`),
        el(
          'div',
          {},
          [
            statLine('💥', stats.dmg, next?.dmg),
            statLine('🎯', stats.range, next?.range),
            statLine('⏱️', stats.rate, next?.rate),
          ].join('  ·  '),
        ),
        def.by ? el('div', { class: 'credit' }, `Designed by ${def.by}`) : '',
        aim,
      ),
      el(
        'div',
        { class: 'info-actions' },
        upBtn,
        el(
          'button',
          { class: 'btn danger', onclick: () => onSell(tower) },
          `Sell 💰${sellValue(tower.spent)}`,
        ),
      ),
    );
  };

  const updatePanel = () => {
    if (!run.started) {
      setText(ctl.wave, '▶ Start');
      setDisabled(ctl.wave, false);
    } else if (sim.isSpawning(run) || run.breached) {
      setText(ctl.wave, `🌊 Wave ${run.wave}`);
      setDisabled(ctl.wave, true);
    } else {
      setText(ctl.wave, `⏩ Next +${sim.earlyCallBonus(run)}💰`);
      setDisabled(ctl.wave, false);
    }
    setText(ctl.speed, `${speed}×`);
    setText(ctl.pause, paused ? '▶️' : '⏸️');
    for (const { btn, cost } of costButtons) {
      const c = cost();
      setDisabled(btn, c === null || run.gold < c || run.breached);
    }
  };

  // ---------- Actions ----------
  const onWaveButton = () => {
    if (sim.startWave(run)) paused = false;
  };
  const cycleSpeed = () => {
    speed = speed >= 3 ? 1 : speed + 1;
  };
  const onIdea = () => {
    const wasPaused = paused;
    paused = true;
    openIdeaBox(game, () => (paused = wasPaused));
  };
  /** Pressing a shop button picks that tower up; press it again to put it back. */
  const onPickTower = (id: TowerId, e: Event) => {
    e.preventDefault();
    // Let the drag move over the map instead of sticking to this button (touch captures it).
    const pe = e as PointerEvent;
    const target = e.currentTarget as Element | null;
    if (target?.hasPointerCapture?.(pe.pointerId)) target.releasePointerCapture(pe.pointerId);
    if (run.breached) return;
    banner = null;
    if (placing?.type === id) placing = null;
    else if (run.gold >= towerDef(id).cost) {
      placing = { type: id, x: 0, y: 0, show: false, dragging: true };
      selected = null;
    }
    renderContext();
  };
  const cancelPlacing = () => {
    if (!placing) return;
    placing = null;
    renderContext();
  };
  /** Moves the ghost tower to a pointer position, lifting it above a finger so it stays visible. */
  const moveGhost = (px: number, py: number, pointerType: string) => {
    if (!placing) return;
    const w = run.map.width * tile;
    const h = run.map.height * tile;
    placing.show = px >= 0 && py >= 0 && px <= w && py <= h;
    placing.x = px / tile;
    placing.y = py / tile - (pointerType === 'mouse' ? 0 : TOUCH_LIFT);
  };
  const tryPlace = () => {
    if (!placing) return;
    const { type, x, y } = placing;
    if (sim.build(run, type, x, y)) {
      placing = null;
      renderContext();
    } else {
      addPopup(
        x,
        y - 0.5,
        run.gold < towerDef(type).cost ? 'Need 💰' : "Can't go there",
        '#ff8a8a',
      );
    }
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') cancelPlacing();
  };
  const onUpgrade = (tower: sim.Tower) => {
    if (sim.upgrade(run, tower)) renderContext();
  };
  const onSell = (tower: sim.Tower) => {
    const value = sim.sell(run, tower);
    addPopup(tower.x, tower.y, `+${value}💰`, '#ffd34d');
    selected = null;
    renderContext();
  };

  const select = (x: number, y: number, pointerType: string) => {
    const tower = sim.towerAt(run, x, y, pointerType === 'mouse' ? 0.05 : 0.3);
    selected = tower && tower !== selected ? tower : null;
    renderContext();
  };

  const towerRange = (t: sim.Tower) => towerDef(t.type).levels[t.level]!.range;
  const rangeCircle = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    range: number,
    ok: boolean,
  ) => {
    ctx.fillStyle = ok ? 'rgba(255,255,255,.16)' : 'rgba(255,60,60,.18)';
    ctx.strokeStyle = ok ? 'rgba(255,255,255,.75)' : 'rgba(255,80,80,.85)';
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 6]);
    ctx.beginPath();
    ctx.arc(x * tile, y * tile, range * tile, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.setLineDash([]);
  };

  /** Spots hits and shots by comparing with last frame, and runs down the animation timers. */
  const animate = (fx: number) => {
    clock += fx * speed;
    for (const [id, t] of hitFlash)
      if (t - fx <= 0) hitFlash.delete(id);
      else hitFlash.set(id, t - fx);
    for (const [id, t] of firePulse)
      if (t - fx <= 0) firePulse.delete(id);
      else firePulse.set(id, t - fx);
    const alive = new Set<number>();
    for (const e of run.enemies) {
      alive.add(e.id);
      const before = lastHp.get(e.id);
      if (before !== undefined && e.hp < before) hitFlash.set(e.id, 0.1);
      lastHp.set(e.id, e.hp);
    }
    for (const id of lastHp.keys()) if (!alive.has(id)) lastHp.delete(id);
    for (const t of run.towers) {
      if (t.cooldown > (lastCooldown.get(t.id) ?? 0) + 0.01) firePulse.set(t.id, 0.16);
      lastCooldown.set(t.id, t.cooldown);
    }
  };

  /** Chevrons at the trail entrance between waves: "they come from here". */
  const drawEntrance = (ctx: CanvasRenderingContext2D) => {
    for (let i = 0; i < 3; i++) {
      const d = 1.6 + i * 0.7;
      const p = posAt(run.map, d);
      const q = posAt(run.map, d + 0.3);
      const a = Math.atan2(q.y - p.y, q.x - p.x);
      const wave = (Math.sin(clock * 5 - i * 1.2) + 1) / 2;
      ctx.save();
      ctx.translate(p.x * tile, p.y * tile);
      ctx.rotate(a);
      ctx.globalAlpha = 0.35 + wave * 0.65;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(-tile * 0.16, -tile * 0.26);
      ctx.lineTo(tile * 0.14, 0);
      ctx.lineTo(-tile * 0.16, tile * 0.26);
      ctx.strokeStyle = 'rgba(0,0,0,.45)';
      ctx.lineWidth = tile * 0.16;
      ctx.stroke();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = tile * 0.09;
      ctx.stroke();
      ctx.restore();
    }
  };

  /** A red pulse around the base and the screen edges when an enemy is close to getting through. */
  const drawDanger = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    let furthest = 0;
    for (const e of run.enemies) furthest = Math.max(furthest, e.d);
    const left = run.map.length - furthest;
    if (!run.enemies.length || left > DANGER_TILES) return;
    const level = 1 - left / DANGER_TILES;
    const pulse = 0.6 + 0.4 * Math.sin(clock * 12);
    const { base } = run.map;
    ctx.strokeStyle = `rgba(255,60,60,${level * pulse})`;
    ctx.lineWidth = tile * 0.12;
    ctx.beginPath();
    ctx.arc(base.x * tile, base.y * tile, tile * (0.8 + 0.12 * pulse), 0, Math.PI * 2);
    ctx.stroke();
    const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.45, w / 2, h / 2, h * 0.75);
    g.addColorStop(0, 'rgba(255,40,40,0)');
    g.addColorStop(1, `rgba(255,40,40,${0.35 * level * pulse})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  };

  // ---------- Effects ----------
  const addPopup = (x: number, y: number, s: string, color: string, size = 0.32) =>
    popups.push({ x, y, text: s, color, t: 0, size });
  const showBanner = (s: string) => (banner = { text: s, t: 0 });

  const handleEvents = () => {
    for (const ev of run.events) {
      switch (ev.type) {
        case 'kill':
          addPopup(ev.x, ev.y - 0.2, `+${ev.gold}`, '#ffd34d', ev.boss ? 0.5 : 0.28);
          if (ev.boss) {
            addPopup(ev.x, ev.y - 0.7, `+${ev.chest}⚔️`, '#ffffff', 0.45);
            shake = Math.max(shake, 0.3);
          }
          break;
        case 'leak':
          addPopup(ev.x, ev.y - 0.6, '😱', '#ff5d5d', 0.6);
          shake = Math.max(shake, 0.25);
          break;
        case 'beam': {
          const b = towerDef(ev.tower).beam;
          flashes.push({
            points: ev.points,
            color: b?.color ?? '#fff',
            width: b?.width ?? 2,
            t: 0,
          });
          break;
        }
        case 'splash':
          rings.push({ x: ev.x, y: ev.y, r: ev.radius, t: 0 });
          break;
        case 'waveStart':
          showBanner(
            `${ev.boss ? `👑 Boss wave ${ev.wave}!` : `Wave ${ev.wave}`}${ev.bonus ? `  +${ev.bonus}💰` : ''}`,
          );
          break;
        case 'breach':
          breachTimer = 0;
          shake = 1;
          selected = null;
          placing = null;
          renderContext();
          break;
      }
    }
    run.events.length = 0;
  };

  const finishRun = () => {
    const { meta } = game;
    const newBest = run.wave > meta.best.wave;
    if (newBest) meta.best = { wave: run.wave, era: run.era, chest: run.chest };
    const relics = relicsEarned(run);
    meta.relics += relics;
    meta.runs++;
    saveMeta(meta);
    const summary: RunSummary = {
      wave: run.wave,
      era: run.era,
      chest: run.chest,
      kills: run.kills,
      bosses: run.bosses,
      held: sim.wavesHeld(run),
      time: run.time,
      relics,
      newBest,
    };
    game.go('breach', summary);
  };

  const onVisibility = () => {
    if (document.hidden) paused = true;
  };

  // ---------- Scene ----------
  return {
    enter() {
      run = sim.createRun(Date.now(), runOptions(game.meta.upgrades));
      // Add ?dev to the URL for lots of gold (handy for testing new towers).
      if (new URLSearchParams(location.search).has('dev')) run.gold = 99_999;
      selected = null;
      placing = null;
      speed = 1;
      paused = false;
      popups = [];
      flashes = [];
      rings = [];
      shake = 0;
      breachTimer = -1;
      clock = 0;
      lastHp.clear();
      hitFlash.clear();
      lastCooldown.clear();
      firePulse.clear();
      banner = { text: 'Drag a tower onto the grass', t: -1.5 };
      buildHud();
      buildPanel();
      $('hud').hidden = false;
      $('panel').hidden = false;
      renderContext();
      this.onResize!();
      document.addEventListener('visibilitychange', onVisibility);
      window.addEventListener('keydown', onKey);
    },
    exit() {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('keydown', onKey);
    },
    onResize() {
      tile = fitCanvas(game.canvas, run.map.width, run.map.height);
    },
    onTap(px, py, pointerType) {
      if (run.breached) return;
      if (placing) {
        placing.dragging = true;
        moveGhost(px, py, pointerType);
      } else select(px / tile, py / tile, pointerType);
    },
    onPointerMove(px, py, pointerType) {
      // A mouse can hover the ghost around; a finger has to be down.
      if (placing && (placing.dragging || pointerType === 'mouse')) moveGhost(px, py, pointerType);
    },
    onPointerUp(px, py, pointerType, cancelled) {
      if (!placing?.dragging) return;
      placing.dragging = false;
      if (cancelled) placing.show = false;
      else {
        moveGhost(px, py, pointerType);
        if (placing.show) tryPlace();
      }
    },
    update(dt) {
      if (breachTimer >= 0) {
        breachTimer += dt;
        shake = Math.max(shake, 0.4);
        if (breachTimer >= BREACH_TIME) {
          breachTimer = -1;
          finishRun();
          return;
        }
      } else if (!paused) {
        // Fixed small steps keep 3× speed as accurate as 1×.
        const steps = speed * 2;
        for (let i = 0; i < steps && !run.breached; i++) sim.step(run, dt / 2);
        handleEvents();
      }
      const fx = paused ? 0 : dt;
      animate(fx);
      popups = popups.filter((p) => (p.t += fx) < 1);
      flashes = flashes.filter((f) => (f.t += fx * speed) < 0.12);
      rings = rings.filter((r) => (r.t += fx) < 0.3);
      if (banner && (banner.t += dt) > 1.8) banner = null;
      shake = Math.max(0, shake - dt * 2);
      updateHud();
      updatePanel();
    },
    draw() {
      const ctx = game.ctx;
      const era = ERAS[run.era]!;
      const w = run.map.width * tile;
      const h = run.map.height * tile;
      ctx.save();
      if (shake > 0) {
        const s = shake * tile * 0.15;
        ctx.translate((Math.random() - 0.5) * s, (Math.random() - 0.5) * s);
      }
      drawMap(ctx, run.map, era, tile);

      if (!sim.isSpawning(run) && !run.breached) drawEntrance(ctx);

      // Selected tower's range
      if (selected) rangeCircle(ctx, selected.x, selected.y, towerRange(selected), true);

      // Towers, sorted by y so lower ones overlap higher ones.
      for (const t of [...run.towers].sort((a, b) => a.y - b.y)) {
        const cx = t.x * tile;
        const cy = t.y * tile;
        const r = GAME.towerRadius * tile;
        // A wooden platform with a blue rim, so your towers never look like scenery.
        ctx.fillStyle = 'rgba(0,0,0,.25)';
        ctx.beginPath();
        ctx.ellipse(cx, cy + r * 0.62, r * 0.98, r * 0.42, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#6d4c2f';
        ctx.beginPath();
        ctx.ellipse(cx, cy + r * 0.48, r * 0.9, r * 0.44, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#b07f4a';
        ctx.strokeStyle = t === selected ? '#fff' : '#4fb3ff';
        ctx.lineWidth = t === selected ? 3 : 2;
        ctx.beginPath();
        ctx.ellipse(cx, cy + r * 0.32, r * 0.9, r * 0.44, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        const pulse = (firePulse.get(t.id) ?? 0) / 0.16; // 1 right after a shot
        const size = tile * 0.7 * (1 + pulse * 0.18);
        emoji(ctx, towerDef(t.type).emoji, cx, cy - r * 0.15 - pulse * tile * 0.06, size);
        for (let i = 0; i <= t.level; i++) {
          ctx.fillStyle = '#ffd34d';
          ctx.strokeStyle = 'rgba(0,0,0,.4)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(
            cx + (i - t.level / 2) * tile * 0.18,
            cy + r * 0.95,
            tile * 0.065,
            0,
            Math.PI * 2,
          );
          ctx.fill();
          ctx.stroke();
        }
      }

      // Enemies
      for (const e of run.enemies) {
        const def = enemyDef(e.type);
        const size = tile * 0.62 * (e.boss ? GAME.boss.size : 1);
        const ex = e.x * tile;
        const step = clock * (e.boss ? 6 : 9) * (e.speed / 1.6) + e.id;
        const ey = e.y * tile - Math.abs(Math.sin(step)) * tile * 0.08; // a little walking bob
        const flash = hitFlash.has(e.id);
        if (flash) {
          ctx.fillStyle = 'rgba(255,255,255,.7)';
          ctx.beginPath();
          ctx.arc(ex, ey, size * 0.5, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.save();
        ctx.translate(ex, ey);
        ctx.rotate(Math.sin(step) * 0.08);
        emoji(ctx, def.emoji, 0, 0, size * (flash ? 1.08 : 1));
        ctx.restore();
        if (e.boss) emoji(ctx, '👑', ex, ey - size * 0.6, size * 0.4);
        if (e.boss || e.hp < e.maxHp)
          hpBar(ctx, ex, ey + size * 0.45, size * 0.9, 4, e.hp / e.maxHp);
      }

      // Shots
      for (const s of run.shots) {
        const shot = towerDef(s.tower).shot;
        if (shot?.emoji) emoji(ctx, shot.emoji, s.x * tile, s.y * tile, tile * shot.size);
        else {
          ctx.fillStyle = shot?.color ?? '#fff';
          ctx.beginPath();
          ctx.arc(s.x * tile, s.y * tile, tile * (shot?.size ?? 0.1) * 0.6, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Beams and splashes
      for (const f of flashes) {
        ctx.strokeStyle = f.color;
        ctx.lineWidth = f.width;
        ctx.shadowColor = f.color;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        f.points.forEach((p, i) =>
          i ? ctx.lineTo(p.x * tile, p.y * tile) : ctx.moveTo(p.x * tile, p.y * tile),
        );
        ctx.stroke();
        ctx.shadowBlur = 0;
      }
      for (const r of rings) {
        ctx.strokeStyle = `rgba(255,190,80,${1 - r.t / 0.3})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(r.x * tile, r.y * tile, r.r * tile * (0.4 + r.t * 2), 0, Math.PI * 2);
        ctx.stroke();
      }

      // Popups
      for (const p of popups) {
        ctx.globalAlpha = 1 - p.t;
        text(ctx, p.text, p.x * tile, (p.y - p.t * 0.6) * tile, tile * p.size, p.color);
      }
      ctx.globalAlpha = 1;

      drawDanger(ctx, w, h);

      // The tower being placed, with its range: white where it fits, red where it doesn't.
      if (placing?.show) {
        const ok = sim.canBuild(run, placing.type, placing.x, placing.y);
        const def = towerDef(placing.type);
        rangeCircle(ctx, placing.x, placing.y, def.levels[0].range, ok);
        ctx.fillStyle = ok ? 'rgba(255,255,255,.35)' : 'rgba(255,60,60,.45)';
        ctx.beginPath();
        ctx.arc(placing.x * tile, placing.y * tile, GAME.towerRadius * tile, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 0.85;
        emoji(ctx, def.emoji, placing.x * tile, placing.y * tile, tile * 0.7);
        ctx.globalAlpha = 1;
      }
      ctx.restore();

      if (placing && !placing.show) {
        text(
          ctx,
          `👆 Drag ${towerDef(placing.type).emoji} onto the grass`,
          w / 2,
          tile * 0.6,
          tile * 0.42,
          '#fff',
        );
      }

      // Banner
      if (banner && banner.t >= 0) {
        const a = Math.min(1, banner.t * 4, (1.8 - banner.t) * 3);
        ctx.globalAlpha = Math.max(0, a);
        text(ctx, banner.text, w / 2, h * 0.32, tile * 0.55, '#fff');
        ctx.globalAlpha = 1;
      } else if (banner) {
        text(ctx, banner.text, w / 2, h * 0.32, tile * 0.42, '#fff');
      }
      if (paused && breachTimer < 0) text(ctx, '⏸ Paused', w / 2, h / 2, tile * 0.7, '#fff');

      // Breach!
      if (breachTimer >= 0) {
        const t = breachTimer;
        ctx.fillStyle = `rgba(200,30,30,${Math.min(0.45, t * 0.6)})`;
        ctx.fillRect(0, 0, w, h);
        const pulse = 1 + Math.sin(t * 10) * 0.06;
        text(ctx, '🚨 They got through! 🚨', w / 2, h * 0.45, tile * 0.75 * pulse, '#fff');
        if (t > 0.8) text(ctx, 'To the wall!', w / 2, h * 0.56, tile * 0.5, '#ffd34d');
      }
    },
  };
}

const AIM_LABELS: Record<sim.Targeting, string> = {
  first: '🏃 First',
  strong: '💪 Strong',
  close: '📍 Close',
};

const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));
