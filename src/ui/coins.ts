// Coins on screen: a little colored coin for each tier, like ● 3  ● 45.
import { coinParts, coinText } from '../sim/coins';
import { el } from './dom';

export function coinsEl(amount: number, prefix = ''): HTMLSpanElement {
  const parts = coinParts(amount).map((p) =>
    el('span', { class: `coin ${p.tier}` }, el('i', {}), String(p.count)),
  );
  return el(
    'span',
    { class: 'coins', 'aria-label': `${prefix}${coinText(amount)}` },
    ...(prefix ? [prefix] : []),
    ...parts,
  );
}
