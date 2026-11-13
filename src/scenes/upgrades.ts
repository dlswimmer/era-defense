// Spend Relics 🦴 on permanent upgrades between runs. Evolve lives here.
import type { Game, Scene } from '../game';
import { saveMeta } from '../save';
import { ERAS } from '../sim/data/eras';
import { META_UPGRADES, nextCost, type MetaUpgrade } from '../sim/data/metaUpgrades';
import { TOWER_IDS, towerDef } from '../sim/data/towers';
import { el, hideOverlay, showOverlay } from '../ui/dom';

export function createUpgradesScene(game: Game): Scene {
  let flash = '';

  const buy = (up: MetaUpgrade) => () => {
    const { meta } = game;
    const level = meta.upgrades[up.id] ?? 0;
    const cost = nextCost(up, level);
    if (cost === null || meta.relics < cost) return;
    meta.relics -= cost;
    meta.upgrades[up.id] = level + 1;
    saveMeta(meta);
    flash =
      up.id === 'era' ? `${ERAS[level + 1]!.base} Welcome to the ${ERAS[level + 1]!.name}!` : '';
    show();
  };

  const row = (up: MetaUpgrade) => {
    const level = game.meta.upgrades[up.id] ?? 0;
    const cost = nextCost(up, level);
    let extra = '';
    if (up.id === 'era' && cost !== null) {
      const towers = TOWER_IDS.filter((id) => towerDef(id).era === level + 1).map(
        (id) => `${towerDef(id).emoji} ${towerDef(id).name}`,
      );
      extra = `Unlocks ${towers.join(' and ')}`;
    }
    const btn = el(
      'button',
      { class: 'btn primary', onclick: buy(up) },
      cost === null ? '⭐ Max' : `🦴 ${cost}`,
    );
    btn.disabled = cost === null || game.meta.relics < cost;
    const pips =
      up.id === 'era' ? '' : ` ${'●'.repeat(level)}${'○'.repeat(up.costs.length - level)}`;
    return el(
      'div',
      { class: `upgrade${up.id === 'era' ? ' era' : ''}` },
      el('div', { class: 'em' }, up.id === 'era' ? ERAS[level]!.base : up.emoji),
      el(
        'div',
        { class: 'txt' },
        el('b', {}, `${up.name}${pips}`),
        el('div', {}, up.describe(level)),
        extra ? el('div', { class: 'extra' }, extra) : '',
      ),
      btn,
    );
  };

  const show = () => {
    showOverlay(
      el(
        'div',
        { class: 'card' },
        el('h2', {}, '🦴 Upgrades'),
        el('div', { class: 'relics' }, `🦴 ${game.meta.relics} Relics`),
        flash ? el('p', { class: 'flash' }, flash) : '',
        el('div', { class: 'upgrades' }, ...META_UPGRADES.map(row)),
        el(
          'p',
          { style: 'font-size:13px' },
          'Earn Relics every run: 1 for each wave you reach and 2 for each boss you stop.',
        ),
        el(
          'div',
          { class: 'row', style: 'margin-top:12px' },
          el('button', { class: 'btn', onclick: () => game.go('menu') }, '🏠 Menu'),
          el('button', { class: 'btn go', onclick: () => game.go('outer') }, '▶ Play'),
        ),
      ),
    );
  };

  return {
    enter() {
      flash = '';
      show();
    },
    exit() {
      hideOverlay();
    },
  };
}
