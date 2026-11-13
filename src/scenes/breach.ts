// Run results, shown after the Last Stand (Phase 2) ends: how it went and the coins earned.
import type { Game, RunSummary, Scene } from '../game';
import { ERAS } from '../sim/data/eras';
import { canBuyAnything } from '../sim/web';
import { coinsEl } from '../ui/coins';
import { el, hideOverlay, showOverlay } from '../ui/dom';

export function createBreachScene(game: Game): Scene {
  let summary: RunSummary;

  const stat = (v: string, l: string) =>
    el('div', { class: 'stat' }, el('div', { class: 'v' }, v), el('div', { class: 'l' }, l));

  const show = () => {
    const era = ERAS[summary.era]!;
    const stand = summary.stand;
    const secs = Math.round(summary.time + (stand?.time ?? 0));
    const time = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;
    const shop = canBuyAnything(game.meta.web, game.meta.coins);
    showOverlay(
      el(
        'div',
        { class: 'card' },
        el('h2', {}, stand ? '🏰 The wall fell!' : '🚨 They got through!'),
        summary.newBest
          ? el('p', { style: 'color:var(--gold);font-weight:800' }, '🏆 New best!')
          : '',
        el('div', { class: 'big-coins' }, coinsEl(summary.coins, '+')),
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
            '🕸️ Upgrades ',
            coinsEl(game.meta.coins),
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
