// Shown after the outer wall falls. Phase 2 (the side-view Last Stand) will start from here in
// M2. For now it shows the run's results and the Relics earned.
import type { Game, RunSummary, Scene } from '../game';
import { ERAS } from '../sim/data/eras';
import { META_UPGRADES, nextCost } from '../sim/data/metaUpgrades';
import { el, hideOverlay, showOverlay } from '../ui/dom';

export function createBreachScene(game: Game): Scene {
  let summary: RunSummary;

  const stat = (v: string, l: string) =>
    el('div', { class: 'stat' }, el('div', { class: 'v' }, v), el('div', { class: 'l' }, l));

  /** True when there is an upgrade the player can afford right now. */
  const canBuySomething = () =>
    META_UPGRADES.some((up) => {
      const cost = nextCost(up, game.meta.upgrades[up.id] ?? 0);
      return cost !== null && cost <= game.meta.relics;
    });

  const show = () => {
    const era = ERAS[summary.era]!;
    const secs = Math.round(summary.time);
    const time = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;
    const shop = canBuySomething();
    showOverlay(
      el(
        'div',
        { class: 'card' },
        el('h2', {}, '💥 The wall fell!'),
        summary.newBest
          ? el('p', { style: 'color:var(--gold);font-weight:800' }, '🏆 New best!')
          : '',
        el('div', { class: 'relics big-relics' }, `+${summary.relics} 🦴 Relics`),
        el(
          'div',
          { class: 'stats' },
          stat(`🌊 ${summary.wave}`, 'Wave reached'),
          stat(`${era.base} ${era.name}`, `held for ${time}`),
          stat(`👊 ${summary.kills}`, 'Enemies stopped'),
          stat(`⚔️ ${summary.chest}`, 'War Chest'),
        ),
        el(
          'p',
          { class: 'teaser' },
          '🏰 Coming soon: the Last Stand! A side view of your base where you spend the War Chest to hold out as long as you can.',
        ),
        el(
          'div',
          { class: 'stack' },
          el(
            'button',
            {
              class: `btn ${shop ? 'go big nudge' : 'primary'}`,
              onclick: () => game.go('upgrades'),
            },
            `🦴 Upgrades (${game.meta.relics})`,
          ),
          el(
            'div',
            { class: 'row' },
            el('button', { class: 'btn', onclick: () => game.go('menu') }, '🏠 Menu'),
            el('button', { class: 'btn go', onclick: () => game.go('outer') }, '🔁 Play again'),
          ),
        ),
      ),
    );
  };

  return {
    enter(params) {
      summary = params as RunSummary;
      show();
    },
    exit() {
      hideOverlay();
    },
  };
}
