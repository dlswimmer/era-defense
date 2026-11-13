// Phase 2: the Last Stand. A side view of the wall with a little depth (2.5D). Enemies walk in
// from far to the right; drag the field (or scroll) to see them coming. Buy defenders with the
// War Chest and they take a place on the wall; buy team boosts to make them all stronger.
// Draws src/sim/stand.ts.
import type { Game, RunSummary, Scene } from '../game';
import { emoji, fitCanvas, hpBar, shade, text } from '../render';
import { saveMeta } from '../save';
import { ERAS, type Era } from '../sim/data/eras';
import { enemyDef } from '../sim/data/enemies';
import { GAME } from '../sim/data/game';
import { runOptions } from '../sim/data/metaUpgrades';
import { BOOSTS, STAND, type Boost } from '../sim/data/stand';
import { UNIT_IDS, unitDef, type UnitId } from '../sim/data/units';
import { createRng } from '../sim/rng';
import * as st from '../sim/stand';
import { openIdeaBox } from '../ui/ideas';
import { $, el, setDisabled, setText } from '../ui/dom';

interface Popup {
  x: number;
  y: number;
  z: number;
  text: string;
  color: string;
  t: number;
  size: number;
}

const FALL_TIME = 2.6;
const VIEW_W = STAND.view.width;
const VIEW_H = STAND.view.height;
const MAX_CAM = STAND.fieldWidth - VIEW_W;
/** The mini-map strip along the top of the screen, in screen tiles. */
const MINI = { x: 0.3, y: 0.25, w: VIEW_W - 0.6, h: 0.45 };

