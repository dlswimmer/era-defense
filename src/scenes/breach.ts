// Shown after the outer wall falls. Phase 2 (Last Stand) will start from here in M2.
// For now it shows the run's results and lets the kids vote on what Phase 2 should look like.
import type { Game, RunSummary, Scene } from '../game';
import { saveMeta } from '../save';
import { ERAS } from '../sim/data/eras';
import { el, hideOverlay, showOverlay } from '../ui/dom';

export function createBreachScene(game: Game): Scene {
  let summary: RunSummary;

  const stat = (v: string, l: string) =>
    el('div', { class: 'stat' }, el('div', { class: 'v' }, v), el('div', { class: 'l' }, l));

  const show = () => {
    const era = ERAS[summary.era]!;
    const { votes } = game.meta;
    const vote = (key: 'topdown' | 'side') => () => {
      votes[key]++;
      saveMeta(game.meta);
      show();
    };
    showOverlay(
      el(
        'div',
        { class: 'card' },
        el('h2', {}, '💥 The wall fell!'),
        summary.newBest
          ? el('p', { style: 'color:var(--gold);font-weight:800' }, '🏆 New best!')
          : '',
        el(
          'div',
          { class: 'stats' },
          stat(`🌊 ${summary.wave}`, 'Waves held'),
          stat(`${era.base} ${era.name}`, 'Era reached'),
          stat(`👊 ${summary.kills}`, 'Enemies stopped'),
          stat(`⚔️ ${summary.chest}`, 'War Chest'),
        ),
        el(
          'p',
          {},
          'Next up: the Last Stand! You will spend your War Chest to defend the base. Which should it be?',
        ),
        el(
          'div',
          { class: 'vote' },
          el(
            'button',
            { class: 'btn', onclick: vote('topdown') },
            el('span', { class: 'em' }, '🗺️'),
            'Top-down: build walls & traps',
            el('span', { class: 'n' }, `${votes.topdown} votes`),
          ),
          el(
            'button',
            { class: 'btn', onclick: vote('side') },
            el('span', { class: 'em' }, '🏹'),
            'Side view: tap to shoot',
            el('span', { class: 'n' }, `${votes.side} votes`),
          ),
        ),
        el(
          'div',
          { class: 'row', style: 'margin-top:16px' },
          el('button', { class: 'btn', onclick: () => game.go('menu') }, '🏠 Menu'),
          el('button', { class: 'btn go', onclick: () => game.go('outer') }, '🔁 Play again'),
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
