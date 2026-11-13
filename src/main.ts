// Boot: sets up the canvas, the game loop and scene switching.
import './styles.css';
import type { Game, Scene, SceneName } from './game';
import { loadMeta } from './save';
import { createBreachScene } from './scenes/breach';
import { createMenuScene } from './scenes/menu';
import { createOuterDefenseScene } from './scenes/outerDefense';
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
scenes.breach = createBreachScene(game);

canvas.addEventListener('pointerdown', (e) => {
  const rect = canvas.getBoundingClientRect();
  current?.onTap?.(e.clientX - rect.left, e.clientY - rect.top);
});

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

game.go('menu');
requestAnimationFrame(frame);
