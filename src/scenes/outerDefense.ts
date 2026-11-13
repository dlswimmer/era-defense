// Phase 1: Outer Defense. Draws the run and turns taps into sim actions (src/sim/run.ts).
import type { Game, RunSummary, Scene } from '../game';
import { emoji, fitCanvas, hpBar, drawMap, text } from '../render';
import { saveMeta } from '../save';
import { ERAS } from '../sim/data/eras';
import { enemyDef } from '../sim/data/enemies';
import { GAME } from '../sim/data/game';
import { relicsEarned, runOptions } from '../sim/data/metaUpgrades';
import { TOWER_IDS, towerDef, sellValue, type TowerId } from '../sim/data/towers';
import type { Point } from '../sim/path';
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

export function createOuterDefenseScene(game: Game): Scene {
  let run: sim.Run;
  let tile = 32;
  let selected: { col: number; row: number } | null = null;
  let speed = 1;
  let paused = false;
  let popups: Popup[] = [];
  let flashes: Flash[] = [];
  let rings: Ring[] = [];
  let shake = 0;
  let breachTimer = -1;
  let banner: { text: string; t: number } | null = null;

  // ---------- HUD ----------
  const hud = {
    gold: el('span', { class: 'hud-chip gold' }),
    chest: el('span', { class: 'hud-chip' }),
    wave: el('span', { class: 'hud-chip' }),
    era: el('span', { class: 'hud-chip era' }),
    wallText: el('span'),
    wallFill: el('div', { class: 'wall-fill' }),
  };
  const buildHud = () => {
    $('hud').replaceChildren(
      el('div', { class: 'hud-row' }, hud.gold, hud.chest, hud.wave, hud.era),
      el(
        'div',
        { class: 'wall-row' },
        el('span', {}, '🧱 Wall'),
        el('div', { class: 'wall-bar' }, hud.wallFill),
        hud.wallText,
        ctl.idea,
      ),
    );
  };
  const updateHud = () => {
    const era = ERAS[run.era]!;
    setText(hud.gold, `💰 ${run.gold}`);
    setText(hud.chest, `⚔️ ${run.chest}`);
    setText(hud.wave, `🌊 ${run.wave}`);
    setText(hud.era, `${era.base} ${era.name}`);
    setText(hud.wallText, `${run.wallHp}/${run.wallMax}`);
    const frac = run.wallHp / run.wallMax;
    const width = `${Math.round(frac * 100)}%`;
    if (hud.wallFill.style.width !== width) hud.wallFill.style.width = width;
    hud.wallFill.classList.toggle('mid', frac <= 0.5 && frac > 0.25);
    hud.wallFill.classList.toggle('low', frac <= 0.25);
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
    const tower = selected && sim.towerAt(run, selected.col, selected.row);
    if (tower) context.replaceChildren(towerInfo(tower));
    else if (selected) context.replaceChildren(shop());
    else
      context.replaceChildren(
        el('div', { class: 'hint' }, '👆 Tap a grass square to build a tower'),
      );
  };

  const shop = () => {
    const grid = el('div', { class: 'shop' });
    for (const id of TOWER_IDS) {
      const def = towerDef(id);
      if (def.era > run.era + 1) continue; // show the next era's towers as a teaser
      const locked = def.era > run.era;
      const btn = el(
        'button',
        { class: `btn${locked ? ' locked' : ''}`, onclick: () => onBuild(id) },
        el('span', { class: 'em' }, locked ? '🔒' : def.emoji),
        el('span', { class: 'nm' }, def.name),
        el('span', { class: 'cost' }, locked ? '🦴 Evolve' : `💰${def.cost}`),
      );
      if (locked) btn.disabled = true;
      else costButtons.push({ btn, cost: () => def.cost });
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
    return el(
      'div',
      { class: 'info' },
      el('div', { class: 'big' }, def.emoji),
      el(
        'div',
        { class: 'txt' },
        el('b', {}, `${def.name} ${'⭐'.repeat(tower.level + 1)}`),
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
  const onBuild = (id: TowerId) => {
    if (!selected) return;
    if (sim.build(run, id, selected.col, selected.row)) renderContext();
  };
  const onUpgrade = (tower: sim.Tower) => {
    if (sim.upgrade(run, tower)) renderContext();
  };
  const onSell = (tower: sim.Tower) => {
    const value = sim.sell(run, tower);
    addPopup(tower.col + 0.5, tower.row + 0.5, `+${value}💰`, '#ffd34d');
    selected = null;
    renderContext();
  };

  const select = (col: number, row: number) => {
    const same = selected && selected.col === col && selected.row === row;
    if (same || (!sim.towerAt(run, col, row) && !sim.isBuildable(run, col, row))) selected = null;
    else selected = { col, row };
    renderContext();
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
          addPopup(ev.x, ev.y - 0.6, `-${ev.dmg}🧱`, '#ff5d5d', 0.38);
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
      speed = 1;
      paused = false;
      popups = [];
      flashes = [];
      rings = [];
      shake = 0;
      breachTimer = -1;
      banner = { text: 'Build towers, then tap ▶ Start', t: -1.5 };
      buildHud();
      buildPanel();
      $('hud').hidden = false;
      $('panel').hidden = false;
      renderContext();
      this.onResize!();
      document.addEventListener('visibilitychange', onVisibility);
    },
    exit() {
      document.removeEventListener('visibilitychange', onVisibility);
    },
    onResize() {
      tile = fitCanvas(game.canvas, run.map.cols, run.map.rows);
    },
    onTap(x, y) {
      if (run.breached) return;
      select(Math.floor(x / tile), Math.floor(y / tile));
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
      const w = run.map.cols * tile;
      const h = run.map.rows * tile;
      ctx.save();
      if (shake > 0) {
        const s = shake * tile * 0.15;
        ctx.translate((Math.random() - 0.5) * s, (Math.random() - 0.5) * s);
      }
      drawMap(ctx, run.map, era, tile, run.wallHp / run.wallMax);

      // Selection + range
      if (selected) {
        const tower = sim.towerAt(run, selected.col, selected.row);
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 3;
        ctx.strokeRect(selected.col * tile + 2, selected.row * tile + 2, tile - 4, tile - 4);
        if (tower) {
          const range = towerDef(tower.type).levels[tower.level]!.range;
          ctx.fillStyle = 'rgba(255,255,255,.15)';
          ctx.strokeStyle = 'rgba(255,255,255,.6)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc((tower.col + 0.5) * tile, (tower.row + 0.5) * tile, range * tile, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }
      }

      // Towers
      for (const t of run.towers) {
        const cx = (t.col + 0.5) * tile;
        const cy = (t.row + 0.5) * tile;
        ctx.fillStyle = 'rgba(0,0,0,.18)';
        ctx.beginPath();
        ctx.ellipse(cx, cy + tile * 0.3, tile * 0.36, tile * 0.12, 0, 0, Math.PI * 2);
        ctx.fill();
        emoji(ctx, towerDef(t.type).emoji, cx, cy, tile * 0.7);
        for (let i = 0; i <= t.level; i++) {
          ctx.fillStyle = '#ffd34d';
          ctx.beginPath();
          ctx.arc(
            cx + (i - t.level / 2) * tile * 0.18,
            cy + tile * 0.42,
            tile * 0.07,
            0,
            Math.PI * 2,
          );
          ctx.fill();
        }
      }

      // Enemies
      for (const e of run.enemies) {
        const def = enemyDef(e.type);
        const size = tile * 0.62 * (e.boss ? GAME.boss.size : 1);
        const ex = e.x * tile;
        const ey = e.y * tile;
        emoji(ctx, def.emoji, ex, ey, size);
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
      ctx.restore();

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
        text(ctx, '💥 BREACH! 💥', w / 2, h * 0.45, tile * 1.0 * pulse, '#fff');
        if (t > 0.8) text(ctx, 'The wall is down!', w / 2, h * 0.56, tile * 0.45, '#ffd34d');
      }
    },
  };
}

const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));
