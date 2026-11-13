import type { Meta } from './save';

export interface Scene {
  enter(params?: unknown): void;
  exit?(): void;
  update?(dt: number): void;
  draw?(): void;
  onTap?(x: number, y: number): void;
  onResize?(): void;
}

export type SceneName = 'menu' | 'outer' | 'breach';

export interface Game {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  meta: Meta;
  go(name: SceneName, params?: unknown): void;
}

/** What Phase 1 hands to the breach screen (and later to Phase 2). */
export interface RunSummary {
  wave: number;
  era: number;
  chest: number;
  kills: number;
  bosses: number;
  newBest: boolean;
}
