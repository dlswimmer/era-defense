// Phase 2: the Last Stand. A side view of the wall: enemies walk in from the right and you
// put defenders on the wall with the War Chest from Phase 1. Draws src/sim/stand.ts.
import type { Game, RunSummary, Scene } from '../game';
import { emoji, fitCanvas, hpBar, shade, text } from '../render';
import { saveMeta } from '../save';
import { ERAS, type Era } from '../sim/data/eras';
import { enemyDef } from '../sim/data/enemies';
import { GAME } from '../sim/data/game';
import { runOptions } from '../sim/data/metaUpgrades';
import { STAND } from '../sim/data/stand';
import { sellValue } from '../sim/data/towers';
import { UNIT_IDS, unitDef, type UnitId } from '../sim/data/units';
import * as st from '../sim/stand';
import { openIdeaBox } from '../ui/ideas';
import { $, el, setDisabled, setText } from '../ui/dom';
import { createRng } from '../sim/rng';

interface Popup {
  x: number;
  y: number;
  text: string;
  color: string;
  t: number;
  size: number;
}

const FALL_TIME = 2.6;

export function createLastStandScene(game: Game): Scene {
  let stand: st.Stand;
  let phase1: RunSummary;
  let tile = 32;
  let speed = 1;
  let paused = false;
  let selected: number | null = null; // wall spot
  let popups: Popup[] = [];
  let rings: { x: number; y: number; r: number; t: number }[] = [];
  let shake = 0;
  let fallTimer = -1;
  let banner: { text: string; t: number } | null = null;
  let clock = 0;
  const lastHp = new Map<number, number>();
  const hitFlash = new Map<number, number>();
  const lastCooldown = new Map<number, number>();
  const firePulse = new Map<number, number>();

  // ---------- HUD ----------
  const hud = {
    chest: el('span', { class: 'hud-chip gold' }),
    wave: el('span', { class: 'hud-chip' }),
    era: el('span', { class: 'hud-chip era' }),
    wallText: el('span'),
    wallFill: el('div', { class: 'wall-fill' }),
  };
  const ctl = {
    wave: el('button', { class: 'btn wave' }),
    speed: el('button', { class: 'btn', onclick: () => cycleSpeed(), 'aria-label': 'Speed' }),
    pause: el('button', { class: 'btn', onclick: () => (paused = !paused), 'aria-label': 'Pause' }),
    idea: el(
      'button',
      { class: 'btn idea', onclick: () => onIdea(), 'aria-label': 'Idea Box' },
      '💡',
    ),
  };
  ctl.wave.disabled = true;
  const context = el('div', { class: 'context' });
  let costButtons: { btn: HTMLButtonElement; cost: () => number | null; needsSpot?: boolean }[] =
    [];

  const buildUi = () => {
    $('hud').replaceChildren(
      el('div', { class: 'hud-row' }, hud.chest, hud.wave, hud.era, ctl.idea),
      el(
        'div',
        { class: 'wall-row' },
        el('span', {}, '🧱 Wall'),
        el('div', { class: 'wall-bar' }, hud.wallFill),
        hud.wallText,
      ),
    );
    $('panel').replaceChildren(
      el('div', { class: 'controls' }, ctl.wave, ctl.speed, ctl.pause),
      context,
    );
  };

  const renderContext = () => {
    costButtons = [];
    const unit = selected !== null ? stand.slots[selected] : null;
    context.replaceChildren(unit ? unitInfo(unit) : shop());
  };

  const shop = () => {
    const grid = el('div', { class: 'shop' });
    for (const id of UNIT_IDS) {
      if (!st.isUnitUnlocked(stand, id)) continue;
      const def = unitDef(id);
      const btn = el(
        'button',
        { class: 'btn', onclick: () => onHire(id) },
        el('span', { class: 'em' }, def.emoji),
        el('span', { class: 'nm' }, def.name),
        el('span', { class: 'cost' }, `⚔️${def.cost}`),
      );
      costButtons.push({ btn, cost: () => def.cost, needsSpot: true });
      grid.append(btn);
    }
    return grid;
  };

  const unitInfo = (unit: st.Defender) => {
    const def = unitDef(unit.type);
    const stats = def.levels[unit.level]!;
    const next = def.levels[unit.level + 1];
    const upCost = st.nextUnitCost(unit);
    const upBtn = el(
      'button',
      { class: 'btn primary', onclick: () => onPromote(unit) },
      upCost === null ? '⭐ Max' : `⬆️ ⚔️${upCost}`,
    );
    if (upCost === null) upBtn.disabled = true;
    else costButtons.push({ btn: upBtn, cost: () => st.nextUnitCost(unit) });
    const line = (label: string, now: number, then?: number) =>
      `${label} ${fmt(now)}${then !== undefined && then !== now ? ` → ${fmt(then)}` : ''}`;
    return el(
      'div',
      { class: 'info' },
      el(
        'div',
        { class: 'txt' },
        el('b', {}, `${def.emoji} ${def.name} ${'⭐'.repeat(unit.level + 1)}`),
        el(
          'div',
          {},
          [
            line('💥', stats.dmg, next?.dmg),
            line('🎯', stats.range, next?.range),
            line('⏱️', stats.rate, next?.rate),
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
          { class: 'btn danger', onclick: () => onDismiss(unit) },
          `Sell ⚔️${sellValue(unit.spent)}`,
        ),
      ),
    );
  };

  const updateUi = () => {
    const era = ERAS[stand.era]!;
    setText(hud.chest, `⚔️ ${stand.chest}`);
    setText(hud.wave, `🌊 ${stand.wave}`);
    setText(hud.era, `${era.base} Last Stand`);
    setText(hud.wallText, `${stand.wallHp}/${stand.wallMax}`);
    const frac = stand.wallHp / stand.wallMax;
    const width = `${Math.round(frac * 100)}%`;
    if (hud.wallFill.style.width !== width) hud.wallFill.style.width = width;
    hud.wallFill.classList.toggle('mid', frac <= 0.5 && frac > 0.25);
    hud.wallFill.classList.toggle('low', frac <= 0.25);
    if (stand.queue.length || stand.over) setText(ctl.wave, `🌊 Wave ${stand.wave}`);
    else setText(ctl.wave, `Next wave in ${Math.ceil(Math.max(0, stand.nextWaveIn))}…`);
    setText(ctl.speed, `${speed}×`);
    setText(ctl.pause, paused ? '▶️' : '⏸️');
    const freeSpot = (selected !== null && !stand.slots[selected]) || st.firstFreeSlot(stand) >= 0;
    for (const { btn, cost, needsSpot } of costButtons) {
      const c = cost();
      setDisabled(btn, c === null || stand.chest < c || stand.over || (!!needsSpot && !freeSpot));
    }
  };

  // ---------- Actions ----------
  const cycleSpeed = () => (speed = speed >= 3 ? 1 : speed + 1);
  const onIdea = () => {
    const was = paused;
    paused = true;
    openIdeaBox(game, () => (paused = was));
  };
  const onHire = (id: UnitId) => {
    const slot = selected !== null && !stand.slots[selected] ? selected : st.firstFreeSlot(stand);
    const unit = st.hire(stand, id, slot);
    if (!unit) return;
    const p = st.unitPos(unit.slot);
    addPopup(p.x, p.y - 0.5, `-${unitDef(id).cost}⚔️`, '#ffd34d');
    selected = null;
    renderContext();
  };
  const onPromote = (unit: st.Defender) => {
    if (st.promote(stand, unit)) renderContext();
  };
  const onDismiss = (unit: st.Defender) => {
    const value = st.dismiss(stand, unit);
    const p = st.unitPos(unit.slot);
    addPopup(p.x, p.y - 0.5, `+${value}⚔️`, '#ffd34d');
    selected = null;
    renderContext();
  };

  const addPopup = (x: number, y: number, s: string, color: string, size = 0.32) =>
    popups.push({ x, y, text: s, color, t: 0, size });

  const handleEvents = () => {
    for (const ev of stand.events) {
      switch (ev.type) {
        case 'kill':
          addPopup(ev.x, ev.y - 0.3, `+${ev.chest}⚔️`, '#ffd34d', ev.boss ? 0.5 : 0.3);
          if (ev.boss) shake = Math.max(shake, 0.3);
          break;
        case 'wallHit':
          addPopup(STAND.wallX + 0.2, STAND.groundY - 1.2, `-${ev.dmg}`, '#ff5d5d', 0.34);
          shake = Math.max(shake, ev.dmg >= 5 ? 0.35 : 0.12);
          break;
        case 'splash':
          rings.push({ x: ev.x, y: ev.y, r: ev.radius, t: 0 });
          break;
        case 'waveStart':
          banner = { text: ev.boss ? `👑 Boss wave ${ev.wave}!` : `Wave ${ev.wave}`, t: 0 };
          break;
        case 'fallen':
          fallTimer = 0;
          shake = 1;
          selected = null;
          renderContext();
          break;
      }
    }
    stand.events.length = 0;
  };

  const animate = (fx: number) => {
    clock += fx * speed;
    for (const [id, t] of hitFlash) {
      if (t - fx <= 0) hitFlash.delete(id);
      else hitFlash.set(id, t - fx);
    }
    for (const [id, t] of firePulse) {
      if (t - fx <= 0) firePulse.delete(id);
      else firePulse.set(id, t - fx);
    }
    const alive = new Set<number>();
    for (const e of stand.enemies) {
      alive.add(e.id);
      const before = lastHp.get(e.id);
      if (before !== undefined && e.hp < before) hitFlash.set(e.id, 0.1);
      lastHp.set(e.id, e.hp);
    }
    for (const id of lastHp.keys()) if (!alive.has(id)) lastHp.delete(id);
    for (const u of stand.slots) {
      if (!u) continue;
      if (u.cooldown > (lastCooldown.get(u.id) ?? 0) + 0.01) firePulse.set(u.id, 0.16);
      lastCooldown.set(u.id, u.cooldown);
    }
  };

  const finish = () => {
    const { meta } = game;
    const relics = st.standRelics(stand);
    meta.relics += relics; // Phase 1 Relics were already saved when it ended
    saveMeta(meta);
    const summary: RunSummary = {
      ...phase1,
      chest: stand.chest,
      relics: phase1.relics + relics,
      stand: {
        held: st.standWavesHeld(stand),
        wave: stand.wave,
        kills: stand.kills,
        time: stand.time,
        relics,
      },
    };
    game.go('breach', summary);
  };

  const onVisibility = () => {
    if (document.hidden) paused = true;
  };

  // ---------- Drawing ----------
  const W = STAND.width;
  const H = STAND.height;

  const drawScene = (ctx: CanvasRenderingContext2D, era: Era) => {
    const w = W * tile;
    const h = H * tile;
    const gy = STAND.groundY * tile;
    const night = era.id === 'future';
    const sky = ctx.createLinearGradient(0, 0, 0, gy);
    sky.addColorStop(0, night ? '#0b1530' : '#6fb7f0');
    sky.addColorStop(1, night ? '#3a4a7a' : '#cfe9ff');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, gy);
    emoji(ctx, night ? '🌙' : '☀️', w - tile * 1.1, tile * 1.1, tile * 1.1);
    for (let i = 0; i < 3; i++) {
      const x = ((clock * 0.15 + i * 3.7) % (W + 3)) - 1.5;
      emoji(ctx, '☁️', x * tile, (1.2 + i * 0.9) * tile, tile * (0.9 + i * 0.2));
    }
    // Far hills
    ctx.fillStyle = shade(era.ground, -0.08);
    ctx.globalAlpha = 0.7;
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.ellipse((1 + i * 3) * tile, gy, tile * 2.6, tile * (1.2 + (i % 2) * 0.6), 0, Math.PI, 0);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    // Ground and the dirt lane
    ctx.fillStyle = era.ground;
    ctx.fillRect(0, gy - tile * 0.25, w, h - gy + tile * 0.25);
    ctx.fillStyle = era.path;
    ctx.fillRect(0, gy - tile * 0.15, w, tile * 0.55);
    ctx.fillStyle = shade(era.path, -0.25);
    ctx.fillRect(0, gy + tile * 0.4, w, tile * 0.08);
    const rng = createRng(3);
    for (let i = 0; i < 6; i++) {
      emoji(
        ctx,
        era.decor[i % era.decor.length]!,
        (3 + rng.next() * 6.6) * tile,
        (11.4 + rng.next() * 1.2) * tile,
        tile * 0.6,
      );
    }
  };

  const drawWall = (ctx: CanvasRenderingContext2D, era: Era) => {
    const x0 = STAND.wallLeft * tile;
    const x1 = STAND.wallX * tile;
    const top = STAND.wallTop * tile;
    const bottom = (STAND.groundY + 0.35) * tile;
    const stone = era.id === 'future' ? '#5d6b8f' : era.id === 'modern' ? '#9aa0a8' : '#8f8a80';
    ctx.fillStyle = 'rgba(0,0,0,.25)';
    ctx.fillRect(x1, top + tile * 0.2, tile * 0.18, bottom - top - tile * 0.2);
    ctx.fillStyle = stone;
    ctx.fillRect(x0, top, x1 - x0, bottom - top);
    // Bricks
    ctx.strokeStyle = shade(stone, -0.25);
    ctx.lineWidth = 1;
    const bh = tile * 0.4;
    for (let r = 0, y = top; y < bottom; r++, y += bh) {
      ctx.beginPath();
      ctx.moveTo(x0, y);
      ctx.lineTo(x1, y);
      ctx.stroke();
      for (let x = x0 + (r % 2 ? tile * 0.35 : 0); x < x1; x += tile * 0.7) {
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x, Math.min(bottom, y + bh));
        ctx.stroke();
      }
    }
    // Battlements
    ctx.fillStyle = stone;
    for (let x = x0; x < x1 - 1; x += tile * 0.6) {
      ctx.fillRect(x, top - tile * 0.35, tile * 0.35, tile * 0.36);
    }
    // Cracks as the wall gets hurt
    const frac = stand.wallHp / stand.wallMax;
    ctx.strokeStyle = 'rgba(30,20,10,.7)';
    ctx.lineWidth = Math.max(1.5, tile * 0.05);
    const crack = (cx: number, cy: number) => {
      ctx.beginPath();
      ctx.moveTo(cx * tile, cy * tile);
      ctx.lineTo((cx + 0.3) * tile, (cy + 0.5) * tile);
      ctx.lineTo((cx + 0.1) * tile, (cy + 0.9) * tile);
      ctx.lineTo((cx + 0.4) * tile, (cy + 1.4) * tile);
      ctx.stroke();
    };
    if (frac < 0.75) crack(1.6, 8.1);
    if (frac < 0.5) crack(0.7, 5.2);
    if (frac < 0.25) crack(1.3, 3.6);
    // The base peeks over the top
    emoji(ctx, era.base, (x0 + x1) / 2, top - tile * 0.75, tile * 0.95);
  };

  const drawSpots = (ctx: CanvasRenderingContext2D) => {
    const cheapest = Math.min(
      ...UNIT_IDS.filter((id) => st.isUnitUnlocked(stand, id)).map((id) => unitDef(id).cost),
    );
    STAND.slots.forEach((y, i) => {
      // Wooden ledge sticking out of the wall
      const lx = (STAND.unitX - 0.55) * tile;
      ctx.fillStyle = '#6d4c2f';
      ctx.fillRect(lx, y * tile, (STAND.wallX + 0.3 - STAND.unitX + 0.55) * tile, tile * 0.2);
      ctx.fillStyle = '#b07f4a';
      ctx.fillRect(
        lx,
        y * tile - tile * 0.06,
        (STAND.wallX + 0.3 - STAND.unitX + 0.55) * tile,
        tile * 0.1,
      );
      const p = st.unitPos(i);
      const unit = stand.slots[i];
      if (selected === i) {
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(p.x * tile, p.y * tile, tile * 0.5, 0, Math.PI * 2);
        ctx.stroke();
      }
      if (unit) {
        const pulse = (firePulse.get(unit.id) ?? 0) / 0.16;
        emoji(
          ctx,
          unitDef(unit.type).emoji,
          p.x * tile,
          p.y * tile - pulse * tile * 0.05,
          tile * 0.75 * (1 + pulse * 0.15),
        );
        for (let l = 0; l <= unit.level; l++) {
          ctx.fillStyle = '#ffd34d';
          ctx.beginPath();
          ctx.arc(
            (p.x + (l - unit.level / 2) * 0.18) * tile,
            (p.y + 0.42) * tile,
            tile * 0.06,
            0,
            Math.PI * 2,
          );
          ctx.fill();
        }
      } else {
        const ready = stand.chest >= cheapest && !stand.over;
        ctx.globalAlpha = ready ? 0.55 + 0.35 * Math.sin(clock * 4 + i) : 0.35;
        ctx.setLineDash([5, 4]);
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(p.x * tile, p.y * tile, tile * 0.36, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        text(ctx, '+', p.x * tile, p.y * tile, tile * 0.5, '#fff');
        ctx.globalAlpha = 1;
      }
    });
  };

  const drawEnemies = (ctx: CanvasRenderingContext2D) => {
    for (const e of [...stand.enemies].sort((a, b) => b.x - a.x)) {
      const def = enemyDef(e.type);
      const size = tile * 0.7 * (e.boss ? GAME.boss.size : 1);
      const atWall = e.x <= STAND.wallX + 0.31 * (e.boss ? GAME.boss.size : 1);
      const step = clock * 9 * (e.speed / 1.2) + e.id;
      const ex = e.x * tile;
      const ey = st.enemyY(e) * tile - (atWall ? 0 : Math.abs(Math.sin(step)) * tile * 0.1);
      // Leaning into the wall right after a hit
      const lean = atWall ? -0.35 * Math.max(0, e.hitTimer / STAND.attackEvery - 0.6) * 2.5 : 0;
      ctx.fillStyle = 'rgba(0,0,0,.2)';
      ctx.beginPath();
      ctx.ellipse(ex, (STAND.groundY + 0.05) * tile, size * 0.4, size * 0.1, 0, 0, Math.PI * 2);
      ctx.fill();
      if (hitFlash.has(e.id)) {
        ctx.fillStyle = 'rgba(255,255,255,.7)';
        ctx.beginPath();
        ctx.arc(ex, ey, size * 0.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.save();
      ctx.translate(ex, ey);
      ctx.rotate(atWall ? lean : Math.sin(step) * 0.08);
      emoji(ctx, def.emoji, 0, 0, size);
      ctx.restore();
      if (e.boss) emoji(ctx, '👑', ex, ey - size * 0.62, size * 0.4);
      if (e.boss || e.hp < e.maxHp) hpBar(ctx, ex, ey - size * 0.6, size * 0.9, 4, e.hp / e.maxHp);
    }
  };

  // ---------- Scene ----------
  return {
    enter(params) {
      phase1 = params as RunSummary;
      const opts = runOptions(game.meta.upgrades);
      stand = st.createStand(Date.now(), {
        era: phase1.era,
        wave: phase1.wave,
        chest: phase1.chest,
        damageBonus: 1 + opts.bonusDamage,
      });
      if (new URLSearchParams(location.search).has('dev')) stand.chest = 99_999;
      speed = 1;
      paused = false;
      selected = null;
      popups = [];
      rings = [];
      shake = 0;
      fallTimer = -1;
      clock = 0;
      lastHp.clear();
      hitFlash.clear();
      lastCooldown.clear();
      firePulse.clear();
      banner = { text: '🏰 Last Stand! Put defenders on the wall', t: -2 };
      buildUi();
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
      tile = fitCanvas(game.canvas, W, H);
    },
    onTap(px, py, pointerType) {
      if (stand.over) return;
      const x = px / tile;
      const y = py / tile;
      const reach = pointerType === 'mouse' ? 0.55 : 0.75;
      let hit: number | null = null;
      STAND.slots.forEach((_, i) => {
        const p = st.unitPos(i);
        if (Math.hypot(p.x - x, p.y - y) <= reach) hit = i;
      });
      selected = hit === selected ? null : hit;
      renderContext();
    },
    update(dt) {
      if (fallTimer >= 0) {
        fallTimer += dt;
        shake = Math.max(shake, 0.3);
        if (fallTimer >= FALL_TIME) {
          fallTimer = -1;
          finish();
          return;
        }
      } else if (!paused) {
        const steps = speed * 2;
        for (let i = 0; i < steps && !stand.over; i++) st.stepStand(stand, dt / 2);
        handleEvents();
      }
      const fx = paused ? 0 : dt;
      animate(fx);
      popups = popups.filter((p) => (p.t += fx) < 1);
      rings = rings.filter((r) => (r.t += fx) < 0.3);
      if (banner && (banner.t += dt) > 1.8) banner = null;
      shake = Math.max(0, shake - dt * 2);
      updateUi();
    },
    draw() {
      const ctx = game.ctx;
      const era = ERAS[stand.era]!;
      const w = W * tile;
      const h = H * tile;
      ctx.save();
      if (shake > 0) {
        const s = shake * tile * 0.15;
        ctx.translate((Math.random() - 0.5) * s, (Math.random() - 0.5) * s);
      }
      drawScene(ctx, era);
      drawWall(ctx, era);
      // Range of the selected defender along the ground
      const sel = selected !== null ? stand.slots[selected] : null;
      if (sel) {
        const range = unitDef(sel.type).levels[sel.level]!.range;
        ctx.fillStyle = 'rgba(255,255,255,.18)';
        ctx.fillRect(STAND.wallX * tile, (STAND.groundY - 0.9) * tile, range * tile, tile * 1.3);
      }
      drawSpots(ctx);
      drawEnemies(ctx);
      for (const s of stand.shots) {
        const shot = unitDef(s.unit).shot;
        if (shot.emoji) emoji(ctx, shot.emoji, s.x * tile, s.y * tile, tile * shot.size);
        else {
          ctx.fillStyle = shot.color ?? '#fff';
          ctx.beginPath();
          ctx.arc(s.x * tile, s.y * tile, tile * shot.size * 0.6, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      for (const r of rings) {
        ctx.strokeStyle = `rgba(255,190,80,${1 - r.t / 0.3})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(r.x * tile, r.y * tile, r.r * tile * (0.4 + r.t * 2), 0, Math.PI * 2);
        ctx.stroke();
      }
      for (const p of popups) {
        ctx.globalAlpha = 1 - p.t;
        text(ctx, p.text, p.x * tile, (p.y - p.t * 0.6) * tile, tile * p.size, p.color);
      }
      ctx.globalAlpha = 1;
      ctx.restore();

      if (banner && banner.t >= 0) {
        ctx.globalAlpha = Math.max(0, Math.min(1, banner.t * 4, (1.8 - banner.t) * 3));
        text(ctx, banner.text, w / 2 + tile, h * 0.2, tile * 0.5, '#fff');
        ctx.globalAlpha = 1;
      } else if (banner) {
        text(ctx, banner.text, w / 2 + tile, h * 0.2, tile * 0.38, '#fff');
      }
      if (!stand.queue.length && !stand.enemies.length && !stand.over && stand.nextWaveIn > 0) {
        text(ctx, `${Math.ceil(stand.nextWaveIn)}`, w / 2 + tile, h * 0.28, tile * 0.9, '#ffd34d');
      }
      if (paused && fallTimer < 0) text(ctx, '⏸ Paused', w / 2, h / 2, tile * 0.7, '#fff');
      if (fallTimer >= 0) {
        ctx.fillStyle = `rgba(40,20,10,${Math.min(0.5, fallTimer * 0.6)})`;
        ctx.fillRect(0, 0, w, h);
        const pulse = 1 + Math.sin(fallTimer * 10) * 0.06;
        text(ctx, '🏰 The wall fell!', w / 2, h * 0.42, tile * 0.85 * pulse, '#fff');
        if (fallTimer > 0.8)
          text(
            ctx,
            `You held ${st.standWavesHeld(stand)} waves`,
            w / 2,
            h * 0.52,
            tile * 0.45,
            '#ffd34d',
          );
      }
    },
  };
}

const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));
