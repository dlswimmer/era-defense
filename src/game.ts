import type { Meta } from './save';

export interface Scene {
  enter(params?: unknown): void;
  exit?(): void;
  update?(dt: number): void;
  draw?(): void;
  /** Pointer pressed on the canvas (x, y in canvas CSS pixels). */
  onTap?(x: number, y: number, pointerType: string): void;
  /** Pointer moved or released anywhere on the page, in canvas CSS pixels (may be outside it). */
  onPointerMove?(x: number, y: number, pointerType: string): void;
  onPointerUp?(x: number, y: number, pointerType: string, cancelled: boolean): void;
  onResize?(): void;
}

export type SceneName = 'menu' | 'outer' | 'stand' | 'breach' | 'upgrades';

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
  held: number;
  time: number;
  relics: number; // Phase 1 + Last Stand
  newBest: boolean;
  /** The Last Stand (Phase 2), once it has been played. */
  stand?: { held: number; wave: number; kills: number; time: number; relics: number };
}
