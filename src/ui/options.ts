// ⚙️ Options: build info (so it's easy to tell the live game updated) and patch notes.
import { CHANGELOG } from '../changelog';
import type { Game } from '../game';
import { saveMeta } from '../save';
import { el, hideOverlay, showOverlay } from './dom';

const REPO = 'https://github.com/dlswimmer/era-defense';

export const LATEST_UPDATE = CHANGELOG[0]?.id ?? 0;

/** True when there's a patch note the player hasn't opened Options to see yet. */
export function hasNewUpdate(game: Game): boolean {
  return game.meta.seenUpdate < LATEST_UPDATE;
}

/** e.g. "Update 14 · Nov 14, 3:25 PM" for the corner of the menu. */
export function buildLabel(): string {
  return `Update ${LATEST_UPDATE} · ${formatDate(__BUILD_DATE__)}`;
}

function formatDate(iso: string, withTime = true): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: withTime ? 'numeric' : undefined,
    ...(withTime ? { hour: 'numeric', minute: '2-digit' } : {}),
  });
}

export function openOptions(game: Game, onClose: () => void = () => {}) {
  const unseen = game.meta.seenUpdate;
  game.meta.seenUpdate = LATEST_UPDATE;
  saveMeta(game.meta);

  const commit = __BUILD_COMMIT__;
  const commitNode =
    commit === 'dev'
      ? el('span', {}, commit)
      : el('a', { href: `${REPO}/commit/${commit}`, target: '_blank', rel: 'noopener' }, commit);

  const info = el(
    'dl',
    { class: 'build-info' },
    el('dt', {}, 'Version'),
    el('dd', {}, `${__APP_VERSION__} (update ${LATEST_UPDATE})`),
    el('dt', {}, 'Built'),
    el('dd', {}, formatDate(__BUILD_DATE__)),
    el('dt', {}, 'Build'),
    el('dd', {}, commitNode),
  );

  const notes = el(
    'div',
    { class: 'patch-notes' },
    ...CHANGELOG.map((u) =>
      el(
        'section',
        { class: u.id > unseen ? 'update new' : 'update' },
        el('h3', {}, u.title, u.id > unseen ? el('span', { class: 'new-tag' }, 'NEW') : ''),
        el('div', { class: 'when' }, `Update ${u.id} · ${formatDate(u.date + 'T12:00', false)}`),
        el('ul', {}, ...u.notes.map((n) => el('li', {}, n))),
      ),
    ),
  );

  const close = () => {
    hideOverlay();
    onClose();
  };

  showOverlay(
    el(
      'div',
      { class: 'card options' },
      el('h2', {}, '⚙️ Options'),
      info,
      el('h2', { class: 'notes-title' }, '📜 Patch notes'),
      notes,
      el('div', { class: 'row' }, el('button', { class: 'btn primary', onclick: close }, 'Done')),
    ),
  );
}
