// The 💡 Idea Box: kids type a game idea and their name; it's saved on this device.
// "Copy all" puts the list on the clipboard so it can be pasted into IDEAS.md.
import type { Game } from '../game';
import { saveMeta } from '../save';
import { el, hideOverlay, showOverlay } from './dom';

export function openIdeaBox(game: Game, onClose: () => void = () => {}) {
  const { meta } = game;
  const name = el('input', { placeholder: 'Your name', maxlength: 30, value: meta.lastName });
  const idea = el('textarea', {
    placeholder: 'A new tower? A crazy enemy? A power-up? Tell us!',
    maxlength: 500,
  });
  const list = el('ul', { class: 'idea-list' });
  const status = el('p');

  const renderList = () => {
    list.replaceChildren(
      ...meta.ideas
        .slice()
        .reverse()
        .map((i) => el('li', {}, el('span', { class: 'who' }, `${i.name}: `), i.text)),
    );
  };

  const close = () => {
    hideOverlay();
    onClose();
  };

  const save = () => {
    const text = idea.value.trim();
    if (!text) {
      status.textContent = 'Type your idea first!';
      return;
    }
    const who = name.value.trim() || 'Someone';
    meta.lastName = who;
    meta.ideas.push({ name: who, text, date: new Date().toISOString().slice(0, 10) });
    saveMeta(meta);
    idea.value = '';
    status.textContent = `Saved! Thanks, ${who} 🎉`;
    renderList();
  };

  const copy = async () => {
    const md = meta.ideas.map((i) => `- **${i.name}** (${i.date}): ${i.text}`).join('\n');
    try {
      await navigator.clipboard.writeText(md);
      status.textContent = 'Copied! Paste it into IDEAS.md.';
    } catch {
      status.textContent = 'Could not copy on this device.';
    }
  };

  renderList();
  showOverlay(
    el(
      'div',
      { class: 'card' },
      el('h2', {}, '💡 Idea Box'),
      el('p', {}, 'Got an idea for the game? Your name goes in the credits if we build it!'),
      el(
        'div',
        { class: 'stack' },
        name,
        idea,
        el('button', { class: 'btn go', onclick: save }, 'Save idea'),
      ),
      status,
      list,
      el(
        'div',
        { class: 'row' },
        meta.ideas.length ? el('button', { class: 'btn', onclick: copy }, '📋 Copy all') : '',
        el('button', { class: 'btn primary', onclick: close }, 'Done'),
      ),
    ),
  );
}
