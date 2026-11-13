// Run results, shown after the Last Stand (Phase 2) ends. Phase 2 (the side-view Last Stand) will start from here in
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
    const stand = summary.stand;
    const secs = Math.round(summary.time + (stand?.time ?? 0));
    const time = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;
    const shop = canBuySomething();
    showOverlay(
      el(
        'div',
        { class: 'card' },
        el('h2', {}, stand ? '🏰 The wall fell!' : '🚨 They got through!'),
        summary.newBest
          ? el('p', { style: 'color:var(--gold);font-weight:800' }, '🏆 New best!')
          : '',
        el('div', { class: 'relics big-relics' }, `+${summary.relics} 🦴 Relics`),
        el(
          'div',
          { class: 'stats' },
          stat(`🌊 ${summary.wave}`, 'Got through on wave'),
          stat(`🏰 ${stand?.held ?? 0}`, 'Waves held at the wall'),
          stat(`👊 ${summary.kills + (stand?.kills ?? 0)}`, 'Enemies stopped'),
          stat(`${era.base} ${time}`, `${era.name} run`),
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
