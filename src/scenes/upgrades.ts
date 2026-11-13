// The upgrade web: spend coins between runs. Drag to look around, pinch (or scroll) to zoom,
// tap a circle to see it in the panel below and buy it. Rules live in src/sim/web.ts.
import type { Game, Scene } from '../game';
import { saveMeta } from '../save';
import { coinParts } from '../sim/coins';
import { ERAS } from '../sim/data/eras';
import { campEffect, WEB } from '../sim/data/web';
import {
  HOME,
  WEB_NODES,
  buyNode,
  currentEra,
  eraNodeId,
  gateProgress,
  nodeState,
  ownedSet,
  webNode,
  type NodeState,
  type WebNode,
} from '../sim/web';
import { coinsEl } from '../ui/coins';
import { $, el } from '../ui/dom';

const EMOJI_FONT = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
/** Finger travel (CSS px) before a press counts as a drag rather than a tap. */
const TAP_SLOP = 10;
/** Circles are never smaller than this on screen (CSS px radius) when tapping. */
const MIN_TAP_R = 22;

const LOOK: Record<Exclude<NodeState, 'hidden'>, { fill: string; rim: string }> = {
  owned: { fill: '#6b5414', rim: '#ffd34d' },
  open: { fill: '#24502a', rim: '#5fd068' },
  dear: { fill: '#3d2f1d', rim: '#c98a3c' },
  gated: { fill: '#2a2533', rim: '#9a86c9' },
  locked: { fill: '#1c2735', rim: '#3a5068' },
  empty: { fill: '#1c2735', rim: '#3a5068' },
};

/** The short name of a node (upgrade names drop their tower's name). */
const shortName = (n: WebNode) => (n.kind === 'step' ? n.name.split(': ')[1]! : n.name);

