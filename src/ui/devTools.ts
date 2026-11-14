// 🛠️ Dev mode, for testing: get coins, skip eras, lots of gold in runs, reset the save.
// Unlocked by tapping the build info in Options 5 times, so kids don't stumble on it.
import type { Game } from '../game';
import { ERAS } from '../sim/data/eras';
import { currentEra, devSkipEra, ownedSet } from '../sim/web';
import { resetMeta, saveMeta } from '../save';
import { coinsEl } from './coins';
import { el } from './dom';

const GOLD_COIN = 10_000; // copper
const PLATINUM_COIN = 1_000_000;

/** Fills `box` with the dev tools (or nothing when dev mode is off). */
export function renderDevTools(game: Game, box: HTMLElement) {
  if (!game.meta.dev) {
    box.replaceChildren();
    return;
  }
  const status = el('p', { class: 'update-status' });
  const rerender = (msg: string) => {
    saveMeta(game.meta);
    renderDevTools(game, box);
    box.querySelector('.update-status')!.textContent = msg;
  };
  const addCoins = (amount: number, label: string) => () => {
    game.meta.coins += amount;
    rerender(`Added ${label}!`);
  };

  const era = currentEra(ownedSet(game.meta.web));
  const next = ERAS[era + 1];
  const btn = (cls: string, label: string, onclick: () => void, disabled = false) =>
    el('button', { class: `btn ${cls}`, onclick, disabled }, label);

  box.replaceChildren(
    el('h2', { class: 'notes-title' }, '🛠️ Dev mode'),
    el('p', {}, `${ERAS[era]!.base} ${ERAS[era]!.name} · `, coinsEl(game.meta.coins)),
    el(
      'div',
      { class: 'dev-grid' },
      btn('', '💰 +10 gold', addCoins(10 * GOLD_COIN, '10 gold coins')),
      btn('', '💎 +10 platinum', addCoins(10 * PLATINUM_COIN, '10 platinum coins')),
      btn(
        'evolve',
        next ? `⏭️ Skip to ${next.name}` : '⏭️ Last era',
        () => {
          const now = devSkipEra(game.meta.web);
          if (now !== null) rerender(`Welcome to the ${ERAS[now]!.name}!`);
        },
        !next,
      ),
      btn(
        game.meta.devGold ? 'go' : '',
        `🪙 Gold in runs: ${game.meta.devGold ? 'ON' : 'OFF'}`,
        () => {
          game.meta.devGold = !game.meta.devGold;
          rerender(game.meta.devGold ? 'Runs start with lots of gold.' : 'Runs start normally.');
        },
      ),
      btn('danger', '🗑️ Reset progress', () => {
        if (!confirm('Start over from the Stone Age? Coins, upgrades and best scores are wiped.')) {
          return;
        }
        game.meta = resetMeta(game.meta);
        rerender('Progress reset. Back to the Stone Age!');
      }),
      btn('', '🙈 Hide dev mode', () => {
        game.meta.dev = false;
        game.meta.devGold = false;
        saveMeta(game.meta);
        renderDevTools(game, box);
      }),
    ),
    status,
  );
}

/** Counts taps on the build info; the 5th in a row (within ~2s each) turns dev mode on. */
export function devUnlockTapper(game: Game, box: HTMLElement): () => void {
  let taps = 0;
  let last = 0;
  return () => {
    const now = Date.now();
    taps = now - last < 2000 ? taps + 1 : 1;
    last = now;
    if (taps >= 5 && !game.meta.dev) {
      game.meta.dev = true;
      saveMeta(game.meta);
      renderDevTools(game, box);
      box.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };
}