export function createLastStandScene(game: Game): Scene {
  let stand: st.Stand;
  let phase1: RunSummary;
  let tile = 32;
  let camX = 0;
  let drag: { px: number; camX: number; moved: boolean } | null = null;
  let speed = 1;
  let paused = false;
  let popups: Popup[] = [];
  let rings: { x: number; y: number; z: number; r: number; t: number }[] = [];
  let shake = 0;
  let fallTimer = -1;
  let banner: { text: string; t: number } | null = null;
  let clock = 0;
  const lastHp = new Map<number, number>();
  const hitFlash = new Map<number, number>();
  const lastCooldown = new Map<number, number>();
  const firePulse = new Map<number, number>();

  // Screen position (CSS pixels) of a point on the field.
  const sx = (x: number, z = 0) => (x - camX + z * STAND.skew) * tile;
  const sy = (y: number, z = 0) => (y - z * STAND.skew) * tile;

  // ---------- HUD and panel ----------
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
  const context = el('div', { class: 'context stand-shop' });
  let buttons: { btn: HTMLButtonElement; can: () => boolean }[] = [];

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

  /** Defenders and boosts. Rebuilt after each purchase; enabled/disabled every frame. */
  const renderShop = () => {
    buttons = [];
    const grid = el('div', { class: 'shop' });
    for (const id of UNIT_IDS) {
      if (!st.isUnitUnlocked(stand, id)) continue;
      const def = unitDef(id);
      const count = stand.defenders.filter((d) => d.type === id).length;
      const btn = el(
        'button',
        { class: 'btn', onclick: () => onHire(id) },
        el('span', { class: 'em' }, def.emoji),
        el('span', { class: 'nm' }, count ? `${def.name} ×${count}` : def.name),
        el('span', { class: 'cost' }, `⚔️${def.cost}`),
      );
      buttons.push({ btn, can: () => st.canHire(stand, id) });
      grid.append(btn);
    }
    for (const boost of BOOSTS) {
      const cost = st.boostCost(stand, boost);
      const level = stand.boosts[boost.id];
      const btn = el(
        'button',
        { class: 'btn boost', onclick: () => onBoost(boost) },
        el('span', { class: 'em' }, boost.emoji),
        el(
          'span',
          { class: 'nm' },
          boost.id === 'repair' || !level ? boost.name : `${boost.name} ${level}`,
        ),
        el(
          'span',
          { class: 'cost' },
          cost === null ? (boost.id === 'repair' ? 'Full' : 'Max') : `⚔️${cost}`,
        ),
      );
      buttons.push({
        btn,
        can: () => {
          const c = st.boostCost(stand, boost);
          return c !== null && stand.chest >= c && !stand.over;
        },
      });
      grid.append(btn);
    }
    context.replaceChildren(grid);
  };

  let repairWasPossible = false;
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
    // Repair's label flips between "Full" and a price as the wall gets hurt.
    const repairPossible = stand.wallHp < stand.wallMax;
    if (repairPossible !== repairWasPossible) {
      repairWasPossible = repairPossible;
      renderShop();
    }
    for (const { btn, can } of buttons) setDisabled(btn, !can());
  };

  // ---------- Actions ----------
  const cycleSpeed = () => (speed = speed >= 3 ? 1 : speed + 1);
  const onIdea = () => {
    const was = paused;
    paused = true;
    openIdeaBox(game, () => (paused = was));
  };
  const onHire = (id: UnitId) => {
    const unit = st.hire(stand, id);
    if (!unit) return;
    const p = st.seatPos(unit.seat);
    addPopup(p.x, p.y - 0.6, p.z, `-${unitDef(id).cost}⚔️`, '#ffd34d');
    if (camX > VIEW_W * 0.5) camX = 0; // show where they went
    renderShop();
  };
  const onBoost = (boost: Boost) => {
    const cost = st.boostCost(stand, boost);
    if (!st.buyBoost(stand, boost.id)) return;
    const msg = boost.id === 'repair' ? '🧱 Repaired!' : `${boost.emoji} ${boost.name} up!`;
    banner = { text: `${msg}  -${cost}⚔️`, t: 0 };
    renderShop();
  };

  const addPopup = (x: number, y: number, z: number, s: string, color: string, size = 0.32) =>
    popups.push({ x, y, z, text: s, color, t: 0, size });

  const handleEvents = () => {
    for (const ev of stand.events) {
      switch (ev.type) {
        case 'kill':
          addPopup(ev.x, ev.y - 0.3, ev.z, `+${ev.chest}⚔️`, '#ffd34d', ev.boss ? 0.5 : 0.3);
          if (ev.boss) shake = Math.max(shake, 0.3);
          break;
        case 'wallHit':
          addPopup(STAND.wall.front + 0.3, STAND.groundY - 1.2, ev.z, `-${ev.dmg}`, '#ff5d5d');
          if (camX < STAND.wall.front + 1) shake = Math.max(shake, ev.dmg >= 5 ? 0.35 : 0.12);
          break;
        case 'splash':
          rings.push({ x: ev.x, y: STAND.groundY, z: ev.z, r: ev.radius, t: 0 });
          break;
        case 'waveStart':
          banner = { text: ev.boss ? `👑 Boss wave ${ev.wave}!` : `Wave ${ev.wave}`, t: 0 };
          break;
        case 'fallen':
          fallTimer = 0;
          shake = 1;
          camX = 0;
          break;
      }
    }
    stand.events.length = 0;
  };

  const animate = (fx: number) => {
    clock += fx * speed;
    for (const map of [hitFlash, firePulse]) {
      for (const [id, t] of map) {
        if (t - fx <= 0) map.delete(id);
        else map.set(id, t - fx);
      }
    }
    const alive = new Set<number>();
    for (const e of stand.enemies) {
      alive.add(e.id);
      const before = lastHp.get(e.id);
      if (before !== undefined && e.hp < before) hitFlash.set(e.id, 0.1);
      lastHp.set(e.id, e.hp);
    }
    for (const id of lastHp.keys()) if (!alive.has(id)) lastHp.delete(id);
    for (const u of stand.defenders) {
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
  const onWheel = (e: WheelEvent) => {
    e.preventDefault();
    const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
    setCam(camX + delta / tile);
  };
  const setCam = (x: number) => (camX = Math.max(0, Math.min(MAX_CAM, x)));

  // ---------- Drawing ----------
  const poly = (ctx: CanvasRenderingContext2D, pts: [number, number, number][]) => {
    ctx.beginPath();
    pts.forEach(([x, y, z], i) =>
      i ? ctx.lineTo(sx(x, z), sy(y, z)) : ctx.moveTo(sx(x, z), sy(y, z)),
    );
    ctx.closePath();
  };

  const drawBackdrop = (ctx: CanvasRenderingContext2D, era: Era) => {
    const w = VIEW_W * tile;
    const h = VIEW_H * tile;
    const horizon = sy(STAND.groundY, STAND.depth);
    const night = era.id === 'future';
    const sky = ctx.createLinearGradient(0, 0, 0, horizon);
    sky.addColorStop(0, night ? '#0b1530' : '#6fb7f0');
    sky.addColorStop(1, night ? '#3a4a7a' : '#d6edff');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, horizon + 2);
    emoji(ctx, night ? '🌙' : '☀️', w - tile * 1.3 - camX * tile * 0.05, tile * 2.9, tile * 1.1);
    for (let i = 0; i < 6; i++) {
      const x = ((i * 6.3 + clock * 0.12 - camX * 0.25) % 36) - 2;
      emoji(ctx, '☁️', x * tile, (1.6 + (i % 3) * 0.9) * tile, tile * (0.9 + (i % 3) * 0.25));
    }
    // Far hills drift slower than the ground (parallax)
    ctx.fillStyle = shade(era.ground, -0.1);
    ctx.globalAlpha = 0.75;
    for (let i = 0; i < 9; i++) {
      const x = (i * 4.2 - camX * 0.5) * tile;
      ctx.beginPath();
      ctx.ellipse(x, horizon, tile * 2.8, tile * (1.3 + (i % 3) * 0.5), 0, Math.PI, 0);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    // Ground: the top (with depth), a dirt road, and the front edge
    const x0 = camX - 2;
    const x1 = camX + VIEW_W + 1;
    const g = STAND.groundY;
    ctx.fillStyle = era.ground;
    poly(ctx, [
      [x0, g, 0],
      [x1, g, 0],
      [x1, g, STAND.depth + 1],
      [x0, g, STAND.depth + 1],
    ]);
    ctx.fill();
    ctx.fillStyle = era.path;
    poly(ctx, [
      [x0, g, 0.1],
      [x1, g, 0.1],
      [x1, g, STAND.depth - 0.1],
      [x0, g, STAND.depth - 0.1],
    ]);
    ctx.fill();
    ctx.strokeStyle = shade(era.path, -0.2);
    ctx.lineWidth = 2;
    for (const z of [0.1, STAND.depth - 0.1]) {
      ctx.beginPath();
      ctx.moveTo(sx(x0, z), sy(g, z));
      ctx.lineTo(sx(x1, z), sy(g, z));
      ctx.stroke();
    }
    ctx.fillStyle = shade(era.ground, -0.22);
    ctx.fillRect(0, sy(g), w, h - sy(g));
    // Scenery along the back and the front, spread over the whole field
    const rng = createRng(5);
    for (let i = 0; i < 26; i++) {
      const x = 3 + rng.next() * (STAND.fieldWidth - 2);
      const front = i % 2 === 0;
      const y = front ? g + 0.9 + rng.next() * 1.4 : g;
      const z = front ? 0 : STAND.depth + 0.3 + rng.next() * 0.5;
      if (sx(x, z) < -tile || sx(x, z) > w + tile) continue;
      emoji(ctx, era.decor[i % era.decor.length]!, sx(x, z), sy(y, z) - tile * 0.25, tile * 0.65);
    }
  };

  const drawWall = (ctx: CanvasRenderingContext2D, era: Era) => {
    const { back, front, top } = STAND.wall;
    const g = STAND.groundY + 0.05;
    const d = STAND.depth;
    const style = era.wall;
    const energy = style.kind === 'energy';
    const glow = energy ? 0.35 + 0.15 * Math.sin(clock * 3) : 1;
    ctx.globalAlpha = energy ? glow + 0.15 : 1;
    // Side facing the enemies, the top walkway, then the front face.
    ctx.fillStyle = shade(style.color, -0.2);
    poly(ctx, [
      [front, top, 0],
      [front, top, d],
      [front, g, d],
      [front, g, 0],
    ]);
    ctx.fill();
    ctx.fillStyle = shade(style.color, 0.15);
    poly(ctx, [
      [back, top, 0],
      [front, top, 0],
      [front, top, d],
      [back, top, d],
    ]);
    ctx.fill();
    ctx.fillStyle = style.color;
    poly(ctx, [
      [back, top, 0],
      [front, top, 0],
      [front, g, 0],
      [back, g, 0],
    ]);
    ctx.fill();
    ctx.globalAlpha = 1;
    wallDetails(ctx, era);
    // Edges
    ctx.strokeStyle = energy ? '#c9f3ff' : shade(style.color, -0.4);
    ctx.lineWidth = energy ? 2.5 : 1.5;
    poly(ctx, [
      [back, g, 0],
      [back, top, 0],
      [back, top, d],
      [front, top, d],
      [front, g, d],
      [front, g, 0],
    ]);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(sx(back, 0), sy(top, 0));
    ctx.lineTo(sx(front, 0), sy(top, 0));
    ctx.lineTo(sx(front, d), sy(top, d));
    ctx.moveTo(sx(front, 0), sy(top, 0));
    ctx.lineTo(sx(front, 0), sy(g, 0));
    ctx.stroke();
    // Cracks as the wall gets hurt
    const frac = stand.wallHp / stand.wallMax;
    ctx.strokeStyle = 'rgba(30,20,10,.75)';
    ctx.lineWidth = Math.max(1.5, tile * 0.05);
    const crack = (x: number, y: number) => {
      ctx.beginPath();
      ctx.moveTo(sx(x), sy(y));
      ctx.lineTo(sx(x + 0.3), sy(y + 0.5));
      ctx.lineTo(sx(x + 0.1), sy(y + 0.9));
      ctx.lineTo(sx(x + 0.4), sy(y + 1.4));
      ctx.stroke();
    };
    if (frac < 0.75) crack(1.6, 8.3);
    if (frac < 0.5) crack(0.7, 7.2);
    if (frac < 0.25) crack(1.2, 6.9);
    // Your base behind the wall
    emoji(ctx, era.base, sx(back + 0.7, d + 0.4), sy(top - 0.55, d + 0.4), tile * 1.1);
  };

  /** Era-specific texture on the front and side faces. */
  const wallDetails = (ctx: CanvasRenderingContext2D, era: Era) => {
    const { back, front, top } = STAND.wall;
    const g = STAND.groundY;
    const d = STAND.depth;
    const { kind, color } = era.wall;
    ctx.strokeStyle = shade(color, -0.35);
    ctx.lineWidth = 1.2;
    const line = (a: [number, number, number], b: [number, number, number]) => {
      ctx.beginPath();
      ctx.moveTo(sx(a[0], a[2]), sy(a[1], a[2]));
      ctx.lineTo(sx(b[0], b[2]), sy(b[1], b[2]));
      ctx.stroke();
    };
    if (kind === 'logs') {
      // A palisade: upright logs with pointed tops
      for (let x = back; x < front - 0.01; x += 0.36) line([x, top, 0], [x, g, 0]);
      for (let z = 0; z < d; z += 0.36) line([front, top, z], [front, g, z]);
      ctx.fillStyle = shade(color, -0.05);
      for (let x = back; x < front - 0.01; x += 0.36) {
        poly(ctx, [
          [x, top, 0],
          [x + 0.18, top - 0.35, 0],
          [x + 0.36, top, 0],
        ]);
        ctx.fill();
        ctx.stroke();
      }
      for (let z = 0.36; z < d; z += 0.36) {
        poly(ctx, [
          [front, top, z - 0.36],
          [front, top - 0.35, z - 0.18],
          [front, top, z],
        ]);
        ctx.fill();
        ctx.stroke();
      }
    } else if (kind === 'blocks' || kind === 'bricks') {
      const bw = kind === 'blocks' ? 0.7 : 0.4;
      const bh = kind === 'blocks' ? 0.45 : 0.25;
      for (let r = 0, y = top; y < g; r++, y += bh) {
        line([back, y, 0], [front, y, 0]);
        line([front, y, 0], [front, y, d]);
        for (let x = back + (r % 2 ? bw / 2 : 0); x < front; x += bw) {
          line([x, y, 0], [x, Math.min(g, y + bh), 0]);
        }
        for (let z = r % 2 ? bw / 2 : 0; z < d; z += bw) {
          line([front, y, z], [front, Math.min(g, y + bh), z]);
        }
      }
      // Battlements along the front and the enemy side
      ctx.fillStyle = shade(color, 0.05);
      const merlon = (x: number, z: number, alongZ: boolean) => {
        const w = 0.32;
        const h = 0.35;
        const pts: [number, number, number][] = alongZ
          ? [
              [x, top, z],
              [x, top - h, z],
              [x, top - h, z + w],
              [x, top, z + w],
            ]
          : [
              [x, top, z],
              [x, top - h, z],
              [x + w, top - h, z],
              [x + w, top, z],
            ];
        poly(ctx, pts);
        ctx.fill();
        ctx.stroke();
      };
      for (let z = d - 0.32; z > 0; z -= 0.6) merlon(front, z, true);
      for (let x = back; x < front - 0.2; x += 0.6) merlon(x, 0, false);
    } else if (kind === 'concrete') {
      for (let y = top + 0.8; y < g; y += 0.8) {
        line([back, y, 0], [front, y, 0]);
        line([front, y, 0], [front, y, d]);
      }
      // Hazard stripes along the top
      for (let x = back; x < front; x += 0.3) {
        ctx.fillStyle = Math.round((x - back) / 0.3) % 2 ? '#222' : '#ffd34d';
        ctx.fillRect(sx(x), sy(top), 0.3 * tile, 0.18 * tile);
      }
    } else {
      // Energy shield: glowing hex-ish lines that shimmer
      ctx.strokeStyle = `rgba(200,245,255,${0.4 + 0.3 * Math.sin(clock * 4)})`;
      for (let y = top + 0.4; y < g; y += 0.5) {
        line([back, y, 0], [front, y, 0]);
        line([front, y, 0], [front, y, d]);
      }
    }
  };

  const drawDefenders = (ctx: CanvasRenderingContext2D) => {
    const order = [...stand.defenders].sort((a, b) => st.seatPos(b.seat).z - st.seatPos(a.seat).z);
    for (const u of order) {
      const p = st.seatPos(u.seat);
      const pulse = (firePulse.get(u.id) ?? 0) / 0.16;
      const x = sx(p.x, p.z);
      const y = sy(p.y, p.z);
      ctx.fillStyle = 'rgba(0,0,0,.2)';
      ctx.beginPath();
      ctx.ellipse(x, sy(STAND.wall.top, p.z), tile * 0.28, tile * 0.09, 0, 0, Math.PI * 2);
      ctx.fill();
      emoji(
        ctx,
        unitDef(u.type).emoji,
        x,
        y - pulse * tile * 0.06,
        tile * 0.6 * (1 + pulse * 0.15),
      );
    }
  };

  const drawEnemies = (ctx: CanvasRenderingContext2D) => {
    const w = VIEW_W * tile;
    for (const e of [...stand.enemies].sort((a, b) => b.z - a.z)) {
      const ex = sx(e.x, e.z);
      if (ex < -tile * 2 || ex > w + tile * 2) continue;
      const def = enemyDef(e.type);
      const size = tile * 0.7 * (e.boss ? GAME.boss.size : 1);
      const atWall = e.x <= st.wallStop(e) + 0.01;
      const step = clock * 9 * (e.speed / 1.2) + e.id;
      const ey = sy(st.enemyY(e), e.z) - (atWall ? 0 : Math.abs(Math.sin(step)) * tile * 0.1);
      const lean = atWall ? -0.35 * Math.max(0, (e.hitTimer / STAND.attackEvery - 0.6) * 2.5) : 0;
      ctx.fillStyle = 'rgba(0,0,0,.2)';
      ctx.beginPath();
      ctx.ellipse(ex, sy(STAND.groundY, e.z), size * 0.4, size * 0.1, 0, 0, Math.PI * 2);
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

  /** The whole field squeezed into a strip: wall, enemies and what you're looking at. */
  const drawMiniMap = (ctx: CanvasRenderingContext2D) => {
    const k = MINI.w / STAND.fieldWidth;
    const X = (x: number) => (MINI.x + x * k) * tile;
    ctx.fillStyle = 'rgba(10,20,30,.55)';
    ctx.fillRect(MINI.x * tile, MINI.y * tile, MINI.w * tile, MINI.h * tile);
    ctx.fillStyle = '#c9b38a';
    ctx.fillRect(
      X(STAND.wall.back),
      MINI.y * tile,
      (STAND.wall.front - STAND.wall.back) * k * tile,
      MINI.h * tile,
    );
    ctx.fillStyle = '#ff5d5d';
    for (const e of stand.enemies) {
      ctx.beginPath();
      ctx.arc(X(e.x), (MINI.y + MINI.h / 2) * tile, tile * (e.boss ? 0.12 : 0.07), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.strokeRect(X(camX), MINI.y * tile, VIEW_W * k * tile, MINI.h * tile);
  };

  /** Arrows at the screen edges: how many are coming from the right, and the way back to the wall. */
  const drawEdgeMarkers = (ctx: CanvasRenderingContext2D) => {
    const w = VIEW_W * tile;
    const y = tile * 1.35;
    const ahead = stand.enemies.filter((e) => e.x > camX + VIEW_W + 0.3).length;
    if (ahead) {
      const bob = Math.sin(clock * 6) * tile * 0.08;
      text(ctx, `${ahead} coming 👉`, w - tile * 1.6 + bob, y, tile * 0.4, '#fff');
    }
    if (camX > 1) text(ctx, '👈 🏰', tile * 0.9, y, tile * 0.4, '#fff');
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
      camX = 0;
      drag = null;
      speed = 1;
      paused = false;
      popups = [];
      rings = [];
      shake = 0;
      fallTimer = -1;
      clock = 0;
      repairWasPossible = false;
      lastHp.clear();
      hitFlash.clear();
      lastCooldown.clear();
      firePulse.clear();
      banner = { text: '🏰 Last Stand! Buy defenders, drag 👉 to look', t: -3 };
      buildUi();
      $('hud').hidden = false;
      $('panel').hidden = false;
      renderShop();
      this.onResize!();
      document.addEventListener('visibilitychange', onVisibility);
      game.canvas.addEventListener('wheel', onWheel, { passive: false });
    },
    exit() {
      document.removeEventListener('visibilitychange', onVisibility);
      game.canvas.removeEventListener('wheel', onWheel);
    },
    onResize() {
      tile = fitCanvas(game.canvas, VIEW_W, VIEW_H);
    },
    onTap(px, py) {
      const x = px / tile;
      const y = py / tile;
      // Tap the mini-map to jump there
      if (y <= MINI.y + MINI.h + 0.25 && x >= MINI.x && x <= MINI.x + MINI.w) {
        setCam(((x - MINI.x) / MINI.w) * STAND.fieldWidth - VIEW_W / 2);
        return;
      }
      drag = { px, camX, moved: false };
    },
    onPointerMove(px) {
      if (!drag) return;
      if (Math.abs(px - drag.px) > 4) drag.moved = true;
      setCam(drag.camX - (px - drag.px) / tile);
    },
    onPointerUp(px, py) {
      const d = drag;
      drag = null;
      // A plain tap on the "back to the wall" marker
      if (d && !d.moved && camX > 1 && px < tile * 1.8 && py < tile * 1.9) camX = 0;
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
      if (banner && (banner.t += dt) > 2) banner = null;
      shake = Math.max(0, shake - dt * 2);
      updateUi();
    },
    draw() {
      const ctx = game.ctx;
      const era = ERAS[stand.era]!;
      const w = VIEW_W * tile;
      const h = VIEW_H * tile;
      ctx.save();
      if (shake > 0) {
        const s = shake * tile * 0.15;
        ctx.translate((Math.random() - 0.5) * s, (Math.random() - 0.5) * s);
      }
      drawBackdrop(ctx, era);
      drawWall(ctx, era);
      drawDefenders(ctx);
      drawEnemies(ctx);
      for (const s of stand.shots) {
        const shot = unitDef(s.unit).shot;
        const x = sx(s.x, s.z);
        const y = sy(s.y, s.z);
        if (shot.emoji) emoji(ctx, shot.emoji, x, y, tile * shot.size);
        else {
          ctx.fillStyle = shot.color ?? '#fff';
          ctx.beginPath();
          ctx.arc(x, y, tile * shot.size * 0.6, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      for (const r of rings) {
        ctx.strokeStyle = `rgba(255,190,80,${1 - r.t / 0.3})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        const rad = r.r * tile * (0.4 + r.t * 2);
        ctx.ellipse(sx(r.x, r.z), sy(r.y, r.z), rad, rad * 0.4, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      for (const p of popups) {
        ctx.globalAlpha = 1 - p.t;
        text(ctx, p.text, sx(p.x, p.z), sy(p.y - p.t * 0.6, p.z), tile * p.size, p.color);
      }
      ctx.globalAlpha = 1;
      ctx.restore();

      drawMiniMap(ctx);
      drawEdgeMarkers(ctx);
      if (banner && banner.t >= 0) {
        ctx.globalAlpha = Math.max(0, Math.min(1, banner.t * 4, (2 - banner.t) * 3));
        text(ctx, banner.text, w / 2, h * 0.22, tile * 0.42, '#fff');
        ctx.globalAlpha = 1;
      } else if (banner) {
        text(ctx, banner.text, w / 2, h * 0.22, tile * 0.38, '#fff');
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