export function createUpgradesScene(game: Game): Scene {
  let w = 0;
  let h = 0;
  const cam = { x: 0, y: -400, z: 0.8 };
  let selected: string | null = null;
  let toast = '';
  let clock = 0;
  let owned = new Set<string>();
  /** Until the player moves the view, keep it fitted to their era (the panel can resize it). */
  let autoFit = true;

  const refreshOwned = () => (owned = ownedSet(game.meta.web));
  const stateOf = (n: WebNode) => nodeState(n, owned, game.meta.coins);

  // ---------- Camera ----------
  const toScreen = (x: number, y: number): [number, number] => [
    (x - cam.x) * cam.z + w / 2,
    (y - cam.y) * cam.z + h / 2,
  ];
  const toWorld = (sx: number, sy: number): [number, number] => [
    (sx - w / 2) / cam.z + cam.x,
    (sy - h / 2) / cam.z + cam.y,
  ];
  const fitBox = (minX: number, minY: number, maxX: number, maxY: number) => {
    cam.x = (minX + maxX) / 2;
    cam.y = (minY + maxY) / 2;
    cam.z = Math.min(w / (maxX - minX), h / (maxY - minY));
  };
  /** Shows the inner part of your era's slice (and home): what you're working on now. */
  const fitEra = () => {
    const era = currentEra(owned);
    const ns = WEB_NODES.filter(
      (n) => n.id === HOME || (n.era === era && !n.empty && Math.hypot(n.x, n.y) < 760),
    );
    const xs = ns.map((n) => n.x);
    const ys = ns.map((n) => n.y);
    fitBox(Math.min(...xs) - 40, Math.min(...ys) - 50, Math.max(...xs) + 40, Math.max(...ys) + 50);
  };
  const extent = Math.max(...WEB_NODES.map((n) => Math.hypot(n.x, n.y) + n.r)) + 30;
  const fitAll = () => fitBox(-extent, -extent, extent, extent);
  const zoomAt = (f: number, sx: number, sy: number) => {
    const [wx, wy] = toWorld(sx, sy);
    const minZ = (Math.min(w, h) / (extent * 2)) * 0.8;
    autoFit = false;
    cam.z = Math.min(3, Math.max(minZ, cam.z * f));
    const [wx2, wy2] = toWorld(sx, sy);
    cam.x += wx - wx2;
    cam.y += wy - wy2;
  };

  // ---------- Input (own listeners: pinch needs every finger) ----------
  const pointers = new Map<number, [number, number]>();
  let moved = 0;
  let pinchDist = 0;
  const local = (e: PointerEvent | WheelEvent): [number, number] => {
    const rect = game.canvas.getBoundingClientRect();
    return [e.clientX - rect.left, e.clientY - rect.top];
  };
  const onDown = (e: PointerEvent) => {
    game.canvas.setPointerCapture?.(e.pointerId);
    pointers.set(e.pointerId, local(e));
    if (pointers.size === 1) moved = 0;
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()] as [[number, number], [number, number]];
      pinchDist = Math.hypot(a[0] - b[0], a[1] - b[1]);
      moved = Infinity;
    }
  };
  const onMove = (e: PointerEvent) => {
    const prev = pointers.get(e.pointerId);
    if (!prev) return;
    const now = local(e);
    pointers.set(e.pointerId, now);
    if (pointers.size === 1) {
      moved += Math.hypot(now[0] - prev[0], now[1] - prev[1]);
      if (moved > TAP_SLOP) {
        autoFit = false;
        cam.x -= (now[0] - prev[0]) / cam.z;
        cam.y -= (now[1] - prev[1]) / cam.z;
      }
    } else if (pointers.size === 2) {
      const [a, b] = [...pointers.values()] as [[number, number], [number, number]];
      const d = Math.hypot(a[0] - b[0], a[1] - b[1]);
      if (pinchDist > 0) zoomAt(d / pinchDist, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2);
      pinchDist = d;
    }
  };
  const onUp = (e: PointerEvent) => {
    const p = pointers.get(e.pointerId);
    if (!p) return;
    pointers.delete(e.pointerId);
    if (e.type === 'pointerup' && pointers.size === 0 && moved <= TAP_SLOP) tap(p[0], p[1]);
  };
  const onWheel = (e: WheelEvent) => {
    e.preventDefault();
    const [x, y] = local(e);
    zoomAt(Math.exp(-e.deltaY * 0.0015), x, y);
  };
  const listen = (on: boolean) => {
    const c = game.canvas;
    const f = on ? c.addEventListener.bind(c) : c.removeEventListener.bind(c);
    f('pointerdown', onDown as EventListener);
    f('pointermove', onMove as EventListener);
    f('pointerup', onUp as EventListener);
    f('pointercancel', onUp as EventListener);
    f('wheel', onWheel as EventListener, { passive: false } as AddEventListenerOptions);
  };

  const tap = (sx: number, sy: number) => {
    let best: WebNode | null = null;
    let bestD = Infinity;
    for (const n of WEB_NODES) {
      if (stateOf(n) === 'hidden') continue;
      const [x, y] = toScreen(n.x, n.y);
      const d = Math.hypot(x - sx, y - sy);
      if (d < Math.max(n.r * cam.z, MIN_TAP_R) && d < bestD) {
        best = n;
        bestD = d;
      }
    }
    selected = best && best.id !== selected ? best.id : null;
    toast = '';
    renderPanel();
  };

  // ---------- HUD and panel ----------
  const fitButtons = [
    el(
      'button',
      { class: 'btn hud-btn', onclick: () => fitEra(), 'aria-label': 'Show my era' },
      '🔍',
    ),
    el(
      'button',
      { class: 'btn hud-btn', onclick: () => fitAll(), 'aria-label': 'Show the whole web' },
      '🕸️',
    ),
  ];
  const renderHud = () => {
    const era = currentEra(owned);
    const next = era + 1 < ERAS.length;
    const { done, total } = gateProgress(owned, era);
    $('hud').replaceChildren(
      el(
        'div',
        { class: 'hud-row' },
        el('span', { class: 'hud-chip coins-chip' }, coinsEl(game.meta.coins)),
        el(
          'span',
          { class: 'hud-chip era' },
          `${ERAS[era]!.base} ${ERAS[era]!.name}${next ? ` · ${done}/${total}` : ''}`,
        ),
        ...fitButtons,
      ),
    );
  };

  const describe = (n: WebNode): string => {
    const era = currentEra(owned);
    switch (n.kind) {
      case 'home':
        return 'Your home. The eras circle around it, Stone Age first. Get everything in your era to Evolve to the next one!';
      case 'era':
        if (!owned.has(n.id))
          return `Evolve! Runs start in the ${n.name} era, with its first tower and defender.`;
        return n.era === era
          ? `You're here! Runs start in the ${n.name}.`
          : `Its towers and defenders still come with you.`;
      case 'tower':
        if (n.empty) return 'A new tower the kids will pick. Send one in with the 💡 Idea Box!';
        return owned.has(n.id) ? 'Build it in Phase 1.' : `Unlock the ${n.name} for Phase 1.`;
      case 'unit':
        if (n.empty)
          return 'A new wall defender the kids will pick. Send one in with the 💡 Idea Box!';
        return owned.has(n.id)
          ? 'Hire it on the wall in the Last Stand.'
          : `Unlock the ${n.name} for the Last Stand wall.`;
      case 'step': {
        const fx = n.step!.effect;
        const who = webNode(`${n.step!.side}:${n.step!.owner}`)!.name;
        if (fx.mastery) {
          return n.step!.side === 'tower'
            ? `Every ${who} starts at level 2.`
            : `A free ${who} on the wall at the start of every Last Stand.`;
        }
        const pct = (v: number) => `+${Math.round(v * 100)}%`;
        if (fx.dmg) return `${pct(fx.dmg)} damage for every ${who}.`;
        if (fx.rate) return `${pct(fx.rate)} attack speed for every ${who}.`;
        return `${pct(fx.range ?? 0)} range for every ${who}.`;
      }
      case 'camp':
        switch (n.camp) {
          case 'treasure':
            return `+${Math.round(ERAS[n.era]!.startGold * campEffect.treasure)} gold at the start of every run.`;
          case 'arms':
            return `+${campEffect.arms * 100}% damage for every tower and defender.`;
          case 'lucky':
            return `+${campEffect.lucky * 100}% coins from every run.`;
          default:
            return `+${campEffect.wall * 100}% wall in the Last Stand.`;
        }
    }
  };

  const need = (n: WebNode, st: NodeState): string => {
    if (st === 'locked') return `First get ${shortName(webNode(n.parent!)!)}.`;
    if (st === 'dear') return 'Not enough coins yet. Play another run!';
    if (st === 'gated') {
      const prev = n.era - 1;
      const { done, total } = gateProgress(owned, prev);
      const ups = WEB.gateUpgrades[prev] ?? 2;
      return `First unlock every ${ERAS[prev]!.name} tower and defender and give each ${ups} upgrades (${done} of ${total}).`;
    }
    return '';
  };

  const panelInfo = el('div', {});
  const toastEl = el('div', { class: 'web-toast', role: 'status' });
  const renderPanel = () => {
    renderHud();
    toastEl.textContent = toast;
    const n = selected ? webNode(selected) : undefined;
    if (!n) {
      panelInfo.replaceChildren(
        el(
          'div',
          { class: 'web-hint' },
          'Tap a circle to see it. Glowing green ones you can buy now!',
        ),
      );
      return;
    }
    const st = stateOf(n);
    let btn: HTMLButtonElement;
    if (st === 'owned') btn = el('button', { class: 'btn', disabled: true }, '✔ Got it');
    else if (st === 'empty') btn = el('button', { class: 'btn', disabled: true }, 'Soon');
    else {
      btn = el('button', { class: 'btn go', onclick: () => buy(n) }, coinsEl(n.cost));
      btn.disabled = st !== 'open';
    }
    const why = need(n, st);
    panelInfo.replaceChildren(
      el(
        'div',
        { class: 'web-info' },
        el('div', { class: 'em' }, n.emoji),
        el(
          'div',
          { class: 'txt' },
          el('b', {}, n.kind === 'step' ? n.name.replace(': ', ' · ') : n.name),
          el('div', {}, describe(n)),
          why ? el('div', { class: 'need' }, why) : '',
          n.by ? el('div', { class: 'credit' }, `Idea by ${n.by}`) : '',
        ),
        n.kind === 'home' ? '' : btn,
      ),
    );
  };

  const buy = (n: WebNode) => {
    const left = buyNode(game.meta.web, game.meta.coins, n.id);
    if (left === null) return;
    game.meta.coins = left;
    saveMeta(game.meta);
    refreshOwned();
    if (n.kind === 'era') {
      toast = `${n.emoji} Welcome to the ${n.name}! New tower and defender unlocked.`;
      fitEra();
    } else toast = `${n.emoji} Got ${shortName(n)}!`;
    renderPanel();
  };

  const buildPanel = () => {
    $('panel').replaceChildren(
      panelInfo,
      toastEl,
      el(
        'div',
        { class: 'controls' },
        el('button', { class: 'btn', onclick: () => game.go('menu') }, '🏠 Menu'),
        el('button', { class: 'btn go wave', onclick: () => game.go('outer') }, '▶ Play'),
      ),
    );
  };

  // ---------- Drawing ----------
  const drawCoins = (
    ctx: CanvasRenderingContext2D,
    amount: number,
    x: number,
    y: number,
    size: number,
  ) => {
    const parts = coinParts(amount);
    ctx.font = `800 ${size}px system-ui, sans-serif`;
    const widths = parts.map((p) => ctx.measureText(String(p.count)).width + size * 0.95);
    const total = widths.reduce((a, b) => a + b, 0) + (parts.length - 1) * size * 0.35;
    let cx = x - total / 2;
    ctx.fillStyle = 'rgba(10,16,24,.85)';
    ctx.beginPath();
    ctx.roundRect(cx - 5, y - size * 0.75, total + 10, size * 1.5, size * 0.75);
    ctx.fill();
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    parts.forEach((p, i) => {
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(cx + size * 0.38, y, size * 0.38, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#f4f1e8';
      ctx.fillText(String(p.count), cx + size * 0.85, y + 1);
      cx += widths[i]! + size * 0.35;
    });
  };

  const draw = () => {
    const ctx = game.ctx;
    const z = cam.z;
    const era = currentEra(owned);
    ctx.clearRect(0, 0, w, h);
    const bg = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h));
    bg.addColorStop(0, '#1f3146');
    bg.addColorStop(1, '#101923');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    // Era slices.
    const [hx, hy] = toScreen(0, 0);
    ERAS.forEach((_, e) => {
      const a = -Math.PI / 2 + (e * Math.PI * 2) / ERAS.length;
      const half = Math.PI / ERAS.length;
      ctx.beginPath();
      ctx.moveTo(hx, hy);
      ctx.arc(hx, hy, extent * z, a - half, a + half);
      ctx.closePath();
      if (owned.has(eraNodeId(e))) {
        ctx.fillStyle = e === era ? 'rgba(255,211,77,.07)' : 'rgba(255,255,255,.03)';
        ctx.fill();
      }
      ctx.strokeStyle = 'rgba(169,184,200,.1)';
      ctx.lineWidth = 1;
      ctx.stroke();
    });

    // Lines between nodes.
    for (const n of WEB_NODES) {
      if (!n.parent) continue;
      const p = webNode(n.parent)!;
      const st = stateOf(n);
      ctx.lineWidth = Math.max(1.5, (n.kind === 'era' ? 6 : 4) * z);
      ctx.strokeStyle =
        st === 'owned'
          ? '#ffd34d'
          : st === 'hidden' || st === 'empty'
            ? 'rgba(90,112,138,.25)'
            : st === 'open'
              ? 'rgba(95,208,104,.75)'
              : 'rgba(90,112,138,.6)';
      ctx.setLineDash(st === 'hidden' || st === 'empty' ? [3, 5] : []);
      ctx.beginPath();
      if (n.kind === 'era' && p.kind === 'era') {
        // Eras follow the ring.
        const r = Math.hypot(n.x, n.y) * z;
        const a0 = Math.atan2(p.y, p.x);
        let a1 = Math.atan2(n.y, n.x);
        if (a1 < a0) a1 += Math.PI * 2;
        ctx.arc(hx, hy, r, a0, a1);
      } else {
        ctx.moveTo(...toScreen(p.x, p.y));
        ctx.lineTo(...toScreen(n.x, n.y));
      }
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // Circles.
    const pulse = 0.5 + 0.5 * Math.sin(clock * 4);
    for (const n of WEB_NODES) {
      const st = stateOf(n);
      const [sx, sy] = toScreen(n.x, n.y);
      if (sx < -90 || sy < -90 || sx > w + 90 || sy > h + 90) continue;
      if (st === 'hidden') {
        ctx.fillStyle = 'rgba(90,112,138,.35)';
        ctx.beginPath();
        ctx.arc(sx, sy, Math.max(2, n.r * z * 0.5), 0, Math.PI * 2);
        ctx.fill();
        continue;
      }
      const r = Math.max(n.r * z, 8);
      const look = n.kind === 'home' ? LOOK.owned : LOOK[st];
      if (st === 'open') {
        ctx.shadowColor = '#5fd068';
        ctx.shadowBlur = 8 + 10 * pulse;
      }
      ctx.fillStyle = look.fill;
      ctx.beginPath();
      ctx.arc(sx, sy, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.lineWidth = Math.max(2, r * 0.16);
      ctx.strokeStyle = look.rim;
      ctx.stroke();
      if (selected === n.id) {
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#fff';
        ctx.beginPath();
        ctx.arc(sx, sy, r + 6, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.globalAlpha = st === 'locked' || st === 'empty' ? 0.45 : 1;
      ctx.font = `${Math.round(r * 1.05)}px ${EMOJI_FONT}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#000';
      ctx.fillText(n.emoji, sx, sy + r * 0.06);
      ctx.globalAlpha = 1;

      // Names: eras and home always, towers and defenders when near, upgrades when close.
      const big = n.kind === 'era' || n.kind === 'home';
      const named =
        !n.empty && (big || ((n.kind === 'tower' || n.kind === 'unit') && z > 0.7) || z > 1.2);
      if (named) {
        const fs = big ? Math.max(12, 15 * z) : Math.max(10, 11 * z);
        ctx.font = `800 ${fs}px system-ui, sans-serif`;
        ctx.lineWidth = 3;
        ctx.lineJoin = 'round';
        ctx.strokeStyle = 'rgba(10,16,24,.9)';
        ctx.fillStyle = st === 'locked' || st === 'empty' ? '#7d8fa3' : '#f4f1e8';
        ctx.strokeText(shortName(n), sx, sy + r + fs * 0.8);
        ctx.fillText(shortName(n), sx, sy + r + fs * 0.8);
      }
      // Prices on the ones you can go for next.
      if (
        (st === 'open' || st === 'dear' || st === 'gated') &&
        n.cost > 0 &&
        (z > 0.45 || n.kind === 'era')
      ) {
        drawCoins(ctx, n.cost, sx, sy - r - Math.max(10, 11 * z), Math.max(11, 12 * z));
      }
    }
  };

  // ---------- Scene ----------
  return {
    enter() {
      refreshOwned();
      autoFit = true;
      selected = null;
      toast = '';
      pointers.clear();
      $('hud').hidden = false;
      $('panel').hidden = false;
      buildPanel();
      this.onResize!();
      fitEra();
      renderPanel();
      listen(true);
    },
    exit() {
      listen(false);
    },
    onResize() {
      const stage = game.canvas.parentElement!;
      w = stage.clientWidth;
      h = stage.clientHeight;
      const dpr = window.devicePixelRatio || 1;
      game.canvas.style.width = `${w}px`;
      game.canvas.style.height = `${h}px`;
      game.canvas.width = Math.round(w * dpr);
      game.canvas.height = Math.round(h * dpr);
      game.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (autoFit) fitEra();
    },
    update(dt) {
      clock += dt;
    },
    draw,
  };
}
