import type { Game, Scene } from '../game';
import { drawMap, fitCanvas } from '../render';
import { ERAS } from '../sim/data/eras';
import { MAPS } from '../sim/data/maps';
import { prepareMap } from '../sim/path';
import { openIdeaBox } from '../ui/ideas';
import { $, el, hideOverlay, showOverlay } from '../ui/dom';

export function createMenuScene(game: Game): Scene {
  const map = prepareMap(MAPS.meadow!);
  let tile = 32;
  let eraIndex = 0;
  let eraTimer = 0;

  const show = () => {
    const { best } = game.meta;
    showOverlay(
      el(
        'div',
        { class: 'card' },
        el('div', { class: 'emoji-row' }, '🪨🏹🎯💣🚀⚡'),
        el('h1', {}, 'Era Defense'),
        el('p', {}, 'Build towers. Hold the wall. Earn Relics to evolve from rocks to lasers!'),
        best.wave
          ? el(
              'p',
              {},
              `🏆 Best: wave ${best.wave} · ${ERAS[best.era]!.base} ${ERAS[best.era]!.name}`,
            )
          : '',
        el(
          'div',
          { class: 'stack' },
          el('button', { class: 'btn go big', onclick: () => game.go('outer') }, '▶ Play'),
          el(
            'button',
            { class: 'btn primary', onclick: () => game.go('upgrades') },
            `🦴 Upgrades (${game.meta.relics})`,
          ),
          el('button', { class: 'btn', onclick: () => openIdeaBox(game, show) }, '💡 Idea Box'),
        ),
        el(
          'p',
          { style: 'font-size:13px;margin-top:16px' },
          'Tap a grass square to build. Stop enemies to earn 💰 gold. When the wall falls you get 🦴 Relics: spend them to Evolve and unlock new towers!',
        ),
      ),
    );
  };

  return {
    enter() {
      $('hud').hidden = true;
      $('panel').hidden = true;
      this.onResize!();
      show();
    },
    exit() {
      hideOverlay();
    },
    onResize() {
      tile = fitCanvas(game.canvas, map.cols, map.rows);
    },
    update(dt) {
      // Cycle the background through the eras for a bit of life.
      eraTimer += dt;
      if (eraTimer > 2.5) {
        eraTimer = 0;
        eraIndex = (eraIndex + 1) % ERAS.length;
      }
    },
    draw() {
      drawMap(game.ctx, map, ERAS[eraIndex]!, tile);
    },
  };
}
