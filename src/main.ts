// Boot: sets up the canvas, the game loop and scene switching.
import './styles.css';
import type { Game, Scene, SceneName } from './game';
import { loadMeta } from './save';
import { createBreachScene } from './scenes/breach';
import { createLastStandScene } from './scenes/lastStand';
import { createMenuScene } from './scenes/menu';
import { createOuterDefenseScene } from './scenes/outerDefense';
import { createUpgradesScene } from './scenes/upgrades';
import { $ } from './ui/dom';

const canvas = $<HTMLCanvasElement>('game');
const scenes = {} as Record<SceneName, Scene>;
let current: Scene | null = null;

const game: Game = {
  canvas,
  ctx: canvas.getContext('2d')!,
  meta: loadMeta(),
  go(name, params) {
    current?.exit?.();
    current = scenes[name];
    current.enter(params);
  },
};

scenes.menu = createMenuScene(game);
scenes.outer = createOuterDefenseScene(game);
scenes.stand = createLastStandScene(game);
scenes.breach = createBreachScene(game);
scenes.upgrades = createUpgradesScene(game);

const local = (e: PointerEvent): [number, number] => {
  const rect = canvas.getBoundingClientRect();
  return [e.clientX - rect.left, e.clientY - rect.top];
};
canvas.addEventListener('pointerdown', (e) => current?.onTap?.(...local(e), e.pointerType));
// Moves and releases are watched on the whole page so a tower can be dragged from the shop.
window.addEventListener('pointermove', (e) => current?.onPointerMove?.(...local(e), e.pointerType));
window.addEventListener('pointerup', (e) =>
  current?.onPointerUp?.(...local(e), e.pointerType, false),
);
window.addEventListener('pointercancel', (e) =>
  current?.onPointerUp?.(...local(e), e.pointerType, true),
);

// The panel/HUD can change height, so watch the stage instead of just the window.
new ResizeObserver(() => current?.onResize?.()).observe($('stage'));

let last = performance.now();
function frame(now: number) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  current?.update?.(dt);
  current?.draw?.();
  requestAnimationFrame(frame);
}

// ?stand=<era> jumps straight into a Last Stand (handy for testing walls and defenders).
const standEra = new URLSearchParams(location.search).get('stand');
if (standEra !== null) {
  const era = Math.max(0, Math.min(5, Number(standEra) || 0));
  const p1 = { wave: 5 + era * 5, era, chest: 60, kills: 0, bosses: 0, held: 0, time: 0 };
  game.go('stand', { ...p1, relics: 0, newBest: false });
} else game.go('menu');
requestAnimationFrame(frame);
